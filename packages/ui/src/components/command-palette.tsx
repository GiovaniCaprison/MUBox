/**
 * CommandPalette — A VS Code / Spotlight-style command palette overlay.
 *
 * Provides fuzzy-filtered, keyboard-navigable access to an arbitrary list of
 * {@link CommandItem} actions.  The palette is toggled via ⌘K (handled by the
 * parent) and supports arrow-key navigation, Enter to execute, and Escape to
 * dismiss.
 *
 * This component is intentionally **design-system-agnostic** — it uses raw
 * HTML + Tailwind so it can float above any page without pulling in
 * Cloudscape's modal / overlay machinery, which would fight with the
 * simulator's own layering.
 */

import type { FunctionComponent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

/* ─── Types ─── */

/** A single executable command shown in the palette. */
export interface CommandItem {
  /** Stable identifier used as the React key. */
  readonly id: string;
  /** Human-readable label displayed in the list. */
  readonly label: string;
  /** Optional secondary description shown below the label. */
  readonly description?: string;
  /** Keyboard shortcut hint rendered on the right side. */
  readonly shortcut?: string;
  /** Grouping header under which this command appears. */
  readonly group: string;
  /** Optional leading icon component. */
  readonly icon?: FunctionComponent;
  /** When true the command is filtered out of results. */
  readonly disabled?: boolean;
  /** Callback invoked when the command is selected. */
  readonly action: () => void;
}

interface CommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly commands: readonly CommandItem[];
}

/* ─── Icons ─── */

const SearchIcon: FunctionComponent = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="5.5" />
    <path d="M12.5 12.5L16 16" />
  </svg>
);

/* ─── Component ─── */

export const CommandPalette: FunctionComponent<CommandPaletteProps> = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Filter commands by query against label, group, and description. */
  const filtered = useMemo(() => {
    if (!query.trim()) return commands.filter((c) => !c.disabled);
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        !c.disabled && (c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  /* Group the filtered results for sectioned display. */
  const grouped = useMemo(() => {
    const groups: { label: string; items: CommandItem[] }[] = [];
    const groupMap = new Map<string, CommandItem[]>();
    for (const cmd of filtered) {
      let arr = groupMap.get(cmd.group);
      if (!arr) {
        arr = [];
        groupMap.set(cmd.group, arr);
        groups.push({ label: cmd.group, items: arr });
      }
      arr.push(cmd);
    }
    return groups;
  }, [filtered]);

  /* Reset state whenever the palette opens. */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* Clamp selected index when the result set shrinks. */
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  /* Keep the selected item scrolled into view. */
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  /* Keyboard navigation: ↑/↓ to move, Enter to select, Escape to close. */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [open, onClose, filtered, selectedIndex]);

  /* Prevent default on ⌘K so the browser doesn't open its own search bar. */
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [open]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-lg animate-[fade-in_100ms_ease-out] overflow-hidden rounded-xl border border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-zinc-300 px-4 py-3 dark:border-zinc-600">
          <span className="text-zinc-600 dark:text-zinc-300">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Search commands…"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-600 dark:text-zinc-100 dark:placeholder:text-zinc-600"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            ⌘K
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-zinc-600 dark:text-zinc-300">No commands found</div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">
                  {group.label}
                </div>
                {group.items.map((cmd) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      data-index={idx}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                      }`}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      {cmd.icon && (
                        <span className="flex-shrink-0 text-zinc-600 dark:text-zinc-300">
                          <cmd.icon />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{cmd.label}</div>
                        {cmd.description && <div className="truncate text-xs text-zinc-600 dark:text-zinc-600">{cmd.description}</div>}
                      </div>
                      {cmd.shortcut && (
                        <kbd className="flex-shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-zinc-300 px-4 py-2 text-[11px] text-zinc-600 dark:border-zinc-600 dark:text-zinc-600">
          <span>
            <kbd className="font-semibold">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-semibold">↵</kbd> select
          </span>
          <span>
            <kbd className="font-semibold">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
};
