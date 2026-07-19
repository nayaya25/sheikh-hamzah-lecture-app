import { createAlthaqalaynClient, type AlthaqalaynClient } from "@althaqalayn/api";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

let client: AlthaqalaynClient | null = null;

/**
 * Shared Supabase client for the admin console. Uses the anon key + a persisted
 * session — signing in promotes the request to the `authenticated` role, which
 * RLS grants full CRUD (schema.sql). Throws if env is missing.
 */
export function getClient(): AlthaqalaynClient {
  if (!url || !key) {
    throw new Error("Supabase env missing — set NEXT_PUBLIC_SUPABASE_URL and _ANON_KEY.");
  }
  if (!client) client = createAlthaqalaynClient({ url, key });
  return client;
}
