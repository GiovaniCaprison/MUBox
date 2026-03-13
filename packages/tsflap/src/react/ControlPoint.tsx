import React from "react";

import { useTheme } from "./ThemeContext";
import { MoveEdgeControlCommand } from "../engine/commands";
import type { Controller } from "../engine/controller";
import type { EdgeView } from "../engine/views/edge-view";

interface ControlPointProps {
  edgeView: EdgeView;
  controller: Controller;
  onHoverChange: (hovering: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function ControlPoint({ edgeView, controller, onHoverChange }: ControlPointProps) {
  const theme = useTheme();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    controller.state.modifyEdgeControl = edgeView;
    controller.state.draggingCommand = new MoveEdgeControlCommand(controller, edgeView);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    edgeView.resetControlPoint();
    edgeView.recalculatePath();
    controller.views.shouldForceStandardAnimation = true;
    controller.views.update();
    controller.views.shouldForceStandardAnimation = false;
  };

  return (
    <circle
      cx={edgeView.control.x}
      cy={edgeView.control.y}
      r={10}
      fill={theme.controlPointFill}
      stroke={theme.controlPointStroke}
      strokeWidth={theme.controlPointStrokeWidth || 2}
      style={{ cursor: "move", transition: "all 0.05s cubic-bezier(0.4, 0, 0.2, 1)" }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    />
  );
}
