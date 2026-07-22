// Applies packages/api/setup.sql (schema + seed) via the Supabase Management API
// over HTTPS — used when the network blocks the Postgres wire protocol (5432/6543)
// but 443 is open. Reads a Personal Access Token from pat.local (gitignored) or
// $SUPABASE_ACCESS_TOKEN, and the project ref from apps/mobile/.env or --ref=.
//
//   node scripts/db-setup-http.mjs
//
// A PAT is account-scoped — treat it as a secret. Delete pat.local when done.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return readFileSync(join(root, "pat.local"), "utf8").trim();
  } catch {
    console.error("No token. Put a Supabase Personal Access Token in pat.local (repo root).");
    process.exit(1);
  }
}

function projectRef() {
  const arg = process.argv.find((a) => a.startsWith("--ref="));
  if (arg) return arg.slice(6);
  try {
    const env = readFileSync(join(root, "apps/mobile/.env"), "utf8");
    const m = env.match(/EXPO_PUBLIC_SUPABASE_URL=https:\/\/([a-z0-9]+)\.supabase\.co/i);
    if (m) return m[1];
  } catch {}
  console.error("No project ref. Pass --ref=<projectref>.");
  process.exit(1);
}

async function runSql(ref, pat, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const ref = projectRef();
  const pat = token();
  console.log(`Applying setup.sql to project ${ref} via Management API…`);
  await runSql(ref, pat, readFileSync(join(root, "packages/api/setup.sql"), "utf8"));
  console.log("✓ schema + seed applied");

  console.log("Verification:");
  const checks = {
    "published lectures": "select count(*)::int c from lectures where status='published'",
    collections: "select count(*)::int c from collections",
    "featured collections": "select count(*)::int c from collections where featured",
    "published albums": "select count(*)::int c from albums where published",
    "rls tables": "select count(*)::int c from pg_tables where schemaname='public' and rowsecurity",
  };
  for (const [label, q] of Object.entries(checks)) {
    const rows = await runSql(ref, pat, q);
    console.log(`  ${label}: ${rows?.[0]?.c}`);
  }
}

main().catch((e) => {
  console.error("HTTP setup failed:", e.message);
  process.exit(1);
});
