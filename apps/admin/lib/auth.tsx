"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { admin } from "@althaqalayn/api";
import type { User } from "@althaqalayn/types";
import { getClient, isConfigured } from "@/lib/supabase";

interface AuthValue {
  /** Authenticated Supabase user email, or null when signed out. */
  email: string | null;
  /** Matching admin_users profile (name + role), null if the user isn't an admin. */
  profile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    const client = getClient();

    const sync = async () => {
      const { data } = await client.auth.getUser();
      setEmail(data.user?.email ?? null);
      setProfile(data.user ? await admin.getCurrentAdmin(client) : null);
      setLoading(false);
    };
    void sync();

    const { data: sub } = client.auth.onAuthStateChange(() => void sync());
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    email,
    profile,
    loading,
    signIn: async (e, password) => {
      await admin.signIn(getClient(), e, password);
    },
    signOut: async () => {
      await admin.signOut(getClient());
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
