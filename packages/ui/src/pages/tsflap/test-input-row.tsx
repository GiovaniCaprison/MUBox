/**
 * TestInputRow — A single row in the "Quick Testing" panel.
 *
 * Each row contains a text input for an input string and a status indicator
 * showing whether the automaton accepts (✅), rejects (❌), or errors (⚠)
 * on that string.  Rows support keyboard shortcuts:
 *
 * - **Enter** — insert a new row below
 * - **Escape** or **Backspace on empty** — remove this row
 *
 * For Turing Machines the row also displays the tape output below the input.
 */

import type { FunctionComponent } from "react";

import { CheckCircleIcon, TrashIcon, WarningIcon, XCircleIcon } from "./icons";

/* ─── Types ─── */

/** The result of running a single test string through the automaton. */
export interface TestResult {
  /** `true` = accepted, `false` = rejected, `null` = error / not run. */
  readonly accepted: boolean | null;
  /** Human-readable error message (empty string when no error). */
  readonly error: string;
  /** Tape output for Turing Machines (empty string otherwise). */
  readonly output: string;
}

interface TestInputRowProps {
  /** The current input string value. */
  readonly value: string;
  /** Execution result for this input (undefined if not yet run). */
  readonly result: TestResult | undefined;
  /** Whether the active automaton is a Turing Machine (shows tape output). */
  readonly isTM: boolean;
  /** When true the graph is invalid so all results show as "invalid graph". */
  readonly invalidGraph?: boolean;
  /** Called when the user edits the input string. */
  readonly onChange: (value: string) => void;
  /** Called when the user removes this row. */
  readonly onRemove: () => void;
  /** Called when the user presses Enter to add a row after this one. */
  readonly onAddAfter: () => void;
  /** Ref callback to capture the underlying `<input>` element for focus management. */
  readonly inputRef: (el: HTMLInputElement | null) => void;
}

/* ─── Component ─── */

export const TestInputRow: FunctionComponent<TestInputRowProps> = ({
  value,
  result,
  isTM,
  invalidGraph,
  onChange,
  onRemove,
  onAddAfter,
  inputRef,
}) => {
  const status = result?.accepted;
  const hasError = result?.error;

  /* Colour the border and background based on the test outcome. */
  const borderColor =
    status === true
      ? "border-emerald-300 dark:border-emerald-700"
      : status === false
        ? "border-red-300 dark:border-red-700"
        : hasError
          ? "border-orange-300 dark:border-orange-700"
          : "border-zinc-300 dark:border-zinc-600";

  const bgColor =
    status === true
      ? "bg-emerald-50/50 dark:bg-emerald-900/10"
      : status === false
        ? "bg-red-50/50 dark:bg-red-900/10"
        : hasError
          ? "bg-orange-50/50 dark:bg-orange-900/10"
          : "bg-zinc-50 dark:bg-zinc-800";

  return (
    <div className="group">
      <div
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${borderColor} ${bgColor} dark:border-zinc-600`}
      >
        {/* Status indicator */}
        <span className="flex-shrink-0">
          {status === true ? (
            <CheckCircleIcon />
          ) : status === false ? (
            <XCircleIcon />
          ) : hasError ? (
            <WarningIcon />
          ) : (
            <span className="inline-block h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-600" />
          )}
        </span>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            /* Stop propagation so canvas shortcuts (D, M, E, etc.) don't fire. */
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              onAddAfter();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onRemove();
            }
            if (e.key === "Backspace" && value === "") {
              e.preventDefault();
              onRemove();
            }
          }}
          placeholder={value === "" ? (invalidGraph ? "invalid graph…" : "type input string…") : ""}
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300 dark:text-zinc-100 dark:placeholder:text-zinc-600"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Remove button (visible on hover) */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 cursor-pointer rounded p-0.5 text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-300 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-red-400"
          title="Remove (Esc)"
        >
          <TrashIcon />
        </button>
      </div>

      {/* TM tape output (shown below the input when applicable) */}
      {isTM && result?.output && (
        <div className="mt-0.5 ml-6 text-[11px] text-zinc-600 dark:text-zinc-300">
          <span className="font-medium">→</span> <span className="font-mono">{result.output}</span>
        </div>
      )}

      {/* Error message (shown below the input when applicable) */}
      {hasError && result.error !== "Invalid graph" && (
        <div className="mt-0.5 ml-6 text-[11px] text-orange-600 dark:text-orange-300">{result.error}</div>
      )}
    </div>
  );
};
