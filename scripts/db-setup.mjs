// One-off DB setup: applies packages/api/schema.sql + seed.sql to a Supabase
// Postgres, then prints verification counts. Reads the connection string from
// db-connection.local (gitignored) or $DATABASE_URL. Never commit credentials.
//
//   node scripts/db-setup.mjs            # schema + seed + verify
//   node scripts/db-setup.mjs --seed     # seed + verify only
//   node scripts/db-setup.mjs --verify   # verify only
//
// Use the Session pooler (port 5432) or Direct connection — NOT the transaction
// pooler (6543), which won't run DDL.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// `pg` is installed globally; CommonJS require honors NODE_PATH (ESM import does
// not). Run with:  NODE_PATH="$(npm root -g)" node scripts/db-setup.mjs
const require = createRequire(import.meta.url);
const pg = require("pg");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const only = args.has("--seed") ? "seed" : args.has("--verify") ? "verify" : "all";

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  try {
    return readFileSync(join(root, "db-connection.local"), "utf8").trim();
  } catch {
    console.error(
      "No connection string. Create db-connection.local at the repo root with your\n" +
        "Supabase Session-pooler URI (Dashboard → Settings → Database → Connection string),\n" +
        "or set $DATABASE_URL.",
    );
    process.exit(1);
  }
}

const sql = (f) => readFileSync(join(root, "packages/api", f), "utf8");

async function main() {
  // Verify TLS against the public CA chain Supabase presents. If you use a
  // custom/self-signed cert, point PGSSLROOTCERT at its CA PEM.
  const ca = process.env.PGSSLROOTCERT ? readFileSync(process.env.PGSSLROOTCERT, "utf8") : undefined;
  const client = new pg.Client({
    connectionString: connectionString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  });
  await client.connect();
  try {
    if (only === "all") {
      try {
        await client.query(sql("schema.sql"));
        console.log("✓ schema.sql applied");
      } catch (e) {
        if (/already exists/i.test(e.message)) console.log("• schema already present — skipping");
        else throw e;
      }
    }
    if (only === "all" || only === "seed") {
      await client.query(sql("seed.sql"));
      console.log("✓ seed.sql applied");
    }

    // Verification — the shapes the app queries.
    const q = async (label, text) => {
      const { rows } = await client.query(text);
      console.log(`  ${label}: ${JSON.stringify(rows[0])}`);
    };
    console.log("Verification:");
    await q("published lectures", "select count(*)::int from lectures where status='published'");
    await q("series", "select count(*)::int from series");
    await q("featured series", "select count(*)::int from series where featured");
    await q("active categories", "select count(*)::int from categories where active and not archived");
    await q("published albums", "select count(*)::int from albums where published");
    await q("rls enabled tables",
      "select count(*)::int from pg_tables where schemaname='public' and rowsecurity");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("DB setup failed:", e.message);
  process.exit(1);
});
