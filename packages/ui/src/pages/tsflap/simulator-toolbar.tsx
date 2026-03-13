import { useState, useRef, useEffect, createContext, useContext } from "react";
import type { FunctionComponent, ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════════
   Menu Bar Context (shared state for dropdown switching on hover)
   ═══════════════════════════════════════════════════════════════════ */

interface MenuBarContextType {
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  menuBarActive: boolean;
}

const MenuBarContext = createContext<MenuBarContextType>({
  activeDropdown: null,
  setActiveDropdown: () => {
    /* noop — overridden by Provider */
  },
  menuBarActive: false,
});

/* ─── Compact Menu Bar (File/Edit/etc. text menus) ─── */

interface MenuBarProps {
  readonly children: ReactNode;
}

export const MenuBar: FunctionComponent<MenuBarProps> = ({ children }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeDropdown) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeDropdown]);

  useEffect(() => {
    if (!activeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        e.stopPropagation();
        e.preventDefault();
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [activeDropdown]);

  return (
    <MenuBarContext.Provider value={{ activeDropdown, setActiveDropdown, menuBarActive: activeDropdown !== null }}>
      <div ref={ref} className="flex items-center">
        {children}
      </div>
    </MenuBarContext.Provider>
  );
};

/* ─── Toolbar Dropdown ─── */

interface ToolbarDropdownProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly width?: number;
}

export const ToolbarDropdown: FunctionComponent<ToolbarDropdownProps> = ({ label, children, width = 240 }) => {
  const { activeDropdown, setActiveDropdown, menuBarActive } = useContext(MenuBarContext);
  const isOpen = activeDropdown === label;

  return (
    <div className="relative">
      <button
        className={`cursor-pointer rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors hover:bg-zinc-300/60 dark:hover:bg-zinc-600/60 ${
          isOpen ? "bg-zinc-300/60 dark:bg-zinc-600/60" : ""
        }`}
        onClick={() => setActiveDropdown(isOpen ? null : label)}
        onMouseEnter={() => menuBarActive && !isOpen && setActiveDropdown(label)}
      >
        {label}
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 z-[2000] mt-1 overflow-y-auto rounded-lg border border-zinc-300 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
          style={{ width, maxHeight: "70vh" }}
        >
          <div className="p-1.5">{children}</div>
        </div>
      )}
    </div>
  );
};

/* ─── Toolbar Separator ─── */

export const ToolbarSeparator: FunctionComponent = () => <div className="mx-1.5 h-5 w-px bg-zinc-300 dark:bg-zinc-600" />;

/* ─── Toolbar Section Header ─── */

interface ToolbarSectionProps {
  readonly label: string;
  readonly withBorder?: boolean;
}

export const ToolbarSection: FunctionComponent<ToolbarSectionProps> = ({ label, withBorder = true }) => (
  <div
    className={`mt-1 mb-0.5 px-2 pt-1.5 pb-1 text-[10px] font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300 ${
      withBorder ? "border-t border-zinc-100 dark:border-zinc-800" : ""
    }`}
  >
    {label}
  </div>
);

/* ─── Toolbar Button Item ─── */

interface ToolbarItemProps {
  readonly label: string;
  readonly shortcut?: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly active?: boolean;
}

export const ToolbarItem: FunctionComponent<ToolbarItemProps> = ({ label, shortcut, onClick, disabled, active }) => {
  const { setActiveDropdown } = useContext(MenuBarContext);

  const handleClick = () => {
    if (disabled || !onClick) return;
    onClick();
    setActiveDropdown(null);
  };

  return (
    <button
      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
        disabled
          ? "cursor-not-allowed text-zinc-300 dark:text-zinc-600"
          : active
            ? "bg-primary/10 text-primary font-medium"
            : "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className="flex items-center gap-2">
        {active && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2.5 6l2.5 2.5 4.5-5" />
          </svg>
        )}
        {!active && <span className="w-3" />}
        {label}
      </span>
      {shortcut && (
        <kbd className="ml-4 rounded border border-zinc-100 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
          {shortcut}
        </kbd>
      )}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Icon Toolbar Button (for the main action bar)
   ═══════════════════════════════════════════════════════════════════ */

interface ToolbarIconButtonProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onClick?: () => void;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly shortcut?: string;
  readonly size?: "sm" | "md";
  readonly variant?: "default" | "ghost";
}

