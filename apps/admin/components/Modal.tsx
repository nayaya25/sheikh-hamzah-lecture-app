"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { font } from "@/lib/ui";
import { Icon } from "@/components/Icon";

/**
 * Modern modal shell — scrim + centered card, matching the prototype's
 * `.scrim`/`.modal`/`.m-head`/`.m-body`/`.m-foot`. Closes on Escape and on
 * scrim click, locks body scroll while open, and does a basic Tab focus
 * trap within the card. Purely presentational: callers own open/close state
 * (usually via `useModal()`) and pass it in as `onClose`.
 *
 * The `stepper` slot renders between the header and body (see Stepper.tsx);
 * `footer` renders as the `.m-foot` bar (see StepperFooter, also in
 * Stepper.tsx, or a custom footer for non-wizard modals).
 */
export function Modal({
  title,
  subtitle,
  onClose,
  width = 700,
  stepper,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Card max-width in px (the bulk-add modal in the prototype uses 560). */
  width?: number;
  stepper?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        // Skip elements that can't actually receive focus: disabled controls,
        // and anything hidden via display:none (offsetParent === null),
        // visibility:hidden/collapse, or the `hidden` attribute. Otherwise the
        // first/last wrap could land on e.g. a hidden Back button.
        const list = Array.from(focusables).filter((el) => {
          if ((el as HTMLButtonElement).disabled) return false;
          if (el.hidden) return false;
          if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return false;
          const vis = getComputedStyle(el).visibility;
          if (vis === "hidden" || vis === "collapse") return false;
          return true;
        });
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div style={styles.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={cardRef}
        style={{ ...styles.card, maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div style={styles.head}>
          <div>
            <div id="modal-title" style={styles.title}>
              {title}
            </div>
            {subtitle ? <div style={styles.subtitle}>{subtitle}</div> : null}
          </div>
          <button
            onClick={onClose}
            style={styles.close}
            aria-label="Close"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--field)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="close" size={16} strokeWidth={1.9} />
          </button>
        </div>
        {stepper}
        <div style={styles.body}>{children}</div>
        {footer ? <div style={styles.foot}>{footer}</div> : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  scrim: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "rgba(16,26,21,.5)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    animation: "fade 200ms ease both",
  },
  card: {
    width: "100%",
    maxHeight: "90vh",
    background: "var(--card)",
    borderRadius: "var(--r-xl)",
    boxShadow: "var(--sh-3)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    animation: "pop 280ms var(--ease) both",
    outline: "none",
  },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px 4px" },
  title: { fontFamily: font.heading, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" },
  subtitle: { fontSize: 13, color: "var(--muted)", marginTop: 4 },
  close: {
    width: 36,
    height: 36,
    borderRadius: "var(--r-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--muted)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 140ms",
  },
  body: { padding: "20px 28px", overflowY: "auto" },
  foot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 28px",
    borderTop: "1px solid var(--line)",
    background: "var(--field)",
  },
};
