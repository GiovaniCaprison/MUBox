import React, { useEffect, useRef, useState } from "react";

import { ControlPoint } from "./ControlPoint";
import { EdgeViewComponent } from "./EdgeView";
import { FutureEdge } from "./FutureEdge";
import { NodeViewComponent } from "./NodeView";
import { useTheme } from "./ThemeContext";
import type { CanvasComponentOverrides } from "./types";
import { MutablePoint } from "../core/point";
import type { Controller } from "../engine/controller";
import { BoardMode } from "../engine/state/enums";

interface CanvasProps {
  controller: Controller;
  width?: number;
  height?: number;
  /**
   * Optional component overrides for customizing the visual appearance.
   *
   * Each property is a React component that replaces the default renderer
   * for that visual element. This enables consumers to completely customize
   * the look and feel while keeping all interaction logic intact.
   *
   * @example
   * ```tsx
   * <Canvas
   *   controller={controller}
   *   components={{
   *     NodeRenderer: MyCustomNode,
   *     EdgeRenderer: MyCustomEdge,
   *   }}
   * />
   * ```
   */
  components?: CanvasComponentOverrides;
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- Weird TSX components should be Pascal case - eslint needs it to be distinguished
export function Canvas({ controller, width = 800, height = 600, components }: CanvasProps) {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [, forceUpdate] = useState({});
  const lastScreenPointRef = useRef<{ screenX: number; screenY: number } | null>(null);

  // Initialize viewport when dimensions change, but preserve existing viewport
  // when switching between tabs (controllers that already have a viewport set)
  const prevControllerRef = useRef<Controller | null>(null);
  useEffect(() => {
    const isNewController = prevControllerRef.current !== controller;
    prevControllerRef.current = controller;

    if (isNewController) {
      // Only initialize if the controller still has default viewport dimensions
      // (800x600 from BoardState constructor). If the user has already panned/zoomed,
      // preserve their viewport.
      const hasDefaultViewport =
        controller.state.viewWidth === 800 &&
        controller.state.viewHeight === 600 &&
        controller.state.zoom === 1.0 &&
        controller.state.viewX === 0 &&
        controller.state.viewY === 0;
      if (hasDefaultViewport) {
        controller.initViewport(width, height);
      }
    } else {
      // Canvas dimensions changed (e.g., window resize) — update viewport to match
      // but preserve zoom and pan position
      const currentZoom = controller.state.zoom;
      controller.state.viewWidth = width / currentZoom;
      controller.state.viewHeight = height / currentZoom;
    }
  }, [controller, width, height]);

  useEffect(() => {
    controller.onBoardUpdateFn = () => forceUpdate({});
    return () => {
      controller.onBoardUpdateFn = null;
    };
  }, [controller]);

  /** Convert a mouse event to SVG coordinates */
  const getScreenPoint = (e: React.MouseEvent<SVGSVGElement>): { screenX: number; screenY: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return { screenX: e.clientX - rect.left, screenY: e.clientY - rect.top };
  };

  const screenToSVG = (screenX: number, screenY: number): MutablePoint => {
    return controller.screenToSVG(screenX, screenY, width, height);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const sp = getScreenPoint(e);
    if (!sp) return;
    lastScreenPointRef.current = sp;

    const svgPoint = screenToSVG(sp.screenX, sp.screenY);
    controller.handleMouseDown(svgPoint, e.button + 1);
    forceUpdate({});
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const sp = getScreenPoint(e);
    if (!sp) return;

    // For board panning, use screen-space delta via panViewport
    if (controller.state.isDraggingBoard && lastScreenPointRef.current) {
      const dx = sp.screenX - lastScreenPointRef.current.screenX;
      const dy = sp.screenY - lastScreenPointRef.current.screenY;
      lastScreenPointRef.current = sp;
      controller.panViewport(dx, dy, width, height);
      forceUpdate({});
      return;
    }

    lastScreenPointRef.current = sp;
    const svgPoint = screenToSVG(sp.screenX, sp.screenY);
    controller.handleMouseMove(svgPoint);
    forceUpdate({});
  };

  /** Escape key clears selection */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && controller.state.selectedNodes.size > 0) {
        controller.clearSelection();
        controller.views.update();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [controller]);

