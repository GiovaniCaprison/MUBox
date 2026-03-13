import React, { useState } from "react";

import { EditableLabel } from "./EditableLabel";
import { FinalCircle } from "./FinalCircle";
import { InitialArrow } from "./InitialArrow";
import { useTheme } from "./ThemeContext";
import { BatchCommand, EraseNodeCommand, MarkFinalNodeCommand, RelabelNodeCommand, UnmarkFinalNodeCommand } from "../engine/commands";
import type { Controller } from "../engine/controller";
import { BoardMode } from "../engine/state/enums";
import type { NodeView as NodeViewModel } from "../engine/views/node-view";

interface NodeViewProps {
  nodeView: NodeViewModel;
  controller: Controller;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function NodeViewComponent({ nodeView, controller }: NodeViewProps) {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const isSelected = controller.state.selectedNodes.has(nodeView);
  const highlightColor = controller.state.highlightedNodes.get(nodeView.model) ?? null;
  const isHighlighted = highlightColor !== null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (controller.state.contextMenuOptions) return;
    if (controller.state._edgeJustCompleted) {
      controller.state._edgeJustCompleted = false;
      return;
    }
    if (controller.state.mode === BoardMode.DRAW && !controller.state.futureEdgeFromValid && !controller.state.futureEdgeFromCreated) {
      setIsEditing(true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const selectedNodes = controller.state.selectedNodes;
    const hasMultiSelection = isSelected && selectedNodes.size > 1;

    const options = [];

    if (hasMultiSelection) {
      const selectedArray = Array.from(selectedNodes);
      options.push({
        display: `Mark All Final (${selectedNodes.size})`,
        callback: () => {
          const cmds = selectedArray.filter((nv) => !nv.model.final).map((nv) => new MarkFinalNodeCommand(controller, nv.model));
          if (cmds.length > 0) controller.history.trackExecution(new BatchCommand(cmds));
        },
      });
      options.push({
        display: `Unmark All Final (${selectedNodes.size})`,
        callback: () => {
          const cmds = selectedArray.filter((nv) => nv.model.final).map((nv) => new UnmarkFinalNodeCommand(controller, nv.model));
          if (cmds.length > 0) controller.history.trackExecution(new BatchCommand(cmds));
        },
      });
      options.push({
        display: `Delete All Selected (${selectedNodes.size})`,
        callback: () => controller.eraseSelectedNodes(),
      });
    } else {
      if (!nodeView.model.initial) {
        options.push({ display: "Set as Initial", callback: () => controller.setInitialNode(nodeView, true) });
      } else {
        options.push({ display: "Unset Initial", callback: () => controller.setInitialNode(null, true) });
      }
      if (!nodeView.model.final) {
        options.push({ display: "Mark as Final", callback: () => controller.markFinalNode(nodeView, true) });
      } else {
        options.push({ display: "Unmark Final", callback: () => controller.unmarkFinalNode(nodeView, true) });
      }
      options.push({ display: "Rename", callback: () => setIsEditing(true) });

      // ─── Sub-Automaton (RSM) options ───
      if (nodeView.model.isCallState) {
        options.push({
          display: "Remove Call State",
          callback: () => {
            nodeView.model.callConfig = null;
            // Recalculate edge paths since anchor points change
            // between circle (regular state) and rectangle (call state)
            nodeView.updateEdgeVisualizationPaths();
            controller.views.update();
          },
        });
      }
      if (controller.onSetCallStateRequest) {
        options.push({
          display: nodeView.model.isCallState ? "Change Sub-Automaton…" : "Set as Call State…",
          callback: () => {
            if (controller.onSetCallStateRequest) {
              controller.onSetCallStateRequest(nodeView);
            }
          },
        });
      }

      options.push({
        display: "Delete",
        callback: () => {
          const cmd = new EraseNodeCommand(controller, nodeView);
          controller.history.trackExecution(cmd);
        },
      });
    }

    controller.state.contextMenuOptions = options;
    controller.state.contextMenuPosition = { x: e.clientX, y: e.clientY };
    controller.views.update();
  };

  const handleLabelComplete = (newLabel: string): boolean => {
    if (newLabel === "" || newLabel.trim() === "") return false;
    const existingNode = controller.views.getNodeViewByLabel(newLabel);
    if (existingNode && existingNode !== nodeView) return false;
    if (nodeView.model.label !== newLabel) {
      const cmd = new RelabelNodeCommand(controller, nodeView.model, newLabel);
      controller.history.trackExecution(cmd);
    }
    setIsEditing(false);
    return true;
  };

  const isCallState = nodeView.model.isCallState;
  const cx = nodeView.position.x;
  const cy = nodeView.position.y;
  const r = nodeView.radius;

  // ─── Ordinary state: circle ───
  if (!isCallState) {
    return (
      <g>
        {isHighlighted && (
          <circle
            cx={cx}
            cy={cy}
            r={r + 6}
            fill="none"
            stroke={highlightColor}
            strokeWidth={3}
            opacity={0.6}
            style={{ pointerEvents: "none", filter: `drop-shadow(0 0 6px ${highlightColor})` }}
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={isSelected ? "rgba(37, 99, 235, 0.15)" : theme.nodeFill}
          stroke={isSelected ? "rgba(37, 99, 235, 0.9)" : isHighlighted ? highlightColor : theme.nodeStroke}
          strokeWidth={isHighlighted ? Math.max(theme.nodeStrokeWidth, 2) : theme.nodeStrokeWidth}
          style={{ cursor: "pointer", transition: "fill .3s, stroke .3s" }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
        {isSelected && (
          <circle
            cx={cx}
            cy={cy}
            r={r - 3}
            fill="none"
            stroke="rgba(37, 99, 235, 0.85)"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            style={{ pointerEvents: "none" }}
          />
        )}
        {nodeView.model.final && <FinalCircle nodeView={nodeView} />}
        {nodeView.model.initial && <InitialArrow nodeView={nodeView} />}
        {isEditing ? (
          <EditableLabel
            value={nodeView.model.label}
            position={nodeView.position}
            maxLength={3}
            onComplete={handleLabelComplete}
            onCancel={() => setIsEditing(false)}
            controller={controller}
          />
        ) : (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill={theme.nodeLabelColor}
            fontSize={theme.nodeLabelFontSize}
            fontFamily={theme.nodeLabelFontFamily}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {nodeView.model.label}
          </text>
        )}
      </g>
    );
  }

  // ─── Call state: rounded rectangle (RSM box) ───
  // Sized to be compact but clearly distinct from circles.
  // The rectangle is centered on the node position so edges still
  // connect to the center point (the anchor calculation uses the radius).
  const w = r * 2.6;
  const h = r * 2.2;
  const rx = rectX(cx, w);
  const ry = rectY(cy, h);
  const cr = 4; // corner radius

  const fill = isSelected ? "rgba(37, 99, 235, 0.12)" : "rgba(139, 92, 246, 0.04)";

  const stroke = isSelected ? "rgba(37, 99, 235, 0.9)" : isHighlighted ? highlightColor : "rgba(139, 92, 246, 0.65)";

  const sw = isHighlighted ? 2 : 1.5;

  return (
    <g>
      {/* Highlight glow */}
      {isHighlighted && (
        <rect
          x={rx - 4}
          y={ry - 4}
          width={w + 8}
          height={h + 8}
          rx={cr + 2}
          ry={cr + 2}
          fill="none"
          stroke={highlightColor}
          strokeWidth={3}
          opacity={0.6}
          style={{ pointerEvents: "none", filter: `drop-shadow(0 0 6px ${highlightColor})` }}
        />
      )}

      {/* Main rectangle */}
      <rect
        x={rx}
        y={ry}
        width={w}
        height={h}
        rx={cr}
        ry={cr}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        style={{ cursor: "pointer", transition: "fill .3s, stroke .3s" }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />

      {/* Selection dashed inner rect */}
      {isSelected && (
        <rect
          x={rx + 3}
          y={ry + 3}
          width={w - 6}
          height={h - 6}
          rx={cr - 1}
          ry={cr - 1}
          fill="none"
          stroke="rgba(37, 99, 235, 0.85)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Final state: inner double border */}
      {nodeView.model.final && (
        <rect
          x={rx + 3}
          y={ry + 3}
          width={w - 6}
          height={h - 6}
          rx={cr - 1}
          ry={cr - 1}
          fill="none"
          stroke={stroke}
          strokeWidth={1}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Initial state arrow */}
      {nodeView.model.initial && <InitialArrow nodeView={nodeView} />}

      {/* Label */}
      {isEditing ? (
        <EditableLabel
          value={nodeView.model.label}
          position={nodeView.position}
          maxLength={3}
          onComplete={handleLabelComplete}
          onCancel={() => setIsEditing(false)}
          controller={controller}
        />
      ) : (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(139, 92, 246, 0.9)"
          fontSize={theme.nodeLabelFontSize}
          fontFamily={theme.nodeLabelFontFamily}
          fontWeight={600}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {nodeView.model.label}
        </text>
      )}

      {/* Target automaton name or "⟨sub⟩" indicator at bottom of rectangle */}
      {(() => {
        const targetId = nodeView.model.callConfig?.targetAutomatonId;
        const targetName = targetId && controller.getAutomatonName ? controller.getAutomatonName(targetId) : null;
        const displayText = targetName ? `⟨${targetName.length > 8 ? targetName.slice(0, 7) + "…" : targetName}⟩` : "⟨sub⟩";
        return (
          <text
            x={cx}
            y={ry + h - 4}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="rgba(139, 92, 246, 0.55)"
            fontSize={8}
            fontFamily={theme.nodeLabelFontFamily}
            fontWeight={500}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {displayText}
          </text>
        );
      })()}
    </g>
  );
}

// Helper functions for rectangle positioning
function rectX(cx: number, w: number): number {
  return cx - w / 2;
}
function rectY(cy: number, h: number): number {
  return cy - h / 2;
}
