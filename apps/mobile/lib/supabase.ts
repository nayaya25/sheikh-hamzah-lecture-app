import "react-native-url-polyfill/auto";
import { createAlthaqalaynClient, type AlthaqalaynClient } from "@althaqalayn/api";

// Public app: anon key only, no session (RLS serves published content to anon).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase env is set — otherwise the app runs on sample data. */
export function isBackendConfigured(): boolean {
  return Boolean(url && key);
}

let client: AlthaqalaynClient | null = null;

/** Shared Supabase client, or null when the backend isn't configured. */
export function getClient(): AlthaqalaynClient | null {
  if (!url || !key) return null;
  if (!client) {
    client = createAlthaqalaynClient({
      url,
      key,
      options: { auth: { persistSession: false, autoRefreshToken: false } },
    });
  }
  return client;
}
