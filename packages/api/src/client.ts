import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";

export type AlthaqalaynClient = SupabaseClient;

export interface ClientConfig {
  /** Supabase project URL. */
  url: string;
  /**
   * Public anon key for the app, or the same for the admin (RLS distinguishes
   * anon vs authenticated). Never ship the service-role key to a client.
   */
  key: string;
  /** Passthrough overrides — e.g. RN needs a custom `auth.storage` (AsyncStorage). */
  options?: SupabaseClientOptions<"public">;
}

/**
 * Create the shared Supabase client. Both apps call this; permissions differ by
 * whether a session is present (enforced by RLS), not by which client is built.
 */
export function createAlthaqalaynClient(config: ClientConfig): AlthaqalaynClient {
  return createClient(config.url, config.key, config.options);
}

/**
 * Throw on a Supabase error, otherwise return the data cast to T. Takes `unknown`
 * data so it works with both array selects and `.single()`/`.maybeSingle()`
 * results without fighting supabase-js's array-oriented `.returns<>()` typing.
 */
export function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