  const handleMouseUp = () => {
    lastScreenPointRef.current = null;
    controller.handleMouseUp();
    forceUpdate({});
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Shift") controller.state.shiftKeyPressed = true;
      if (e.key === "Control") controller.state.ctrlKeyPressed = true;
      if (e.key === "Meta") controller.state.metaKeyPressed = true;
      const handled = controller.handleKeyDown(e.key, { shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey });
      if (handled) {
        e.preventDefault();
        forceUpdate({});
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") controller.state.shiftKeyPressed = false;
      if (e.key === "Control") controller.state.ctrlKeyPressed = false;
      if (e.key === "Meta") controller.state.metaKeyPressed = false;
      const handled = controller.handleKeyUp(e.key);
      if (handled) {
        e.preventDefault();
        forceUpdate({});
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [controller]);

  // Handle wheel zoom on the SVG element.
  // Must use native addEventListener with { passive: false } so that
  // preventDefault() works — React registers onWheel as passive.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const zoomDelta = e.deltaY < 0 ? 0.02 : -0.02;
      controller.zoomAt(screenX, screenY, zoomDelta, width, height);
      forceUpdate({});
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [controller, width, height]);

  const cursor =
    controller.state.mode === BoardMode.DRAW
      ? theme.cursorDraw
      : controller.state.mode === BoardMode.MOVE
        ? controller.state.isDraggingBoard || controller.state.draggingNode
          ? "grabbing"
          : theme.cursorMove
        : theme.cursorErase;

  const viewBox = controller.getViewBox();
  const zoomPercent = Math.round(controller.state.zoom * 100);

  // Resolve component overrides — use custom components if provided, otherwise defaults
  const NodeRenderer = components?.NodeRenderer ?? NodeViewComponent;
  const EdgeRenderer = components?.EdgeRenderer ?? EdgeViewComponent;
  const ControlPointRenderer = components?.ControlPoint ?? ControlPoint;
  const FutureEdgeRenderer = components?.FutureEdge ?? FutureEdge;

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={viewBox}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor, userSelect: "none" }}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={theme.backgroundColor} />
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={theme.gridColor} strokeWidth="0.5" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={theme.edgeStroke} />
          </marker>
          {/* Highlighted arrowhead for simulation — uses the traversed edge color */}
          <marker id="arrowhead-highlighted" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#2563eb" />
          </marker>
        </defs>

        {/* Background grid — covers the entire viewBox */}
        <rect
          x={controller.state.viewX - 1000}
          y={controller.state.viewY - 1000}
          width={controller.state.viewWidth + 2000}
          height={controller.state.viewHeight + 2000}
          fill="url(#grid)"
          opacity={controller.settings.grid ? 1 : 0}
          style={{ transition: "opacity 0.25s" }}
        />

        <g className="edges">
          {controller.views.edges.map((edgeView) => (
            <EdgeRenderer
              key={edgeView.models.items.map((e) => e.hashCode()).join(",")}
              edgeView={edgeView}
              controller={controller}
              onHoverChange={(hovering) => {
                controller.state.hoveringEdge = hovering ? edgeView : null;
              }}
            />
          ))}
        </g>

        <g className="nodes">
          {controller.views.nodes.map((nodeView) => (
            <NodeRenderer key={nodeView.model.hashCode()} nodeView={nodeView} controller={controller} />
          ))}
        </g>

        {controller.state.mode === BoardMode.MOVE && (
          <g className="control-points" style={{ opacity: 1, transition: "opacity 0.2s" }}>
            {controller.views.edges.map((edgeView) => (
              <ControlPointRenderer
                key={edgeView.models.items.map((e) => e.hashCode()).join(",") + "-control"}
                edgeView={edgeView}
                controller={controller}
                onHoverChange={(hovering) => {
                  controller.state.hoveringEdge = hovering ? edgeView : null;
                }}
              />
            ))}
          </g>
        )}

        {controller.state.futureEdge && <FutureEdgeRenderer futureEdge={controller.state.futureEdge} />}

        {/* Selection rectangle */}
        {controller.state.selectionRect && (
          <rect
            x={controller.state.selectionRect.x}
            y={controller.state.selectionRect.y}
            width={controller.state.selectionRect.width}
            height={controller.state.selectionRect.height}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth={1.5 / controller.state.zoom}
            strokeDasharray={`${4 / controller.state.zoom}`}
            style={{ pointerEvents: "none" }}
          />
        )}
      </svg>

      {/* Zoom indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 8,
          fontSize: "11px",
          color: "#999",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {zoomPercent}%
      </div>
    </div>
  );
}
