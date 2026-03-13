// eslint-disable-next-line @typescript-eslint/naming-convention -- grrrr I don't like that React is React it should be react make it happen!
import type React from "react";

import type { Controller } from "../engine/controller";
import type { EdgeView } from "../engine/views/edge-view";
import type { FutureEdgeView } from "../engine/views/future-edge-view";
import type { NodeView } from "../engine/views/node-view";
import type { Edge } from "../model/edge";

/**
 * The type of automaton graph.
 */
export type GraphType = "FA" | "TM" | "PDA";

// ─── Component Override Interfaces ───────────────────────────────────
//
// These interfaces define the props that custom renderer components receive.
// Consumers can provide their own React components for any visual element
// by passing them via the `components` prop on `<Canvas>`.
//
// Each interface provides all the data needed to render the element,
// plus the controller for interaction handling.

/**
 * Props for a custom node renderer component.
 * Replaces the default circle/rectangle rendering of automaton states.
 */
export interface NodeRendererProps {
  /** The view model containing position, radius, and model reference */
  nodeView: NodeView;
  /** The controller for handling interactions (click, context menu, etc.) */
  controller: Controller;
}

/**
 * Props for a custom edge renderer component.
 * Replaces the default quadratic bezier curve rendering of transitions.
 */
export interface EdgeRendererProps {
  /** The view model containing path data and edge models */
  edgeView: EdgeView;
  /** The controller for handling interactions */
  controller: Controller;
  /** Callback to notify the canvas when the edge is hovered */
  onHoverChange: (hovering: boolean) => void;
}

/**
 * Props for a custom transition label renderer component.
 * Replaces the default text label on edges.
 */
export interface TransitionLabelProps {
  /** The edge model this label belongs to */
  edge: Edge;
  /** The edge view for position calculation */
  edgeView: EdgeView;
  /** The controller for handling interactions */
  controller: Controller;
}

/**
 * Props for a custom control point renderer component.
 * Control points appear on edges in Move mode for adjusting curve shape.
 */
export interface ControlPointRendererProps {
  /** The edge view this control point belongs to */
  edgeView: EdgeView;
  /** The controller for handling interactions */
  controller: Controller;
  /** Callback to notify the canvas when the control point is hovered */
  onHoverChange: (hovering: boolean) => void;
}

/**
 * Props for a custom final state circle renderer.
 * The inner circle that indicates a state is accepting/final.
 */
export interface FinalCircleRendererProps {
  /** The node view to render the final circle for */
  nodeView: NodeView;
}

/**
 * Props for a custom initial state arrow renderer.
 * The arrow pointing to the initial/start state.
 */
export interface InitialArrowRendererProps {
  /** The node view to render the initial arrow for */
  nodeView: NodeView;
}

/**
 * Props for a custom future edge renderer.
 * The line shown while the user is drawing a new edge.
 */
export interface FutureEdgeRendererProps {
  /** The future edge view model with start/end points */
  futureEdge: FutureEdgeView;
}

/**
 * Props for a custom context menu renderer.
 * The right-click menu for nodes and edges.
 */
export interface ContextMenuRendererProps {
  /** The controller (contains menu options and position in state) */
  controller: Controller;
  /** Reference to the container element for position calculation */
  containerRef: React.RefObject<HTMLElement | SVGElement | null>;
}

/**
 * Component overrides that can be passed to the Canvas.
 *
 * Each property is an optional React component that replaces the default
 * renderer for that visual element. This enables consumers to completely
 * customize the look and feel of the automata designer while keeping
 * all the interaction logic intact.
 *
 * @example
 * ```tsx
 * <Canvas
 *   controller={controller}
 *   components={{
 *     NodeRenderer: MyCustomNode,
 *     ContextMenu: MyStyledContextMenu,
 *   }}
 * />
 * ```
 */
export interface CanvasComponentOverrides {
  /** Custom node renderer (replaces circle/rectangle states) */
  NodeRenderer?: React.ComponentType<NodeRendererProps>;
  /** Custom edge renderer (replaces bezier curve transitions) */
  EdgeRenderer?: React.ComponentType<EdgeRendererProps>;
  /** Custom transition label renderer */
  TransitionLabel?: React.ComponentType<TransitionLabelProps>;
  /** Custom control point renderer (Move mode edge handles) */
  ControlPoint?: React.ComponentType<ControlPointRendererProps>;
  /** Custom final state indicator */
  FinalCircle?: React.ComponentType<FinalCircleRendererProps>;
  /** Custom initial state arrow */
  InitialArrow?: React.ComponentType<InitialArrowRendererProps>;
  /** Custom future edge renderer (drawing preview) */
  FutureEdge?: React.ComponentType<FutureEdgeRendererProps>;
  /** Custom context menu renderer */
  ContextMenu?: React.ComponentType<ContextMenuRendererProps>;
}