export const ToolbarIconButton: FunctionComponent<ToolbarIconButtonProps> = ({
  icon,
  label,
  onClick,
  active,
  disabled,
  shortcut,
  size = "md",
  variant = "default",
}) => {
  const sizeClasses = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`${sizeClasses} inline-flex cursor-pointer items-center justify-center rounded-lg transition-all duration-100 ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : active
            ? "bg-primary/15 text-primary ring-primary/20 shadow-sm ring-1"
            : variant === "ghost"
              ? "text-zinc-600 hover:bg-zinc-300/50 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-600/50 dark:hover:text-zinc-100"
              : "text-zinc-600 hover:bg-zinc-300/60 hover:text-zinc-900 active:bg-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-600/60 dark:hover:text-zinc-100 dark:active:bg-zinc-600"
      }`}
    >
      {icon}
    </button>
  );
};

/* ─── Mode Button (Draw/Move/Erase with label) ─── */

interface ModeButtonProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly shortcut: string;
  readonly active: boolean;
  readonly onClick: () => void;
}

export const ModeButton: FunctionComponent<ModeButtonProps> = ({ icon, label, shortcut, active, onClick }) => (
  <button
    onClick={onClick}
    title={`${label} (${shortcut})`}
    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all duration-100 ${
      active
        ? "bg-primary/15 text-primary ring-primary/20 shadow-sm ring-1"
        : "text-zinc-600 hover:bg-zinc-300/60 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-600/60 dark:hover:text-zinc-100"
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
    <kbd className="hidden text-[9px] opacity-50 sm:inline">{shortcut}</kbd>
  </button>
);

/* ─── New Tab Dropdown Button ─── */

interface NewTabDropdownProps {
  readonly onSelect: (type: "FA" | "PDA" | "TM") => void;
}

export const NewTabDropdown: FunctionComponent<NewTabDropdownProps> = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const types = [
    { type: "FA" as const, label: "Finite Automaton", desc: "DFA / NFA" },
    { type: "PDA" as const, label: "Pushdown Automaton", desc: "Context-free" },
    { type: "TM" as const, label: "Turing Machine", desc: "Unrestricted" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="New automaton"
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-300/60 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-600/60 dark:hover:text-zinc-100"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 3v8M3 7h8" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-[2000] mt-1 w-56 overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-900">
          <div className="p-1.5">
            <div className="px-2 pt-1 pb-1.5 text-[10px] font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">
              New Automaton
            </div>
            {types.map((t) => (
              <button
                key={t.type}
                onClick={() => {
                  onSelect(t.type);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {t.type}
                </span>
                <div>
                  <div className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{t.label}</div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-600">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   SVG Icons for the toolbar
   ═══════════════════════════════════════════════════════════════════ */

export const Icons = {
  Draw: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M11.5 2.5l2 2-8 8H3.5v-2z" />
      <path d="M9.5 4.5l2 2" />
    </svg>
  ),
  Move: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 2v12M2 8h12M4 4l-2 4 2 4M12 4l2 4-2 4M4 4l4-2 4 2M4 12l4 2 4-2" />
    </svg>
  ),
  Erase: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 13h10M5.5 11l-2-2 5-5 4 4-5 5H5.5z" />
    </svg>
  ),
  Undo: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 5h5a3 3 0 110 6H6" />
      <path d="M5 3L3 5l2 2" />
    </svg>
  ),
  Redo: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M11 5H6a3 3 0 100 6h2" />
      <path d="M9 3l2 2-2 2" />
    </svg>
  ),
  ZoomFit: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />
    </svg>
  ),
  ResetView: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6l5-4.5L12 6" />
      <path d="M3.5 5v5.5a1 1 0 001 1h5a1 1 0 001-1V5" />
    </svg>
  ),
  GridOn: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1" />
      <line x1="5" y1="1.5" x2="5" y2="12.5" />
      <line x1="9" y1="1.5" x2="9" y2="12.5" />
      <line x1="1.5" y1="5" x2="12.5" y2="5" />
      <line x1="1.5" y1="9" x2="12.5" y2="9" />
    </svg>
  ),
  Deterministic: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="4" cy="7" r="2.5" />
      <circle cx="10" cy="7" r="2.5" />
      <path d="M6.5 7h1" />
    </svg>
  ),
  NonDeterministic: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="3.5" cy="7" r="2" />
      <circle cx="10.5" cy="4" r="2" />
      <circle cx="10.5" cy="10" r="2" />
      <path d="M5.5 7h2M7.5 5.5l1 -1.5M7.5 8.5l1 1.5" />
    </svg>
  ),
  GridOff: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1" />
    </svg>
  ),
  Command: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="6" r="4" />
      <path d="M10 10l3 3" />
    </svg>
  ),
  Export: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 2v7M4 6l3 3 3-3M2 10v2h10v-2" />
    </svg>
  ),
  LayoutCircle: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="7" cy="7" r="5" />
      <circle cx="7" cy="2" r="1" />
      <circle cx="11.3" cy="5.5" r="1" />
      <circle cx="9.7" cy="10.5" r="1" />
      <circle cx="4.3" cy="10.5" r="1" />
      <circle cx="2.7" cy="5.5" r="1" />
    </svg>
  ),
  LayoutTree: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="7" cy="2.5" r="1.5" />
      <circle cx="3.5" cy="10.5" r="1.5" />
      <circle cx="10.5" cy="10.5" r="1.5" />
      <path d="M6 3.8L4.2 8.5M8 3.8L9.8 8.5" />
    </svg>
  ),
  LayoutForce: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="7" cy="7" r="1.5" />
      <circle cx="3" cy="3" r="1" />
      <circle cx="11" cy="4" r="1" />
      <circle cx="4" cy="11" r="1" />
      <circle cx="11" cy="10" r="1" />
      <path d="M5.8 5.8L3.8 3.8M8.2 6.2L10.2 4.8M5.8 8.2L4.8 10.2M8.2 7.8L10.2 9.2" />
    </svg>
  ),
  AlignGrid: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <line x1="1" y1="3.5" x2="13" y2="3.5" strokeDasharray="1.5 2" />
      <line x1="1" y1="7" x2="13" y2="7" strokeDasharray="1.5 2" />
      <line x1="1" y1="10.5" x2="13" y2="10.5" strokeDasharray="1.5 2" />
      <line x1="3.5" y1="1" x2="3.5" y2="13" strokeDasharray="1.5 2" />
      <line x1="7" y1="1" x2="7" y2="13" strokeDasharray="1.5 2" />
      <line x1="10.5" y1="1" x2="10.5" y2="13" strokeDasharray="1.5 2" />
      <circle cx="3.5" cy="3.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Settings: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="2" />
      <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M11.2 2.8l-1.4 1.4M4.2 9.8l-1.4 1.4" />
    </svg>
  ),
  Keyboard: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1" y="3" width="12" height="8" rx="1.5" />
      <line x1="4" y1="6" x2="4" y2="6.01" strokeWidth="2" />
      <line x1="7" y1="6" x2="7" y2="6.01" strokeWidth="2" />
      <line x1="10" y1="6" x2="10" y2="6.01" strokeWidth="2" />
      <line x1="4" y1="9" x2="10" y2="9" />
    </svg>
  ),
};
