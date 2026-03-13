import { useEffect, useState } from "react";

import type { Controller } from "../engine/controller";
import { BoardMode } from "../engine/state/enums";

interface ModeSelectorProps {
  controller: Controller;
  /** When true, the visual mode selector is hidden. Keyboard shortcuts still work. */
  hidden?: boolean;
}

const modes = [
  { mode: BoardMode.DRAW, label: "Draw", icon: "✏️", shortcut: "D" },
  { mode: BoardMode.MOVE, label: "Move", icon: "✋", shortcut: "M" },
  { mode: BoardMode.ERASE, label: "Erase", icon: "🧹", shortcut: "E" },
] as const;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function ModeSelector({ controller, hidden = false }: ModeSelectorProps) {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const originalFn = controller.onBoardUpdateFn;
    controller.onBoardUpdateFn = () => {
      if (originalFn) originalFn();
      forceUpdate({});
    };
    return () => {
      controller.onBoardUpdateFn = originalFn;
    };
  }, [controller]);

  const currentMode = controller.state.mode;

  if (hidden) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Not wrong - I just need to get around to figuring out how to make this a native interactive element...
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        opacity: 0.4,
        transition: "opacity 250ms",
        zIndex: 2,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
    >
      {modes.map(({ mode, label, icon, shortcut }) => (
        <button
          key={mode}
          title={`${label} (${shortcut})`}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            controller.setMode(mode);
          }}
          style={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            backgroundColor: currentMode === mode ? "#008CBA" : "#333",
            color: "#fff",
            transition: "background-color 250ms",
            borderBottom: mode !== BoardMode.ERASE ? "1px solid rgba(255,255,255,0.1)" : "none",
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
