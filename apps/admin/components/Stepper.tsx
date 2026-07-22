"use client";

import { Fragment, useState, type CSSProperties } from "react";
import { brand, font } from "@/lib/ui";
import { Icon } from "@/components/Icon";

/**
 * Numbered step indicator for modal wizards — matches the prototype's
 * `.stepper`/`.step`/`.step-line`. `current` is 1-indexed: steps before it
 * render "done" (soft-green + check, connector fills), the current step
 * renders "active" (filled green), later steps are idle.
 */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={styles.row}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <Fragment key={label}>
            <div style={styles.step}>
              <span style={{ ...styles.dot, ...(active ? styles.dotActive : done ? styles.dotDone : null) }}>
                {done ? <Icon name="check" size={13} strokeWidth={2.8} /> : n}
              </span>
              <span style={{ ...styles.label, ...(active ? styles.labelActive : done ? styles.labelDone : null) }}>
                {label}
              </span>
            </div>
            {n < steps.length ? <div style={{ ...styles.line, ...(done ? styles.lineDone : null) }} /> : null}
          </Fragment>
        );
      })}
    </div>
  );
}

/**
 * The modal footer for a stepper wizard — Back (hidden on step 1) / "Step X
 * of N" / Continue, matching the prototype's `.m-foot`. On the last step the
 * primary button's label switches to `finalLabel` (default "Save") and
 * `onNext` is expected to submit instead of advancing.
 */
export function StepperFooter({
  current,
  total,
  onBack,
  onNext,
  finalLabel = "Save",
  nextDisabled,
  busy,
}: {
  current: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  finalLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
}) {
  const isFirst = current <= 1;
  const isLast = current >= total;
  return (
    <>
      <button onClick={onBack} style={{ ...styles.btnGhost, visibility: isFirst ? "hidden" : "visible" }}>
        Back
      </button>
      <span style={styles.count} className="tnum">
        Step {current} of {total}
      </span>
      <button
        onClick={onNext}
        disabled={nextDisabled || busy}
        style={{ ...styles.btnPrimary, opacity: nextDisabled || busy ? 0.6 : 1 }}
      >
        {busy ? "Saving…" : isLast ? finalLabel : "Continue"}
        <Icon name={isLast ? "check" : "arrow-right"} size={15} strokeWidth={2.3} />
      </button>
    </>
  );
}

/** Convenience step-index controller for a modal wizard: `open(<Modal .../>)`
 * callers wire this to `<Stepper current={step} .../>` + `<StepperFooter .../>`. */
export function useStepper(total: number, initial = 1) {
  const [step, setStep] = useState(initial);
  return {
    step,
    isFirst: step <= 1,
    isLast: step >= total,
    back: () => setStep((s) => Math.max(1, s - 1)),
    next: () => setStep((s) => Math.min(total, s + 1)),
    goTo: (n: number) => setStep(Math.min(total, Math.max(1, n))),
  };
}

const styles: Record<string, CSSProperties> = {
  row: { display: "flex", alignItems: "center", padding: "20px 24px 4px" },
  step: { display: "flex", alignItems: "center", gap: 9 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: "var(--r-pill)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    background: "var(--field)",
    color: "var(--faint)",
    border: "1px solid var(--line-2)",
  },
  dotActive: { background: brand.green, color: "#fff", borderColor: brand.green },
  dotDone: { background: "var(--green-soft)", color: brand.greenMid, borderColor: "transparent" },
  label: { fontSize: 12.5, fontWeight: 600, color: "var(--faint)" },
  labelActive: { color: "var(--ink)" },
  labelDone: { color: "var(--muted)" },
  line: { flex: 1, height: 2, background: "var(--line)", margin: "0 10px", borderRadius: 2 },
  lineDone: { background: brand.greenBright },

  count: { fontSize: 12.5, color: "var(--muted)", fontWeight: 600 },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 42,
    padding: "0 16px",
    borderRadius: "var(--r-md)",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: font.ui,
    background: "var(--card)",
    border: "1px solid var(--line-2)",
    color: "var(--ink)",
    cursor: "pointer",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 42,
    padding: "0 16px",
    borderRadius: "var(--r-md)",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: font.ui,
    background: brand.green,
    border: "none",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,.1) inset, 0 4px 12px rgba(11,70,52,.22)",
  },
};
