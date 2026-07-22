"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ModalContextValue {
  /** Mounts `node` at the modal host. Replaces any modal already open. */
  open: (node: ReactNode) => void;
  /** Unmounts whatever is currently open (no-op if nothing is open). */
  close: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/**
 * App-wide modal host. Mounted once near the shell root (see Console.tsx).
 * Deliberately un-opinionated about the modal's contents: callers pass a
 * fully-formed node (typically a `<Modal>` — see Modal.tsx) via `open()`,
 * closing it themselves by calling `close()` again (e.g. wired to the
 * `<Modal onClose={close}>` prop).
 */
export function ModalProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<ReactNode>(null);

  const open = useCallback((n: ReactNode) => setNode(n), []);
  const close = useCallback(() => setNode(null), []);

  return (
    <ModalContext.Provider value={{ open, close }}>
      {children}
      {node}
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}
