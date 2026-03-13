/**
 * ConfirmModal & AlertModal — Lightweight modal dialogs for confirmations and alerts.
 *
 * These replace `window.confirm()` and `window.alert()` with styled, accessible
 * modal overlays.  They support three semantic variants (danger / warning / info
 * for ConfirmModal; success / error / info for AlertModal) and trap focus +
 * keyboard dismissal via Escape.
 *
 * Like {@link CommandPalette}, these are design-system-agnostic to avoid
 * z-index conflicts with the simulator canvas overlay stack.
 */

import type { FunctionComponent, ReactNode } from "react";
import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   ConfirmModal
   ═══════════════════════════════════════════════════════════════════ */

export interface ConfirmModalProps {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly children?: ReactNode;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** Semantic variant controlling icon colour and confirm-button style. */
  readonly variant?: "danger" | "warning" | "info";
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export const ConfirmModal: FunctionComponent<ConfirmModalProps> = ({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  /* Auto-focus the cancel button for safety; dismiss on Escape. */
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => confirmRef.current?.focus(), 50);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      ),
      confirmBtn: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500",
    },
    warning: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      confirmBtn: "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 dark:bg-orange-600 dark:hover:bg-orange-500",
    },
    info: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
      confirmBtn: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-md animate-[fade-in_150ms_ease-out] rounded-xl border border-zinc-300 bg-white p-6 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
        <div className="flex gap-4">
          <div className="flex-shrink-0 pt-0.5">{styles.icon}</div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</p>}
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${styles.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   AlertModal — informational display replacing window.alert()
   ═══════════════════════════════════════════════════════════════════ */

export interface AlertModalProps {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly variant?: "success" | "error" | "info";
  readonly onClose: () => void;
}

export const AlertModal: FunctionComponent<AlertModalProps> = ({ open, title, description, variant = "info", onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => closeRef.current?.focus(), 50);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const icons = {
    success: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    error: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
    info: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-sm animate-[fade-in_150ms_ease-out] rounded-xl border border-zinc-300 bg-white p-6 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
        <div className="flex gap-4">
          <div className="flex-shrink-0 pt-0.5">{icons[variant]}</div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            ref={closeRef}
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
