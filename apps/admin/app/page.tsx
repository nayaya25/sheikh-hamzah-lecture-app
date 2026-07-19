"use client";

import { Console } from "@/components/Console";
import { Login } from "@/components/Login";
import { useAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase";
import { font } from "@/lib/ui";

export default function Page() {
  const { email, loading } = useAuth();

  if (!isConfigured) {
    return (
      <div style={centered}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontFamily: font.heading, fontSize: 20, fontWeight: 600 }}>Not configured</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
            Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
            <code>apps/admin/.env.local</code>, then restart the dev server.
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={centered}>Loading…</div>;

  return email ? <Console /> : <Login />;
}

const centered: React.CSSProperties = {
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--muted)",
  padding: 24,
};
