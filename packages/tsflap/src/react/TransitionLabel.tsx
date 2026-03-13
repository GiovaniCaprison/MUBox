import React, { useEffect, useRef, useState } from "react";

import { useTheme } from "./ThemeContext";
import { EditEdgeTransitionCommand } from "../engine/commands";
import type { Controller } from "../engine/controller";
import { BoardMode, TransitionStyle } from "../engine/state/enums";
import type { EdgeView } from "../engine/views/edge-view";
import type { Edge } from "../model/edge";
import type { AbstractGraph } from "../model/graphs/abstract-graph";
import { EPSILON } from "../model/symbols";
import type { Transition } from "../model/transitions";
import { EditableTransitionPart, StaticTransitionPart } from "../model/transitions";

interface TransitionLabelProps {
  edge: Edge;
  edgeView: EdgeView;
  controller: Controller;
}

/** Small inline input for editing a single transition part */
// eslint-disable-next-line @typescript-eslint/naming-convention
function PartInput({
  initialValue,
  onCommit,
  onCancel,
  onAdvance,
  onBlurFinish,
  controller,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onAdvance: () => void;
  onBlurFinish: (value: string) => void;
  controller: Controller;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        controller.state.editableTextInputField = inputRef.current;
      }
    }, 30);
    return () => {
      controller.state.editableTextInputField = null;
      clearTimeout(timer);
    };
  }, [controller]);

  const commit = (value: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(value);
  };

  return (
    <foreignObject x={-14} y={-11} width={28} height={22} style={{ overflow: "visible" }}>
      <input
        ref={inputRef}
        type="text"
        defaultValue={initialValue}
        maxLength={1}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") {
            onCancel();
          } else if (e.key === "Enter") {
            const val = (e.target as HTMLInputElement).value;
            commit(val);
            onAdvance();
          } else if (e.key === "Tab") {
            e.preventDefault();
            const val = (e.target as HTMLInputElement).value;
            commit(val);
            onAdvance();
          }
        }}
        onChange={(e) => {
          // Auto-commit when a character is typed (maxLength=1)
          if (e.target.value.length === 1) {
            commit(e.target.value);
            onAdvance();
          }
        }}
        onBlur={(e) => {
          const val = e.target.value;
          if (val.length > 0) {
            commit(val);
            onBlurFinish(val);
          } else {
            onCancel();
          }
        }}
        style={{
          width: "22px",
          height: "18px",
          textAlign: "center",
          border: "1px solid #aaa",
          borderRadius: "3px",
          fontSize: "13px",
          fontFamily: "sans-serif",
          fontWeight: "bold",
          padding: "0",
          outline: "none",
          boxShadow: "0 0 3px rgba(0,140,186,0.4)",
          backgroundColor: "#fff",
          color: "#000",
          caretColor: "#000",
        }}
      />
    </foreignObject>
  );
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function TransitionLabel({ edge, edgeView, controller }: TransitionLabelProps) {
  const theme = useTheme();
  // editingPartIndex: -1 = not editing, 0+ = index into editable parts
  const isPendingOnMount = useRef(edge.transition.pending);
  const [editingPartIndex, setEditingPartIndex] = useState<number>(edge.transition.pending ? 0 : -1);
  const position = edgeView.getTransitionPoint(edge.visualizationNumber);
  // For auto-opened pending transitions, save the original transition state
  const previousTransitionRef = useRef<Transition | null>(isPendingOnMount.current ? edge.transition.clone() : null);

  const parts = edge.transition.getTransitionParts();
  const editableParts = parts
    .map((p, i) => ({ part: p, index: i }))
    .filter((x): x is { part: EditableTransitionPart; index: number } => x.part instanceof EditableTransitionPart);

  const isEditing = editingPartIndex >= 0;

  // Save the previous transition state when editing starts
  const startEditing = (partIdx: number) => {
    previousTransitionRef.current ??= edge.transition.clone();
    setEditingPartIndex(partIdx);
  };

  const finishEditing = () => {
    // Mark as not pending BEFORE cloning so clone gets the real character (not UNKNOWN)
    const wasPending = edge.transition.pending;
    edge.transition.pending = false;

    const oldTransition = previousTransitionRef.current;
    if (oldTransition) {
      const newTransition = edge.transition.clone();
      if (oldTransition.toString() !== newTransition.toString() || wasPending) {
        const cmd = new EditEdgeTransitionCommand(controller, edge, newTransition, oldTransition);
        controller.history.trackExecution(cmd);
      }
    } else if (wasPending) {
      // Fallback: no prevRef but was pending — still need to update the graph
      // This shouldn't happen with the isPendingOnMount fix, but just in case
      controller.graph.updateAlphabet();
      controller.views.update();
    }

    previousTransitionRef.current = null;
    setEditingPartIndex(-1);
  };

  const cancelEditing = () => {
    if (edge.transition.pending) {
      const isFAGraph = controller.graph.shortName === "FA";
      const isPDAGraph = controller.graph.shortName === "PDA";
      const isDeterministic = "deterministic" in controller.graph && (controller.graph as AbstractGraph).deterministic;

      if ((isFAGraph && !isDeterministic) || isPDAGraph) {
        // NFA: save as lambda (epsilon transition is allowed)
        // PDA: save as lambda (epsilon transition is allowed)
        const lambdaTransition = controller.graph.createTransitionFromString(EPSILON, false);
        const cmd = new EditEdgeTransitionCommand(controller, edge, lambdaTransition, edge.transition);
        controller.history.trackExecution(cmd);
        edge.transition.pending = false;
      } else if (isFAGraph && isDeterministic) {
        // DFA: lambda not allowed, delete the transition
        controller.removeEdgeTransition(edgeView, edge);
      } else {
        // TM: keep default values (☐/☐; R), just mark as not pending
        edge.transition.pending = false;
        const newTransition = edge.transition.clone();
        const cmd = new EditEdgeTransitionCommand(controller, edge, newTransition, edge.transition);
        controller.history.trackExecution(cmd);
      }
    }
    previousTransitionRef.current = null;
    setEditingPartIndex(-1);
  };

  const handlePartCommit = (editableIdx: number, value: string) => {
    const ep = editableParts[editableIdx];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- How wrong, oh how so so wrong
    if (ep) {
      // Empty value → use the graph's empty transition character (λ for FA and PDA, ☐ for TM)
      const effectiveValue = value === "" ? controller.graph.getEmptyTransitionCharacter() : value;
      ep.part.onEdit(effectiveValue, edge.transition);
    }
  };

  const handleAdvance = (editableIdx: number) => {
    if (editableIdx < editableParts.length - 1) {
      setEditingPartIndex(editableIdx + 1);
    } else {
      finishEditing();
    }
  };

  const handleMouseEnter = () => {
    controller.state.hoveringTransition = edge;
  };

  const handleMouseLeave = () => {
    controller.state.hoveringTransition = null;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const options = [
      {
        display: "Rename",
        callback: () => startEditing(0),
      },
      {
        display: "Delete",
        callback: () => {
          controller.removeEdgeTransition(edgeView, edge);
        },
      },
    ];
    controller.state.contextMenuOptions = options;
    controller.state.contextMenuPosition = { x: e.clientX, y: e.clientY };
    controller.views.update();
  };

  // Render parts as tspans, with inline editor for the active part
  const renderParts = () => {
    let xOffset = 0;
    const elements: React.ReactNode[] = [];

    parts.forEach((part, i) => {
      const isEditablePart = part instanceof EditableTransitionPart;
      const editableIdx = isEditablePart ? editableParts.findIndex((ep) => ep.index === i) : -1;
      const isThisPartEditing = isEditing && editableIdx === editingPartIndex;

      if (isThisPartEditing) {
        elements.push(
          <g key={i} transform={`translate(${xOffset}, 0)`}>
            <PartInput
              initialValue={part.content}
              onCommit={(val) => handlePartCommit(editableIdx, val)}
              onCancel={cancelEditing}
              onAdvance={() => handleAdvance(editableIdx)}
              onBlurFinish={() => finishEditing()}
              controller={controller}
            />
          </g>,
        );
        xOffset += 18;
      } else {
        let content = part.content;
        const isStatic = part instanceof StaticTransitionPart;
        if (!isStatic) {
          // For editable parts, show the graph's empty character for empty values
          if (content === " ") content = String.fromCharCode(0x2423);
          else if (content === "") content = controller.graph.getEmptyTransitionCharacter();
        }

        const isClickable = isEditablePart && !isEditing;
        // Use smaller font for static delimiters, give arrow more space
        const isArrow = isStatic && content === "→";
        const staticWidth = isArrow ? 14 : 8;

        elements.push(
          <text
            key={i}
            x={xOffset}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isStatic ? theme.transitionFontSize - 2 : theme.transitionFontSize}
            fontFamily={theme.transitionFontFamily}
            fill={isStatic ? "#999" : theme.transitionFill}
            stroke={theme.transitionStroke}
            strokeWidth={theme.transitionStrokeWidth}
            paintOrder="stroke"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            style={{ cursor: isClickable ? "pointer" : "default", userSelect: "none" }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();
              if (controller.state.mode === BoardMode.DRAW && isClickable) {
                startEditing(editableIdx);
              } else if (controller.state.mode === BoardMode.ERASE) {
                controller.removeEdgeTransition(edgeView, edge);
              }
            }}
          >
            {content}
          </text>,
        );
        xOffset += isStatic ? staticWidth : 14;
      }
    });

    return elements;
  };

  // Calculate rotation angle for perpendicular style
  const getRotationAngle = (): number => {
    if (controller.settings.transitionStyle !== TransitionStyle.PERPENDICULAR) return 0;
    const dx = edgeView.end.x - edgeView.start.x;
    const dy = edgeView.end.y - edgeView.start.y;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    // Keep text readable (not upside down)
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return angle;
  };

  const rotationAngle = getRotationAngle();

  // For single-part transitions (FA), use simpler layout
  if (parts.length === 1) {
    const singlePart = parts[0];
    let displayText = singlePart.content;
    if (displayText === " ") displayText = String.fromCharCode(0x2423);
    else if (displayText === "") displayText = String.fromCharCode(0x25a1);

    if (isEditing) {
      return (
        <g transform={`translate(${position.x}, ${position.y})`}>
          <PartInput
            initialValue={edge.transition.pending ? "" : singlePart.content}
            onCommit={(val) => {
              handlePartCommit(0, val);
            }}
            onCancel={cancelEditing}
            onAdvance={() => finishEditing()}
            onBlurFinish={() => finishEditing()}
            controller={controller}
          />
        </g>
      );
    }

    return (
      <text
        x={position.x}
        y={position.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={theme.transitionFontSize}
        fontFamily={theme.transitionFontFamily}
        fill={theme.transitionFill}
        stroke={theme.transitionStroke}
        strokeWidth={theme.transitionStrokeWidth}
        paintOrder="stroke"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        letterSpacing=".2rem"
        transform={rotationAngle !== 0 ? `rotate(${rotationAngle}, ${position.x}, ${position.y})` : undefined}
        style={{ cursor: "pointer", userSelect: "none" }}
        onMouseDown={(e) => {
          // Only handle left-click (button 0)
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          if (controller.state.mode === BoardMode.DRAW) {
            startEditing(0);
          } else if (controller.state.mode === BoardMode.ERASE) {
            controller.removeEdgeTransition(edgeView, edge);
          }
        }}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {edge.transition.pending ? UNKNOWN_CHAR : displayText}
      </text>
    );
  }

  // Multi-part transitions (TM, PDA)
  const totalWidth = parts.reduce((w, p) => {
    if (p instanceof StaticTransitionPart) {
      const isArrow = p.content === "→";
      return w + (isArrow ? 14 : 8);
    }
    return w + 14;
  }, 0);

  return (
    <g
      transform={`translate(${position.x - totalWidth / 2}, ${position.y})${rotationAngle !== 0 ? ` rotate(${rotationAngle})` : ""}`}
      onContextMenu={handleContextMenu}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if (controller.state.mode === BoardMode.ERASE) {
          e.stopPropagation();
          e.preventDefault();
          controller.removeEdgeTransition(edgeView, edge);
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderParts()}
    </g>
  );
}

const UNKNOWN_CHAR = String.fromCharCode(0xfffd);
