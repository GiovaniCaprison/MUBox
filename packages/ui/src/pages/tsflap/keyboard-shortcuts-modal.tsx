/**
 * KeyboardShortcutsModal — Overlay showing all available keyboard shortcuts.
 *
 * Triggered by pressing "?" or via the Help menu.  Displays shortcuts in a
 * two-column grid (Modes on the left, Actions on the right) plus a Canvas
 * section at the bottom for mouse-based interactions.
 */

import type { FunctionComponent } from "react";

import { CloseIcon } from "./icons";

interface KeyboardShortcutsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export const KeyboardShortcutsModal: FunctionComponent<KeyboardShortcutsModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md animate-[fade-in_150ms_ease-out] rounded-xl border border-zinc-300 bg-zinc-50 p-6 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Two-column shortcut grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {/* Left column: Modes */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">Modes</div>
            <ShortcutRow label="Draw" shortcut="D" />
            <ShortcutRow label="Move" shortcut="M" />
            <ShortcutRow label="Erase" shortcut="E" />
            <ShortcutRow label="Toggle Final" shortcut="F" />
            <ShortcutRow label="Toggle Initial" shortcut="I" />
          </div>

          {/* Right column: Actions */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">Actions</div>
            <ShortcutRow label="Undo" shortcut="⌘Z" />
            <ShortcutRow label="Redo" shortcut="⌘⇧Z" />
            <ShortcutRow label="Pan Camera" shortcut="Space" />
            <ShortcutRow label="Select / Highlight" shortcut="Shift" />
            <ShortcutRow label="Commands" shortcut="⌘K" />
          </div>
        </div>

        {/* Canvas interactions */}
        <div className="mt-4 border-t border-zinc-300 pt-3 dark:border-zinc-600">
          <div className="space-y-2 text-sm">
            <div className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">Canvas</div>
            <HintRow label="Create node" hint="Click empty space (Draw mode)" />
            <HintRow label="Create edge" hint="Drag node → node (Draw mode)" />
            <HintRow label="Context menu" hint="Right-click" />
            <HintRow label="Select multiple" hint="Shift + drag" />
            <HintRow label="Shortcuts" hint="Press ?" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

/** A single shortcut row: label on the left, kbd badge on the right. */
const ShortcutRow: FunctionComponent<{ label: string; shortcut: string }> = ({ label, shortcut }) => (
  <div className="flex items-center justify-between">
    <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
    <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium dark:border-zinc-600 dark:bg-zinc-800">
      {shortcut}
    </kbd>
  </div>
);

/** A single hint row: label on the left, description on the right. */
const HintRow: FunctionComponent<{ label: string; hint: string }> = ({ label, hint }) => (
  <div className="flex items-center justify-between">
    <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
    <span className="text-[11px] text-zinc-600 dark:text-zinc-600">{hint}</span>
  </div>
);
