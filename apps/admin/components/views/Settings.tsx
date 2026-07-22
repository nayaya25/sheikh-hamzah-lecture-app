"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { admin } from "@althaqalayn/api";
import type { User } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { Toggle } from "@/components/form";
import { brand, font } from "@/lib/ui";
import { radii } from "@/lib/tokens";

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHd}>
        <div style={styles.sectionT}>{title}</div>
        {sub ? <div style={styles.sectionS}>{sub}</div> : null}
      </div>
      <div style={styles.card}>{children}</div>
    </section>
  );
}

export function Settings() {
  const { dark, toggle } = useTheme();
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
    <div style={{ maxWidth: 760 }}>
      <div style={styles.pageHd}>
        <div>
          <div style={styles.pageT}>Settings</div>
          <div style={styles.pageS}>Foundation profile, admin team, and console preferences.</div>
        </div>
      </div>

      <Section title="About the Foundation">
        <div style={styles.about}>
          <div style={styles.crest}>ﷲ</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.foundationName}>Althaqalayn Cultural Foundation</div>
            <div style={styles.foundationSub}>
              Archive of the lectures of Sheikh Hamzah Muhammad Lawal (QS) — preserved and shared for the
              community, in English and Hausa.
            </div>
          </div>
        </div>
      </Section>

      <Section title="Admin team" sub="Accounts with access to this console and their roles.">
        {error ? <div style={styles.note}>Couldn’t load accounts: {error}</div> : null}
        {!users && !error ? <div style={styles.note}>Loading…</div> : null}
        {users?.map((u, i) => (
          <div key={u.id} style={{ ...styles.userRow, borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
            <div style={styles.avatar}>{u.name.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.userName}>{u.name}</div>
              <div style={styles.userEmail}>{u.email}</div>
            </div>
            <span style={styles.roleChip}>{u.role}</span>
          </div>
        ))}
        {users?.length === 0 ? <div style={styles.note}>No admin accounts.</div> : null}
      </Section>
      <div style={styles.help}>
        To add an admin: create the user in Supabase → Authentication → Users (Auto Confirm), then insert a
        matching row into <code>admin_users</code> with their UID and role.
      </div>

      <Section title="Appearance">
        <SettingRow
          title="Dark mode"
          sub="Switch the console between the light and dark themes."
          first
          control={<Toggle on={dark} onToggle={toggle} />}
        />
      </Section>

      <Section title="Language">
        <SettingRow
          title="Content languages"
          sub="Lectures and collections are authored bilingually — English is primary, with Hausa alongside."
          first
          control={<span style={styles.langChip}>EN · HA</span>}
        />
      </Section>
    </div>
  );
}

function SettingRow({
  title,
  sub,
  control,
  first,
}: {
  title: string;
  sub: string;
  control: ReactNode;
  first?: boolean;
}) {
  return (
    <div style={{ ...styles.settingRow, borderTop: first ? "none" : "1px solid var(--line)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.settingTitle}>{title}</div>
        <div style={styles.settingSub}>{sub}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  pageHd: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22 },
  pageT: { fontFamily: font.heading, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" },
  pageS: { fontSize: 14, color: "var(--muted)", marginTop: 5 },

  section: { marginBottom: 22 },
  sectionHd: { marginBottom: 10, padding: "0 2px" },
  sectionT: { fontFamily: font.heading, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" },
  sectionS: { fontSize: 12.5, color: "var(--muted)", marginTop: 3 },
  card: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-lg)",
    padding: "4px 18px",
    boxShadow: "var(--sh-1)",
  },

  // About
  about: { display: "flex", alignItems: "center", gap: 16, padding: "16px 0" },
  crest: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    background: "var(--green-soft)",
    color: brand.greenMid,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: font.arabic,
    fontSize: 26,
    flexShrink: 0,
  },
  foundationName: { fontFamily: font.heading, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" },
  foundationSub: { fontSize: 12.5, color: "var(--muted)", marginTop: 5, lineHeight: 1.6 },

  // Admin team
  note: { padding: "16px 0", color: "var(--muted)", fontSize: 13 },
  userRow: { display: "flex", alignItems: "center", gap: 12, padding: "13px 0" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: `linear-gradient(140deg, ${brand.gold}, ${brand.goldDk})`,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 12,
    flexShrink: 0,
  },
  userName: { fontSize: 14, fontWeight: 600, color: "var(--ink)" },
  userEmail: { fontSize: 11.5, color: "var(--muted)", marginTop: 1 },
  roleChip: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: "var(--green-soft)",
    color: "var(--green-2)",
    borderRadius: 999,
    padding: "4px 11px",
    flexShrink: 0,
  },
  help: { fontSize: 12, color: "var(--muted)", lineHeight: 1.6, padding: "0 2px", margin: "-8px 0 22px" },

  // Setting rows
  settingRow: { display: "flex", alignItems: "center", gap: 16, padding: "16px 0" },
  settingTitle: { fontSize: 14, fontWeight: 600, color: "var(--ink)" },
  settingSub: { fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.55 },
  langChip: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    background: "var(--green-soft)",
    color: "var(--green-2)",
    borderRadius: 999,
    padding: "5px 12px",
  },
};
