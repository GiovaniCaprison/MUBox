import { BoardMode } from "./enums";
import type { ContextMenuOption, SelectionRect } from "./types";
import type { IPoint } from "../../core/point";
import type { Edge } from "../../model/edge";
import type { Node } from "../../model/node";
import type { ICommand } from "../commands/types";
import type { EdgeView } from "../views/edge-view";
import type { FutureEdgeView } from "../views/future-edge-view";
import type { NodeView } from "../views/node-view";

/**
 * Tracks the current state of the board during user interaction.
 *
 * This is a mutable state container that the Controller, mode handlers,
 * and React components read and write during interaction. It captures
 * all transient UI state: which node is being dragged, whether the user
 * is erasing, the current selection rectangle, simulation highlights, etc.
 */
export class BoardState {
  public mode: BoardMode = BoardMode.DRAW;
  public futureEdge: FutureEdgeView | null = null;
  public futureEdgeFrom: NodeView | null = null;
  public futureEdgeFromValid = false;
  public futureEdgeFromCreated = false;
  public shiftKeyPressed = false;
  public ctrlKeyPressed = false;
  public metaKeyPressed = false;
  public draggingNode: NodeView | null = null;
  public isErasing = false;
  public hoveringEdge: EdgeView | null = null;
  public hoveringTransition: Edge | null = null;
  public isDraggingBoard = false;
  public quickMoveFrom: BoardMode | null = null;
  public editableTextInputField: HTMLInputElement | null = null;
  public modifyEdgeControl: EdgeView | null = null;
  public contextMenuOptions: ContextMenuOption[] | null = null;
  public contextMenuPosition: { x: number; y: number } | null = null;
  public lastMousePoint: IPoint | null = null;
  public draggingCommand: ICommand | null = null;
  /** Flag set when an edge was just completed (prevents self-loop click from opening node editor) */
  public _edgeJustCompleted = false;

  // ─── Selection ─────────────────────────────────────────────────────
  /** Set of currently selected node views */
  public selectedNodes = new Set<NodeView>();
  /** The selection rectangle being drawn (SVG coords), null when not selecting */
  public selectionRect: SelectionRect | null = null;
  /** Whether the user is currently drawing a selection rectangle */
  public isSelecting = false;
  /** The SVG-space origin point where the selection drag started */
  public selectionOrigin: IPoint | null = null;

  // ─── Simulation Highlights ─────────────────────────────────────────
  /** Nodes highlighted during step simulation (node → color) */
  public highlightedNodes = new Map<Node, string>();
  /** Edges highlighted during step simulation (edge → color) */
  public highlightedEdges = new Map<Edge, string>();
  /** Whether a step simulation is currently active */
  public simulationActive = false;

  // ─── Viewport (zoom/pan) ───────────────────────────────────────────
  /** The X origin of the viewport in SVG coordinate space */
  public viewX = 0;
  /** The Y origin of the viewport in SVG coordinate space */
  public viewY = 0;
  /** The width of the viewport in SVG coordinate space (changes with zoom) */
  public viewWidth = 800;
  /** The height of the viewport in SVG coordinate space (changes with zoom) */
  public viewHeight = 600;
  /** Current zoom level (1.0 = 100%) */
  public zoom = 1.0;
  /** Minimum zoom level */
  public readonly minZoom: number = 0.2;
  /** Maximum zoom level */
  public readonly maxZoom: number = 5.0;
}
