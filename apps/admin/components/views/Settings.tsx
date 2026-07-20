"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { User } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";

export function Settings() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setUsers(await admin.listAdminUsers(getClient()));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={styles.group}>FOUNDATION</div>
      <div style={styles.card}>
        <div style={styles.profileName}>Althaqalayn Cultural Foundation</div>
        <div style={styles.profileSub}>Archive of the lectures of Sheikh Hamzah Muhammad Lawal (QS)</div>
      </div>

      <div style={styles.group}>ADMIN ACCOUNTS</div>
      <div style={styles.card}>
        {error ? <div style={styles.note}>Couldn’t load accounts: {error}</div> : null}
        {!users && !error ? <div style={styles.note}>Loading…</div> : null}
        {users?.map((u) => (
          <div key={u.id} style={styles.userRow}>
            <div style={styles.avatar}>{u.name.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.userName}>{u.name}</div>
              <div style={styles.userEmail}>{u.email}</div>
            </div>
            <span style={styles.roleChip}>{u.role}</span>
          </div>
        ))}
        {users?.length === 0 ? <div style={styles.note}>No admin accounts.</div> : null}
      </div>
      <div style={styles.help}>
        To add an admin: create the user in Supabase → Authentication → Users (Auto Confirm), then insert a
        matching row into <code>admin_users</code> with their UID and role.
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  group: { fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: "var(--faint)", margin: "0 4px 8px" },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", marginBottom: 22 },
  profileName: { fontFamily: font.heading, fontSize: 16, fontWeight: 600, padding: "16px 18px 2px" },
  profileSub: { fontSize: 12.5, color: "var(--muted)", padding: "0 18px 16px" },
  note: { padding: 18, color: "var(--muted)", fontSize: 13 },
  userRow: { display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: "1px solid var(--line)" },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: brand.gold, color: brand.green, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 },
  userName: { fontSize: 14, fontWeight: 600 },
  userEmail: { fontSize: 11.5, color: "var(--muted)" },
  roleChip: { fontSize: 10.5, fontWeight: 800, textTransform: "capitalize", background: "var(--chip)", color: brand.greenMid, borderRadius: 20, padding: "4px 11px" },
  help: { fontSize: 12, color: "var(--muted)", lineHeight: 1.6, padding: "0 4px" },
};
