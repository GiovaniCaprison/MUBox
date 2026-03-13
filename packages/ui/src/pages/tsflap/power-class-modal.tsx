/**
 * PowerClassModal — Displays the computational power class of the current
 * RSM system with a full academic explanation, Chomsky hierarchy placement,
 * and relevant citations.
 */

import type { FunctionComponent } from "react";

import { CloseIcon } from "./icons";

/** Colour mapping for Chomsky hierarchy types. */
const TYPE_BADGE_COLORS: Record<number, string> = {
  3: "bg-blue-600/10 text-blue-600 border-blue-600/30",
  2: "bg-violet-600/10 text-violet-600 border-violet-600/30",
  0: "bg-red-600/10 text-red-600 border-red-600/30",
  [-1]: "bg-zinc-100 text-zinc-600 border-zinc-300",
};

/** Human-readable Chomsky type labels. */
const CHOMSKY_LABELS: Record<number, string> = {
  3: "Type 3 — Regular",
  2: "Type 2 — Context-Free",
  0: "Type 0 — Recursively Enumerable",
  [-1]: "N/A",
};

interface PowerClassModalProps {
  readonly open: boolean;
  readonly className: string;
  readonly chomskyType: number;
  readonly description: string;
  readonly onClose: () => void;
}

export const PowerClassModal: FunctionComponent<PowerClassModalProps> = ({ open, className, chomskyType, description, onClose }) => {
  if (!open) return null;

  const badgeColor = TYPE_BADGE_COLORS[chomskyType] ?? "bg-zinc-100 text-zinc-600 border-zinc-300";
  const chomskyLabel = CHOMSKY_LABELS[chomskyType] ?? `Type ${chomskyType}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-lg animate-[fade-in_150ms_ease-out] rounded-xl border border-zinc-300 bg-zinc-50 p-6 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Computational Power Class</h3>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-zinc-600 hover:bg-zinc-300/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Power class badge + Chomsky type */}
        <div className="mb-4 flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${badgeColor}`}>{className}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{chomskyLabel}</span>
        </div>

        {/* Chomsky hierarchy visual */}
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-2 text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Chomsky Hierarchy Placement
          </div>
          <div className="space-y-1.5">
            {[
              { type: 0, label: "Type 0 — Recursively Enumerable", desc: "Turing Machines" },
              { type: 1, label: "Type 1 — Context-Sensitive", desc: "Linear-bounded automata" },
              { type: 2, label: "Type 2 — Context-Free", desc: "Pushdown Automata" },
              { type: 3, label: "Type 3 — Regular", desc: "Finite Automata" },
            ].map((level) => {
              const isActive = chomskyType === level.type || (chomskyType === 0 && level.type <= 0);
              const isExact = chomskyType === level.type;
              return (
                <div
                  key={level.type}
                  className={`flex items-center justify-between rounded-md px-3 py-1.5 text-xs transition-colors ${
                    isExact
                      ? "bg-blue-600/10 font-semibold text-blue-700 ring-1 ring-blue-600/30 dark:bg-blue-600/20 dark:text-blue-400 dark:ring-blue-600/40"
                      : isActive
                        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400"
                        : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  <span>{level.label}</span>
                  <span className="text-[10px]">{level.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full description */}
        <div className="max-h-[40vh] overflow-auto rounded-lg bg-zinc-100 p-4 text-[13px] leading-relaxed text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {description.split("\n\n").map((paragraph, idx) => (
            <p key={idx} className={idx > 0 ? "mt-3" : ""}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Close button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-300/60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
