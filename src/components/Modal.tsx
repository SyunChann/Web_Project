"use client";
import { useEffect, useRef, type KeyboardEventHandler, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({ children, onClose, labelledBy, describedBy, className, onKeyDown }: {
  children: ReactNode; onClose: () => void; labelledBy: string; describedBy?: string;
  className?: string; onKeyDown?: KeyboardEventHandler<HTMLDialogElement>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (focused?.isConnected) focused.focus({ preventScroll: true });
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(<dialog ref={ref} aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}
    onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={(event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    className={`fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl backdrop:bg-[#17202a]/60 ${className ?? ""}`}>
    {children}
  </dialog>, document.body);
}
