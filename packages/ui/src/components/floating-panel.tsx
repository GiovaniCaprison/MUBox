/**
 * FloatingPanel — A draggable, resizable, collapsible panel for overlay UIs.
 *
 * Used by the simulator to host the "Quick Testing" and "Step Simulation"
 * panels that float above the canvas.  The panel supports:
 *
 * - **Drag** — click the header grip to reposition within the parent bounds.
 * - **Resize** — drag the right edge to change width (clamped to min/max).
 * - **Collapse** — click the chevron to toggle the body open/closed.
 *
 * This file also exports a family of small layout primitives
 * ({@link PanelSection}, {@link PanelRow}, {@link PanelDivider}, etc.) that
 * compose cleanly inside a FloatingPanel body.
 */

import type { FunctionComponent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════
   Inline SVG Icons (kept here to avoid an external dependency)
   ═══════════════════════════════════════════════════════════════════ */

/** Animated chevron that rotates between expanded (↓) and collapsed (→). */
const ChevronIcon: FunctionComponent<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    className="transition-transform duration-200"
    style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
  >
    <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Six-dot drag handle indicating the panel header is grabbable. */
const GripIcon: FunctionComponent = () => (
  <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" opacity="0.4">
    <circle cx="2" cy="2" r="1" />
    <circle cx="6" cy="2" r="1" />
    <circle cx="2" cy="7" r="1" />
    <circle cx="6" cy="7" r="1" />
    <circle cx="2" cy="12" r="1" />
    <circle cx="6" cy="12" r="1" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   Layout Primitives
   ═══════════════════════════════════════════════════════════════════ */

/** A labelled vertical section inside a panel body. */
interface PanelSectionProps {
  readonly label?: string;
  readonly children: ReactNode;
  readonly noPadding?: boolean;
}

export const PanelSection: FunctionComponent<PanelSectionProps> = ({ label, children, noPadding }) => (
  <div className={noPadding ? "" : "space-y-2"}>
    {label && <div className="text-[10px] font-semibold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">{label}</div>}
    {children}
  </div>
);

/** Horizontal flex row with configurable alignment. */
interface PanelRowProps {
  readonly children: ReactNode;
  readonly align?: "start" | "center" | "end" | "between";
  readonly gap?: number;
}

export const PanelRow: FunctionComponent<PanelRowProps> = ({ children, align = "start", gap = 2 }) => (
  <div
    className={`flex items-center gap-${gap} ${
      align === "between" ? "justify-between" : align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start"
    }`}
  >
    {children}
  </div>
);

/** Thin horizontal rule for visual separation. */
export const PanelDivider: FunctionComponent = () => <div className="my-1 h-px bg-zinc-300 dark:bg-zinc-600" />;

/** Label + child pair for form-like layouts. */
interface PanelFieldProps {
  readonly label: string;
  readonly children: ReactNode;
}

export const PanelField: FunctionComponent<PanelFieldProps> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</label>
    {children}
  </div>
);

/** Styled text input that stops keyboard event propagation (so typing
 *  doesn't trigger canvas shortcuts like "D" for Draw mode). */
interface PanelInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const PanelInput: FunctionComponent<PanelInputProps> = ({ value, onChange, placeholder, onKeyDown }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={(e) => {
      e.stopPropagation();
      onKeyDown?.(e);
    }}
    placeholder={placeholder}
    className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 transition-colors outline-none placeholder:text-zinc-300 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-300 dark:focus:ring-zinc-600"
  />
);

/** Small coloured pill for status indicators. */
interface PanelBadgeProps {
  readonly variant: "success" | "error" | "neutral" | "info";
  readonly children: ReactNode;
}

export const PanelBadge: FunctionComponent<PanelBadgeProps> = ({ variant, children }) => {
  const colors = {
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    error: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return <span className={`inline-flex items-center gap-1 rounded-full px-1 text-xs font-medium ${colors[variant]}`}>{children}</span>;
};

/** Multi-variant button sized for panel UIs. */
interface PanelButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly variant?: "default" | "primary" | "ghost";
  readonly size?: "sm" | "md";
  readonly disabled?: boolean;
  readonly title?: string;
}

export const PanelButton: FunctionComponent<PanelButtonProps> = ({
  children,
  onClick,
  variant = "default",
  size = "sm",
  disabled,
  title,
}) => {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };
  const variants = {
    default:
      "cursor-pointer border border-zinc-300 bg-zinc-50 text-zinc-600 shadow-sm hover:bg-zinc-300 hover:border-zinc-300 active:bg-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:border-zinc-600 dark:hover:text-zinc-100 dark:active:bg-zinc-600",
    primary:
      "cursor-pointer border border-transparent bg-zinc-800 text-zinc-50 hover:bg-zinc-600 active:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:active:bg-zinc-100",
    ghost:
      "cursor-pointer border border-transparent text-zinc-600 hover:bg-zinc-100 active:bg-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:active:bg-zinc-600",
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]}`} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   FloatingPanel
   ═══════════════════════════════════════════════════════════════════ */

interface FloatingPanelProps {
  /** Title shown in the panel header. */
  readonly title: string;
  /** Optional icon rendered before the title. */
  readonly icon?: ReactNode;
  /** Initial position (px) relative to the nearest positioned ancestor. */
  readonly defaultPosition: { x: number; y: number };
  /** Panel body content. */
  readonly children: ReactNode;
  /** Whether the panel starts expanded or collapsed. */
  readonly defaultExpanded?: boolean;
  /** Initial width in pixels. */
  readonly width?: number;
  /** Minimum resize width. */
  readonly minWidth?: number;
  /** Maximum resize width. */
  readonly maxWidth?: number;
  /** Extra content rendered in the header between the title and chevron. */
  readonly headerExtra?: ReactNode;
  /** Callback fired when the panel is expanded or collapsed. */
  readonly onExpandedChange?: (expanded: boolean) => void;
}

export const FloatingPanel: FunctionComponent<FloatingPanelProps> = ({
  title,
  icon,
  defaultPosition,
  children,
  defaultExpanded = true,
  width = 280,
  minWidth,
  maxWidth,
  headerExtra,
  onExpandedChange,
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isDragging, setIsDragging] = useState(false);
  const [panelWidth, setPanelWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, width: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  /* ─── Dragging ─── */

  const handleDragStart = (e: React.MouseEvent) => {
    /* Ignore clicks that originate inside the panel body or on buttons. */
    if ((e.target as HTMLElement).closest("[data-panel-content]")) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;

      /* Clamp to parent bounds so the panel can't be dragged off-screen. */
      const parent = panelRef.current?.parentElement;
      const panel = panelRef.current;
      if (parent && panel) {
        const parentRect = parent.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const maxX = parentRect.width - panelRect.width;
        const maxY = parentRect.height - panelRect.height;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
      }

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  /* ─── Resizing ─── */

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = { x: e.clientX, width: panelWidth };
    },
    [panelWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStart.current.x;
      let newWidth = resizeStart.current.width + delta;
      if (minWidth) newWidth = Math.max(minWidth, newWidth);
      if (maxWidth) newWidth = Math.min(maxWidth, newWidth);
      newWidth = Math.max(200, Math.min(600, newWidth));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  const isInteracting = isDragging || isResizing;

  return (
    <div
      ref={panelRef}
      className={`absolute z-50 flex flex-col overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm transition-shadow duration-200 ${
        isInteracting ? "shadow-2xl" : "shadow-lg"
      } border-primary bg-header-bg/95 dark:border-primary dark:bg-header-bg/95`}
      style={{
        left: position.x,
        top: position.y,
        width: panelWidth,
        userSelect: isInteracting ? "none" : "auto",
      }}
    >
      {/* ─── Header ─── */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={`flex items-center gap-2 border-b px-3 py-2 ${expanded ? "border-primary" : "border-transparent"}`}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={handleDragStart}
      >
        <GripIcon />

        {icon && <span className="flex-shrink-0 text-zinc-600 dark:text-zinc-300">{icon}</span>}

        <span className="flex-1 truncate text-[13px] font-semibold text-zinc-600 select-none dark:text-zinc-300">{title}</span>

        {headerExtra && <span className="flex-shrink-0">{headerExtra}</span>}

        <button
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            onExpandedChange?.(next);
          }}
          className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded text-zinc-600 transition-colors hover:bg-zinc-300 hover:text-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
          title={expanded ? "Collapse" : "Expand"}
        >
          <ChevronIcon expanded={expanded} />
        </button>
      </div>

      {/* ─── Content ─── */}
      <div
        data-panel-content
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{
          maxHeight: expanded ? "600px" : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="max-h-[500px] space-y-3 overflow-y-auto p-3">{children}</div>
      </div>

      {/* ─── Resize Handle ─── */}
      {expanded && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 transition-opacity hover:opacity-100"
          onMouseDown={handleResizeStart}
        >
          <div className="h-full w-full rounded-r-xl bg-zinc-300 dark:bg-zinc-600" />
        </div>
      )}
    </div>
  );
};
