import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy — Althaqalayn Lectures",
  description: "Privacy policy for the Althaqalayn Lectures app and the Althaqalayn Cultural Foundation.",
};

// Public, static page — served at /privacy on the deployed domain. Not behind
// the admin auth gate (that lives only on the console routes).
const CONTACT_EMAIL = "althaqalaynfoundation@gmail.com"; // update to the Foundation's preferred contact
const LAST_UPDATED = "20 July 2026";

export default function PrivacyPolicy() {
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Privacy Policy</h1>
        <p style={styles.meta}>Althaqalayn Lectures · Althaqalayn Cultural Foundation</p>
        <p style={styles.meta}>Last updated: {LAST_UPDATED}</p>

        <p style={styles.p}>
          This policy explains how the <strong>Althaqalayn Lectures</strong> mobile application (the “App”), published by
          the Althaqalayn Cultural Foundation (“we”, “us”), handles information. The App is a free, public archive of the
          audio, video and text lectures of the late Sheikh Hamzah Muhammad Lawal (QS).
        </p>

        <h2 style={styles.h2}>Summary</h2>
        <p style={styles.p}>
          The App does <strong>not</strong> require an account and does <strong>not</strong> collect, store, or share any
          personal information about you. It contains no advertising and no third-party analytics or tracking.
        </p>

        <h2 style={styles.h2}>Information we collect</h2>
        <p style={styles.p}>
          <strong>None that identifies you.</strong> There is no sign-up, login, or profile in the App. We do not collect
          your name, email, contacts, location, or device identifiers.
        </p>

        <h2 style={styles.h2}>Information stored on your device</h2>
        <p style={styles.p}>
          To make the App usable, a few preferences are saved locally on your device only — they are never transmitted to
          us or anyone else:
        </p>
        <ul style={styles.ul}>
          <li>Your chosen interface language (English or Hausa)</li>
          <li>Your preferred playback speed</li>
          <li>Your last position in a lecture (so you can resume)</li>
          <li>Your recent in-app searches</li>
        </ul>
        <p style={styles.p}>Clearing the app’s storage or uninstalling the App removes this data.</p>

        <h2 style={styles.h2}>Content delivery</h2>
        <p style={styles.p}>
          Lecture audio, video, images and text are delivered from our hosting provider,{" "}
          <a style={styles.a} href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase</a>. When the App
          loads content, standard technical requests (such as your IP address) are processed by the hosting/CDN provider to
          deliver the files, as with any website or streaming request. We do not use this information to identify you and we
          do not build user profiles.
        </p>

        <h2 style={styles.h2}>Permissions</h2>
        <p style={styles.p}>
          The App uses only an internet connection (to stream content) and a media-playback foreground service (so audio can
          continue when the screen is off). It does not access your microphone, camera, contacts, location, or files.
        </p>

        <h2 style={styles.h2}>Administration</h2>
        <p style={styles.p}>
          A separate, password-protected admin console is used solely by Foundation staff to manage the published content.
          It is not part of the public App and is not available to general users. Staff authentication is handled by Supabase
          Auth.
        </p>

        <h2 style={styles.h2}>Third-party services</h2>
        <ul style={styles.ul}>
          <li>Supabase — database, storage and content delivery</li>
          <li>Google Play — app distribution (subject to Google’s own policies)</li>
          <li>Expo / EAS — build and delivery tooling</li>
        </ul>

        <h2 style={styles.h2}>Children’s privacy</h2>
        <p style={styles.p}>
          The App is a general-audience religious and educational archive. Because it collects no personal information, it
          does not knowingly collect data from children.
        </p>

        <h2 style={styles.h2}>Data security</h2>
        <p style={styles.p}>
          Content is served over encrypted (HTTPS) connections. Because the App holds no personal user data, there is no
          personal information for us to lose or expose.
        </p>

        <h2 style={styles.h2}>Changes to this policy</h2>
        <p style={styles.p}>
          We may update this policy as the App evolves. Material changes will be reflected here with a new “Last updated”
          date.
        </p>

        <h2 style={styles.h2}>Contact</h2>
        <p style={styles.p}>
          Questions about this policy or the App can be sent to{" "}
          <a style={styles.a} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F6F1E7",
    color: "#17231E",
    padding: "48px 20px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    lineHeight: 1.6,
  },
  card: { maxWidth: 760, margin: "0 auto", background: "#fff", border: "1px solid #ECE4D3", borderRadius: 16, padding: "40px 36px" },
  h1: { fontSize: 30, fontWeight: 700, margin: 0, color: "#0B4634" },
  h2: { fontSize: 18, fontWeight: 600, marginTop: 28, marginBottom: 6, color: "#0B4634" },
  meta: { fontSize: 13, color: "#6A766E", margin: "2px 0" },
  p: { fontSize: 15, margin: "8px 0" },
  ul: { fontSize: 15, margin: "8px 0", paddingLeft: 22 },
  a: { color: "#12634E", textDecoration: "underline" },
};
