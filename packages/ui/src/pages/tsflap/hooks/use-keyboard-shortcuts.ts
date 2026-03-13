/**
 * useKeyboardShortcuts — Registers global keyboard shortcuts for the simulator.
 *
 * Currently handles:
 * - **⌘K / Ctrl+K** — Toggle the command palette
 * - **?** — Toggle the keyboard shortcuts modal (only when not typing in an input)
 *
 * Mode shortcuts (D, M, E, F, I) and undo/redo (⌘Z, ⌘⇧Z) are handled by
 * the tsflap engine's own keyboard handler on the canvas, so they are *not*
 * duplicated here.
 */

import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  /** Whether the command palette is currently open (used to avoid re-triggering). */
  readonly commandPaletteOpen: boolean;
  /** Toggle the command palette open/closed. */
  readonly setCommandPaletteOpen: (updater: (prev: boolean) => boolean) => void;
  /** Toggle the keyboard shortcuts modal open/closed. */
  readonly setShowShortcuts: (updater: (prev: boolean) => boolean) => void;
}

export function useKeyboardShortcuts({ commandPaletteOpen, setCommandPaletteOpen, setShowShortcuts }: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      /* ⌘K / Ctrl+K — toggle command palette */
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }

      /* "?" — toggle keyboard shortcuts (only when not focused on an input) */
      if (e.key === "?" && !commandPaletteOpen && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [commandPaletteOpen, setCommandPaletteOpen, setShowShortcuts]);
}
