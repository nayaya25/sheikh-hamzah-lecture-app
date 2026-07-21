"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { brand, font } from "@/lib/ui";

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action (red). */
  danger?: boolean;
}

interface AlertOptions {
  title: string;
  body?: string;
  okLabel?: string;
}

interface ConfirmValue {
  /** Themed replacement for `window.confirm`. Resolves true on confirm, false on cancel/backdrop/Escape. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** Themed replacement for `window.alert`. Resolves once acknowledged. */
  alert: (opts: AlertOptions) => Promise<void>;
}

type DialogState =
  | { kind: "confirm"; title: string; body?: string; confirmLabel: string; cancelLabel: string; danger: boolean }
  | { kind: "alert"; title: string; body?: string; okLabel: string };

const ConfirmContext = createContext<ConfirmValue | null>(null);

/** Renders children plus a single themed modal used for all confirm/alert prompts in the admin app. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        kind: "confirm",
        title: opts.title,
        body: opts.body,
        confirmLabel: opts.confirmLabel ?? "Confirm",
        cancelLabel: opts.cancelLabel ?? "Cancel",
        danger: opts.danger ?? false,
      });
    });
  }, []);

  const alertFn = useCallback((opts: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      setDialog({
        kind: "alert",
        title: opts.title,
        body: opts.body,
        okLabel: opts.okLabel ?? "OK",
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, settle]);

  return (
    <ConfirmContext.Provider value={{ confirm, alert: alertFn }}>
      {children}
      {dialog ? (
        <>
          <div style={styles.scrim} onClick={() => settle(false)} />
          <div style={styles.card} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div id="confirm-title" style={styles.title}>{dialog.title}</div>
            {dialog.body ? <div style={styles.body}>{dialog.body}</div> : null}
            <div style={styles.footer}>
              {dialog.kind === "confirm" ? (
                <>
                  <button onClick={() => settle(false)} style={styles.cancelBtn}>{dialog.cancelLabel}</button>
                  <button
                    onClick={() => settle(true)}
                    style={{ ...styles.confirmBtn, background: dialog.danger ? "#a23e3e" : brand.green }}
                  >
                    {dialog.confirmLabel}
                  </button>
                </>
              ) : (
                <button onClick={() => settle(true)} style={{ ...styles.confirmBtn, background: brand.green, flex: 1 }}>
                  {dialog.okLabel}
                </button>
              )}
            </div>
          </div>
        </>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

const styles: Record<string, CSSProperties> = {
  scrim: { position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,30,26,.4)" },
  card: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 101,
    width: "calc(100% - 40px)",
    maxWidth: 420,
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 16,
    boxShadow: "0 14px 40px rgba(0,0,0,.2)",
    padding: 24,
  },
  title: { fontFamily: font.heading, fontSize: 17, fontWeight: 600 },
  body: { fontSize: 13.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 },
  footer: { display: "flex", gap: 12, marginTop: 22 },
  cancelBtn: {
    flex: 1,
    textAlign: "center",
    border: "1.5px solid var(--line)",
    background: "transparent",
    borderRadius: 11,
    padding: 12,
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--muted)",
    cursor: "pointer",
    fontFamily: font.ui,
  },
  confirmBtn: {
    flex: 1.2,
    textAlign: "center",
    color: "#fff",
    border: "none",
    borderRadius: 11,
    padding: 12,
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: font.ui,
  },
};
