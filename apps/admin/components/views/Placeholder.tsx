import { font } from "@/lib/ui";
import { VIEW_TITLES, type View } from "@/lib/views";

/** Stand-in for management views not yet built (Lectures, Series, …). */
export function Placeholder({ view }: { view: View }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 48,
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: font.heading, fontSize: 18, fontWeight: 600 }}>{VIEW_TITLES[view]}</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>Coming soon</div>
    </div>
  );
}
