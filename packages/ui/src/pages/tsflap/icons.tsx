/**
 * Consolidated SVG icon components for the TSFlap simulator UI.
 *
 * All inline SVG icons that were previously scattered across
 * `tsflap-simulator-page.tsx`, `simulation-panel.tsx`, and other files
 * are centralised here for reuse and consistency.
 *
 * Icons are grouped by usage context:
 * - **Test result** — status indicators for quick-test rows
 * - **Transport** — media-player-style controls for step simulation
 * - **Action** — general-purpose UI actions (add, delete, etc.)
 *
 * The toolbar-specific icons (Draw, Move, Erase, layout icons, etc.)
 * remain in {@link simulator-toolbar.tsx} because they are tightly
 * coupled to the toolbar component API.
 */

import type { FunctionComponent } from "react";

/* ═══════════════════════════════════════════════════════════════════
   Test Result Icons
   ═══════════════════════════════════════════════════════════════════ */

/** Green circled checkmark — test string accepted. */
export const CheckCircleIcon: FunctionComponent = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" stroke="#16a34a" strokeWidth="1.5" />
    <path d="M4.5 7l1.5 1.5 3-3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Red circled X — test string rejected. */
export const XCircleIcon: FunctionComponent = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5" />
    <path d="M5 5l4 4M9 5l-4 4" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Orange circled exclamation — test produced an error. */
export const WarningIcon: FunctionComponent = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" stroke="#ea580c" strokeWidth="1.5" />
    <path d="M7 4v3.5M7 9.5v.01" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   Action Icons
   ═══════════════════════════════════════════════════════════════════ */

/** Small "+" for adding items. */
export const PlusIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 2v8M2 6h8" />
  </svg>
);

/** Small trash can for removing items. */
export const TrashIcon: FunctionComponent = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M2 3h8M4.5 3V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3l.5 7a1 1 0 001 1h3a1 1 0 001-1L9 3" />
  </svg>
);

/** Small "×" for closing modals / panels. */
export const CloseIcon: FunctionComponent<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   Transport / Simulation Icons
   ═══════════════════════════════════════════════════════════════════ */

/** Reset / rewind to beginning. */
export const ResetIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 1v4h4M11 11V7H7" />
    <path d="M9.5 4.5A4.5 4.5 0 0 0 2.1 2.1L1 5M2.5 7.5A4.5 4.5 0 0 0 9.9 9.9L11 7" />
  </svg>
);

/** Step one frame backward. */
export const StepBackIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 10L4 6l4-4" />
    <line x1="3" y1="2" x2="3" y2="10" />
  </svg>
);

/** Step one frame forward. */
export const StepForwardIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 2l4 4-4 4" />
    <line x1="9" y1="2" x2="9" y2="10" />
  </svg>
);

/** Fast-forward / run to end. */
export const FastForwardIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 2l4 4-4 4" />
    <path d="M7 2l4 4-4 4" />
  </svg>
);

/** Step into a sub-automaton (RSM). */
export const StepIntoIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 1v7" />
    <path d="M3 5l3 3 3-3" />
    <line x1="2" y1="11" x2="10" y2="11" />
  </svg>
);

/** Step out of a sub-automaton back to the caller (RSM). */
export const StepOutIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 8V1" />
    <path d="M3 4l3-3 3 3" />
    <line x1="2" y1="11" x2="10" y2="11" />
  </svg>
);

/** Play / auto-step. */
export const PlayIcon: FunctionComponent = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 1.5l7 4.5-7 4.5z" />
  </svg>
);

/** Pause auto-step. */
export const PauseIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="2" x2="4" y2="10" />
    <line x1="8" y1="2" x2="8" y2="10" />
  </svg>
);
