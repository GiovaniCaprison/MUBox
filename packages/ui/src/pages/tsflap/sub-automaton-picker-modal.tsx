/**
 * SubAutomatonPickerModal — Lets the user choose which automaton a call state
 * should invoke when entered during simulation.
 *
 * This modal is part of the **Recursive State Machine (RSM)** extension.
 * When the user right-clicks a node and selects "Set as Call State…", this
 * picker presents all other automata in the workspace as potential targets.
 *
 * **Theory note (Alur & Yannakakis, 2001):**
 * All cross-type and cross-determinism combinations are valid in an RSM:
 * - DFA → NFA: valid (system becomes non-deterministic at call point)
 * - DTM → NTM: valid (NTMs and DTMs recognise the same class — RE)
 * - DPDA → NPDA: valid (system gains full CFL power of the callee)
 * Determinism is a property of individual components, not the RSM system.
 */

import type { NodeView } from "@mubox/local-tsflap";
import type { FunctionComponent } from "react";
import { useState } from "react";

import { CloseIcon } from "./icons";

/* ─── Types ─── */

/** Minimal representation of a workspace automaton entry for the picker. */
export interface PickerEntry {
  readonly id: string;
  readonly name: string;
  readonly graphType: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
}

interface SubAutomatonPickerModalProps {
  readonly open: boolean;
  /** The node view whose call config is being set. */
  readonly targetNodeView: NodeView | null;
  /** All automata in the workspace except the currently active one. */
  readonly entries: readonly PickerEntry[];
  readonly onSelect: (entry: PickerEntry, callMode: "accept-reject" | "exit-mapped") => void;
  readonly onClose: () => void;
}

/* ─── Colour mapping for automaton type badges ─── */

const TYPE_COLORS: Record<string, string> = {
  FA: "bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-600",
  PDA: "bg-violet-600/10 text-violet-600 dark:bg-violet-600/20 dark:text-violet-600",
  TM: "bg-teal-600/10 text-teal-600 dark:bg-teal-600/20 dark:text-teal-600",
};

/* ─── Component ─── */

export const SubAutomatonPickerModal: FunctionComponent<SubAutomatonPickerModalProps> = ({
  open,
  targetNodeView,
  entries,
  onSelect,
  onClose,
}) => {
  const [callMode, setCallMode] = useState<"accept-reject" | "exit-mapped">(targetNodeView?.model.callConfig?.callMode ?? "accept-reject");

  if (!open || !targetNodeView) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md animate-[fade-in_150ms_ease-out] rounded-xl border border-zinc-300 bg-zinc-50 p-6 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Set Call State — {targetNodeView.model.label}</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Select a sub-automaton to invoke when this state is entered.</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-zinc-600 hover:bg-zinc-300/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Entry list */}
        <div className="flex flex-col gap-2">
          {entries.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No other automata in the workspace.
              <br />
              Create a new tab first, then set it as a sub-automaton.
            </div>
          ) : (
            entries.map((entry) => {
              const typeColor = TYPE_COLORS[entry.graphType] ?? "bg-zinc-100 text-zinc-600";
              const isCurrentTarget = targetNodeView.model.callConfig?.targetAutomatonId === entry.id;

              return (
                <button
                  key={entry.id}
                  onClick={() => onSelect(entry, callMode)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                    isCurrentTarget
                      ? "border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-900/20"
                      : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
                  }`}
                >
                  {/* Type badge */}
                  <span className={`inline-flex h-6 items-center rounded px-2 text-[10px] font-bold tracking-wide ${typeColor}`}>
                    {entry.graphType}
                  </span>

                  {/* Name and stats */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{entry.name}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {entry.nodeCount} states · {entry.edgeCount} transitions
                      {isCurrentTarget && " · currently selected"}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {isCurrentTarget && <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400">✓</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Call mode selector */}
        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <div className="mb-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">Call Mode</div>
          <div className="flex gap-2">
            <button
              onClick={() => setCallMode("accept-reject")}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-left text-[11px] transition-all ${
                callMode === "accept-reject"
                  ? "border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-zinc-300/60 bg-white text-zinc-400 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500"
              }`}
            >
              <div className={callMode === "accept-reject" ? "font-semibold" : "font-medium"}>Accept / Reject</div>
              <div className="mt-0.5 text-[10px] opacity-70">Binary return — callee accepts or rejects</div>
            </button>
            <button
              onClick={() => setCallMode("exit-mapped")}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-left text-[11px] transition-all ${
                callMode === "exit-mapped"
                  ? "border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300"
                  : "border-zinc-300/60 bg-white text-zinc-400 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500"
              }`}
            >
              <div className={callMode === "exit-mapped" ? "font-semibold" : "font-medium"}>Exit-Mapped</div>
              <div className="mt-0.5 text-[10px] opacity-70">Multiple return ports per box</div>
            </button>
          </div>
        </div>

        {/* Theory footnote */}
        <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <p className="text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            <strong>Theory note:</strong> All cross-type combinations are valid per the RSM formalism. A DFA can call an NFA, a DPDA can
            call an NPDA, etc. Determinism is a property of individual components — the system-level behavior may be non-deterministic.
          </p>
        </div>
      </div>
    </div>
  );
};
