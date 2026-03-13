import React, { useEffect, useRef, useState } from "react";

import type { Controller } from "../engine/controller";

interface ContextMenuProps {
  controller: Controller;
  containerRef: React.RefObject<HTMLElement | SVGElement | null>;
}

function closeMenu(controller: Controller) {
  controller.state.contextMenuOptions = null;
  controller.state.contextMenuPosition = null;
  controller.views.update();
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function ContextMenu({ controller, containerRef }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState({});

  // Subscribe to controller updates
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

  // Close on mousedown outside (fires before canvas handleMouseDown)
  useEffect(() => {
    const handleMouseDownOutside = (e: MouseEvent) => {
      if (controller.state.contextMenuOptions && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        e.stopPropagation();
        e.preventDefault();
        closeMenu(controller);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && controller.state.contextMenuOptions) {
        closeMenu(controller);
      }
    };

    // Use capture phase so we intercept before the canvas handler
    document.addEventListener("mousedown", handleMouseDownOutside, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDownOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [controller]);

  const { contextMenuOptions, contextMenuPosition } = controller.state;

  if (!contextMenuOptions || !contextMenuPosition || contextMenuOptions.length === 0) {
    return null;
  }

  // Calculate position relative to the container
  let top = contextMenuPosition.y;
  let left = contextMenuPosition.x;
  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    top -= rect.top;
    left -= rect.left;
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 1000,
        minWidth: "140px",
        padding: "4px 0",
      }}
    >
      {contextMenuOptions.map((option, index) => (
        <button
          key={index}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            option.callback();
            closeMenu(controller);
          }}
          style={{
            display: "block",
            width: "100%",
            padding: "6px 12px",
            border: "none",
            background: "none",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "13px",
            color: "#333",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          {option.display}
        </button>
      ))}
    </div>
  );
}
