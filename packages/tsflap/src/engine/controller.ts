/* eslint-disable @typescript-eslint/restrict-plus-operands -- Although we should pick a single way of doing string concatination - I am personally in favor of what I am disabling lining for here now - will come back to this and override the eslint setting as I would prefer to proceed with this as the default */
import {
  BatchCommand,
  EraseNodeCommand,
  MarkFinalNodeCommand,
  MoveBoardCommand,
  ReindexNodeLabelsCommand,
  SetInitialNodeCommand,
  UnmarkFinalNodeCommand,
} from "./commands";
import { History } from "./history";
import type { IPoint } from "../core/point";
import { ImmutablePoint, MutablePoint } from "../core/point";
import type { Edge } from "../model/edge";
import type { IGraph } from "../model/graphs/abstract-graph";
import { FAGraph } from "../model/graphs/fa-graph";
import type { Node as ModelNode } from "../model/node";
import { BLANK, EPSILON } from "../model/symbols";
import type { Transition } from "../model/transitions";
import { SelectionManager } from "./managers/selection-manager";
import { ViewportManager } from "./managers/viewport-manager";
import type { IModeHandler } from "./mode-handlers";
import { DrawModeHandler, EraseModeHandler, MoveModeHandler } from "./mode-handlers";
import { BoardMode, BoardState, TransitionStyle, type BoardSettings, type SelectionRect } from "./state";
import { ViewRegistry } from "./view-registry";
import { EdgeView, EdgeViewPathMode } from "./views/edge-view";
import { NodeView } from "./views/node-view";
import { ViewCollection } from "./views/view-collection";

/**
 * Main controller for the automata designer
 */
export class Controller {
  public graph!: IGraph;
  public state!: BoardState;
  public settings: BoardSettings = {
    theme: "modern",
    transitionStyle: TransitionStyle.UPRIGHT,
    grid: true,
  };
  public views!: ViewCollection;
  public onBoardUpdateFn: (() => void) | null = null;

  /**
   * Callback invoked when the user requests to set a node as a call state.
   * The simulator page sets this to open the automaton picker modal.
   *
   * This is the bridge between the tsflap library (which doesn't know about
   * the Simulation workspace) and the UI layer (which manages the workspace).
   * The callback receives the node's NodeView and should present a picker
   * for the user to select which automaton to reference.
   *
   * @see CallStateConfig for the theoretical basis of call states
   */
  public onSetCallStateRequest: ((nodeView: NodeView) => void) | null = null;

  /**
   * Optional resolver that maps an automaton ID to its human-readable name.
   * Used by the NodeView to display the target automaton name on call states.
   * Set by the UI layer (simulator page) which has access to the Simulation workspace.
   */
  public getAutomatonName: ((automatonId: string) => string | undefined) | null = null;

  public history!: History;

  /** Manages viewport zoom/pan state. Extracted for SRP. */
  public viewport!: ViewportManager;

  /** Manages node selection state. Extracted for SRP. */
  public selection!: SelectionManager;

  /** Mode-specific interaction handlers (Strategy pattern). */
  private modeHandlers: Record<BoardMode, IModeHandler> = {
    [BoardMode.DRAW]: new DrawModeHandler(),
    [BoardMode.MOVE]: new MoveModeHandler(),
    [BoardMode.ERASE]: new EraseModeHandler(),
  };

  private platformIsApple: boolean =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-deprecated -- We aren't even fully functional with mobile support yet - will investigate this once we are
    typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent ?? navigator.platform ?? "");

  constructor(graph?: IGraph) {
    this.setNewGraph(graph ?? new FAGraph(false));
  }

  public setNewGraph(graph: IGraph) {
    this.graph = graph;
    this.state = new BoardState();
    this.views = new ViewCollection();
    this.views.onUpdate = () => {
      if (this.onBoardUpdateFn) {
        this.onBoardUpdateFn();
      }
    };
    this.history = new History();

    // Initialize managers
    this.viewport = new ViewportManager();
    this.viewport.onUpdate = () => this.views.update();

    this.selection = new SelectionManager();
    this.selection.onUpdate = () => this.views.update();

    // Hydrate views for any pre-existing nodes and edges in the graph
    this.hydrateViewsFromGraph();
  }

  /**
   * Creates NodeView and EdgeView objects for all nodes and edges
   * that already exist in the graph model but don't have views yet.
   * This is needed when a Controller is created with a pre-populated graph
   * (e.g., from conversion tools like NFA→DFA or cross product).
   */
  private hydrateViewsFromGraph(): void {
    const nodes = this.graph.getNodes().items;
    if (nodes.length === 0) return;

    // Create NodeViews for all existing nodes in a circle layout
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(centerX, centerY) - 50;
    const deltaAngle = (2 * Math.PI) / nodes.length;

    nodes.forEach((node: ModelNode, i: number) => {
      const angle = i * deltaAngle - Math.PI / 2;
      const x = Math.round(centerX + radius * Math.cos(angle));
      const y = Math.round(centerY + radius * Math.sin(angle));
      // Always create a new NodeView — any existing visualization is from a different controller
      const nodeView = new NodeView(node, new MutablePoint(x, y));
      this.views.addNode(nodeView);
    });

    // Create EdgeViews for all existing edges
    const edgeMap = new Map<string, EdgeView>();
    const edges = this.graph.getEdges().items;

    edges.forEach((edge: Edge) => {
      const key = `${edge.from.hashCode()}->${edge.to.hashCode()}`;
      let edgeView = edgeMap.get(key);

      if (!edgeView) {
        edgeView = new EdgeView(edge);
        edgeMap.set(key, edgeView);
        this.handleOppositeEdgeExpanding(edgeView);
        this.views.addEdge(edgeView);
      } else {
        edgeView.addEdgeModel(edge);
      }
    });
  }

  public reindexNodeNames() {
    const cmd = new ReindexNodeLabelsCommand(this);
    this.history.trackExecution(cmd);
  }

  public getNextNodeLabel(): string {
    const nodeIndexArray: boolean[] = [];

    this.views.nodes.forEach((node: NodeView) => {
      const curLabel = node.model.label;
      if (curLabel.startsWith("q")) {
        const value = parseInt(curLabel.substring(1));
        if (!isNaN(value)) {
          nodeIndexArray[value] = true;
        }
      }
    });

    const maxLength = nodeIndexArray.length;
    if (maxLength === 0) return "q0";

    for (let index = 0; index < maxLength; index++) {
      if (!nodeIndexArray[index]) {
        return "q" + index;
      }
    }

    return "q" + maxLength;
  }

  public setMode(mode: BoardMode): boolean {
    if (mode !== this.state.mode) {
      this.state.mode = mode;
      this.views.update();
      return true;
    }
    return false;
  }

  // ─── Selection ─────────────────────────────────────────────────────
  //
  // All selection operations delegate to the SelectionManager (SRP).
  // The BoardState selection fields are synced from the SelectionManager
  // after each operation, since the Canvas and other components read
  // `controller.state.selectedNodes` etc. directly.

  /**
   * Syncs BoardState selection fields from the SelectionManager.
   * Called after every selection operation to keep the state consistent.
   */
  private syncSelectionToState(): void {
    this.state.selectedNodes = this.selection.selectedNodes;
    this.state.selectionRect = this.selection.selectionRect;
    this.state.isSelecting = this.selection.isSelecting;
    this.state.selectionOrigin = this.selection.selectionOrigin;
  }

  /** Clear all selected nodes. Delegates to {@link SelectionManager.clear}. */
  public clearSelection() {
    this.selection.clear();
    this.syncSelectionToState();
  }

  /** Check if a node is currently selected. Delegates to {@link SelectionManager.isNodeSelected}. */
  public isNodeSelected(nodeV: NodeView): boolean {
    return this.selection.isNodeSelected(nodeV);
  }

  /** Toggle selection of a single node. Delegates to {@link SelectionManager.toggleNode}. */
  public toggleNodeSelection(nodeV: NodeView) {
    this.selection.toggleNode(nodeV);
    this.syncSelectionToState();
  }

  /** Select all nodes whose centers fall within the given rectangle. Delegates to {@link SelectionManager.selectNodesInRect}. */
  public selectNodesInRect(rect: SelectionRect) {
    this.selection.selectNodesInRect(rect, this.views.nodes);
    this.syncSelectionToState();
  }

  /** Start a selection rectangle at the given SVG point. Delegates to {@link SelectionManager.startSelection}. */
  public startSelection(point: IPoint) {
    this.selection.startSelection(point);
    this.syncSelectionToState();
  }

  /** Update the selection rectangle as the mouse moves. Delegates to {@link SelectionManager.updateSelection}. */
  public updateSelection(point: IPoint) {
    this.selection.updateSelection(point);
    this.syncSelectionToState();
  }

  /** Finish the selection rectangle and select nodes inside it. Delegates to {@link SelectionManager.finishSelection}. */
  public finishSelection() {
    this.selection.finishSelection(this.views.nodes);
    this.syncSelectionToState();
  }

  /** Erase all currently selected nodes as a single batch operation */
  public eraseSelectedNodes() {
    const nodesToErase = Array.from(this.state.selectedNodes).filter((nodeV) => this.views.nodes.includes(nodeV));
    if (nodesToErase.length === 0) {
      this.clearSelection();
      return;
    }

    // Build individual erase commands without executing them
    const commands: EraseNodeCommand[] = nodesToErase.map((nodeV) => new EraseNodeCommand(this, nodeV));

    // Wrap in a batch command and track as a single history entry
    const batch = new BatchCommand(commands);
    this.history.trackExecution(batch);
    this.clearSelection();
  }

  public setInitialNode(node: NodeView | null, trackHistory?: boolean) {
    const cmd = new SetInitialNodeCommand(this, node ? node.model : null);
    if (trackHistory) {
      this.history.trackExecution(cmd);
    } else {
      cmd.execute();
    }
  }

  public markFinalNode(node: NodeView | null, trackHistory?: boolean) {
    if (!node) return;
    const cmd = new MarkFinalNodeCommand(this, node.model);
    if (trackHistory) {
      this.history.trackExecution(cmd);
    } else {
      cmd.execute();
    }
  }

  public unmarkFinalNode(node: NodeView | null, trackHistory?: boolean) {
    if (!node) return;
    const cmd = new UnmarkFinalNodeCommand(this, node.model);
    if (trackHistory) {
      this.history.trackExecution(cmd);
    } else {
      cmd.execute();
    }
  }

  public addEdge(
    existingEdgeV: EdgeView | null,
    from: NodeView,
    to: NodeView,
    transition?: Transition,
    index?: number,
    pending?: boolean,
  ): EdgeView {
    const edge = this.graph.addEdge(from.model, to.model, transition ?? EPSILON, pending);
    const foundEdgeV = this.views.getEdgeViewByNodes(from.model, to.model);

    if (foundEdgeV) {
      foundEdgeV.addEdgeModel(edge, typeof index === "number" ? index : undefined);
      if (typeof index === "number") {
        foundEdgeV.reindexEdgeModels();
      }
      if (this.views.shouldAutoUpdateOnModify) {
        this.views.update();
      }
      return foundEdgeV;
    } else {
      let edgeV: EdgeView;
      if (existingEdgeV) {
        edgeV = existingEdgeV;
        edgeV.addEdgeModel(edge);
      } else {
        edgeV = new EdgeView(edge);
      }
      this.handleOppositeEdgeExpanding(edgeV);
      return this.views.addEdge(edgeV);
    }
  }

  public addEdgeVisualization(edgeV: EdgeView) {
    edgeV.models.items.forEach((edge: Edge) => {
      this.graph.addEdge(edge);
    });
    this.views.addEdge(edgeV);
  }

  public handleOppositeEdgeExpanding(edgeV: EdgeView) {
    const foundOppositeEdgeV = this.views.getEdgeViewByNodes(edgeV.toModel, edgeV.fromModel);
    if (foundOppositeEdgeV) {
      if (foundOppositeEdgeV.getDirection() === 1) {
        foundOppositeEdgeV.pathMode = EdgeViewPathMode.OPPOSING_A;
        edgeV.pathMode = EdgeViewPathMode.OPPOSING_B;
      } else {
        foundOppositeEdgeV.pathMode = EdgeViewPathMode.OPPOSING_B;
        edgeV.pathMode = EdgeViewPathMode.OPPOSING_A;
      }
      foundOppositeEdgeV.recalculatePath(foundOppositeEdgeV.hasMovedControlPoint() ? foundOppositeEdgeV.control : undefined);
      edgeV.recalculatePath(edgeV.hasMovedControlPoint() ? edgeV.control : undefined);
    }
  }

  private handleOpposingEdgeCollapsing(edgeV: EdgeView) {
    if (edgeV.pathMode === EdgeViewPathMode.OPPOSING_A || edgeV.pathMode === EdgeViewPathMode.OPPOSING_B) {
      const otherEdgeV = this.views.getEdgeViewByNodes(edgeV.toModel, edgeV.fromModel);
      if (otherEdgeV) {
        otherEdgeV.pathMode = EdgeViewPathMode.DEFAULT;
        otherEdgeV.recalculatePath(otherEdgeV.hasMovedControlPoint() ? otherEdgeV.control : undefined);
      }
    }
  }

  private teardownEdgeView(edgeV: EdgeView): void {
    if (edgeV.models.size > 0) {
      edgeV.models.items.forEach((edge: Edge) => this.graph.removeEdge(edge));
    }
    this.handleOpposingEdgeCollapsing(edgeV);
    this.views.removeEdge(edgeV);
  }

  public removeEdgeTransition(edgeV: EdgeView, edgeModel: Edge) {
    if (edgeV.models.size === 1) {
      this.removeEdge(edgeV);
      return;
    }
    edgeV.models.remove(edgeModel);
    this.graph.removeEdge(edgeModel);
    ViewRegistry.removeEdgeView(edgeModel);
    edgeV.reindexEdgeModels();
    this.views.update();
  }

  public removeEdge(edgeV: EdgeView) {
    this.teardownEdgeView(edgeV);
  }

  public removeNode(nodeV: NodeView) {
    const connectedEdgeViews = new Set<EdgeView>();
    [...nodeV.model.toEdges.items, ...nodeV.model.fromEdges.items].forEach((edgeModel: Edge) => {
      const edgeView = ViewRegistry.getEdgeView(edgeModel);
      if (edgeView) {
        connectedEdgeViews.add(edgeView);
      }
    });

    connectedEdgeViews.forEach((edgeView) => this.teardownEdgeView(edgeView));

    this.graph.removeNode(nodeV.model);
    this.views.removeNode(nodeV);
  }

  public removeNodeAndSaveSettings(nodeV: NodeView) {
    const saveInitial = nodeV.model.initial;
    const saveFinal = nodeV.model.final;
    this.removeNode(nodeV);
    nodeV.model.initial = saveInitial;
    nodeV.model.final = saveFinal;
  }

  public getBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Number.MAX_VALUE;
    let maxX = 0;
    let minY = Number.MAX_VALUE;
    let maxY = 0;

    this.views.nodes.forEach((node: NodeView) => {
      const posX = node.position.x;
      const posY = node.position.y;
      const radius = node.radius;
      let curMinX = posX - radius;
      const curMaxX = posX + radius;
      const curMinY = posY - radius;
      const curMaxY = posY + radius;
      if (node.model.final) {
        curMinX -= 20;
      }
      minX = Math.min(curMinX, minX);
      maxX = Math.max(curMaxX, maxX);
      minY = Math.min(curMinY, minY);
      maxY = Math.max(curMaxY, maxY);
    });

    this.views.edges.forEach((edge: EdgeView) => {
      const startPos = edge.start;
      const controlPos = edge.control;
      const endPos = edge.end;
      const curMinX = Math.min(startPos.x, controlPos.x, endPos.x);
      const curMaxX = Math.max(startPos.x, controlPos.x, endPos.x);
      const curMinY = Math.min(startPos.y, controlPos.y, endPos.y);
      const curMaxY = Math.max(startPos.y, controlPos.y, endPos.y);
      minX = Math.min(curMinX, minX);
      maxX = Math.max(curMaxX, maxX);
      minY = Math.min(curMinY, minY);
      maxY = Math.max(curMaxY, maxY);
    });

    return { minX, maxX, minY, maxY };
  }

  public toLaTeX(): string {
    let texData = "";
    const bounds = this.getBounds();
    const offsetPoint = new ImmutablePoint(bounds.minX, bounds.minY);

    this.views.nodes.forEach((node: NodeView) => {
      const pos = node.position.getMPoint().subtract(offsetPoint).round();
      texData += `    \\draw (${pos.x},${pos.y}) circle (${node.radius}); \n`;
      texData += `    \\draw (${pos.x},${pos.y}) node[nodeLabel] {$${node.model.label}$}; \n`;
      if (node.model.final) {
        texData += `    \\draw (${pos.x},${pos.y}) circle (${node.radius - 2}); \n`;
      }
      if (node.model.initial) {
        texData += `    \\draw (${pos.x - node.radius},${pos.y}) -- (${pos.x - node.radius - 20},${pos.y - 20}) -- (${pos.x - node.radius - 20},${pos.y + 20}) --  cycle;\n`;
      }
    });

    this.views.edges.forEach((edge: EdgeView) => {
      const startPos = edge.start.getMPoint().subtract(offsetPoint).round();
      const endPos = edge.end.getMPoint().subtract(offsetPoint).round();
      const controlPos = edge.control.getMPoint().subtract(offsetPoint).round();
      const cubicControlPos1 = new MutablePoint(
        (1 / 3) * startPos.x + (2 / 3) * controlPos.x,
        (1 / 3) * startPos.y + (2 / 3) * controlPos.y,
      ).round();
      const cubicControlPos2 = new MutablePoint(
        (2 / 3) * controlPos.x + (1 / 3) * endPos.x,
        (2 / 3) * controlPos.y + (1 / 3) * endPos.y,
      ).round();
      texData += `    \\draw [edge] (${startPos.x},${startPos.y}) .. controls(${cubicControlPos1.x},${cubicControlPos1.y}) and (${cubicControlPos2.x},${cubicControlPos2.y}) .. (${endPos.x},${endPos.y}); \n`;

      edge.models.items.forEach((edgeModel: Edge) => {
        const textPos = edge.getTransitionPoint(edgeModel.visualizationNumber).getMPoint().subtract(offsetPoint).round();
        let textContent = edgeModel.transition.toString();
        if (textContent === EPSILON) textContent = "\\lambda";
        else if (textContent === BLANK) textContent = "\\Box";
        texData += `    \\draw (${textPos.x}, ${textPos.y}) node[edgeTransition] {$${textContent}$}; \n`;
      });
    });

    return (
      "\\documentclass[12pt]{article}\n\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta}\n\n\\begin{document}\n\n\\begin{center}\n\\resizebox{\\columnwidth}{!}{\n    \\begin{tikzpicture}[y=-1, x = 1]\n    \\tikzstyle{nodeLabel}+=[inner sep=0pt, font=\\large]\n    \\tikzstyle{edge}+=[-{Latex[length=5, width=7]}]\n    \\tikzstyle{edgeTransition}+=[draw=white, fill=white, inner sep = 1] \n" +
      texData +
      "    \\end{tikzpicture}\n}\n\\end{center}\n\n\\end{document}\n"
    );
  }

  public editEdgeTransition(edge: Edge, onEditCallback?: (edge: Edge) => void) {
    if (onEditCallback) {
      onEditCallback(edge);
    }
  }

  public handleMouseDown(point: IPoint, button = 1) {
    if (button > 1) return;

    // Shift+click starts selection rectangle (in any mode, but not during active edge drawing)
    if (this.state.shiftKeyPressed && !this.state.futureEdgeFrom) {
      this.startSelection(point);
      return;
    }

    // Delegate to the active mode handler
    this.modeHandlers[this.state.mode].handleMouseDown(this, point, button);

    if (this.state.editableTextInputField !== null) {
      this.state.editableTextInputField.blur();
    }
  }

  public handleMouseMove(point: IPoint) {
    const mpoint = point.getMPoint();

    // Handle selection rectangle dragging
    if (this.state.isSelecting) {
      this.updateSelection(mpoint);
      this.views.update();
      return;
    }

    // Delegate to the active mode handler
    this.modeHandlers[this.state.mode].handleMouseMove(this, point);

    const snappedMousePoint = point.getMPoint();
    if (this.settings.grid) snappedMousePoint.round(20);
    this.state.lastMousePoint = snappedMousePoint;
  }

  public handleMouseUp() {
    // Finish selection rectangle if active
    if (this.state.isSelecting) {
      this.finishSelection();
      return;
    }

    // Delegate to the active mode handler
    this.modeHandlers[this.state.mode].handleMouseUp(this);
  }

  public handleKeyDown(key: string, modifiers: { shift: boolean; ctrl: boolean; meta: boolean }): boolean {
    if (this.state.futureEdgeFrom !== null) return false;

    const isModifier = this.platformIsApple ? modifiers.meta : modifiers.ctrl;

    switch (key) {
      case " ":
        if (this.state.mode !== BoardMode.MOVE) {
          this.state.quickMoveFrom = this.state.mode;
          this.state.mode = BoardMode.MOVE;
          // Auto-start board dragging so moving the mouse immediately pans
          this.state.isDraggingBoard = true;
          this.state.draggingCommand = new MoveBoardCommand(this);
          this.views.update();
        } else if (this.state.quickMoveFrom === null && !this.state.isDraggingBoard && !this.state.draggingNode) {
          // Already in move mode — allow space to start camera grip panning
          this.state.quickMoveFrom = BoardMode.MOVE; // mark so keyUp restores move mode
          this.state.isDraggingBoard = true;
          this.state.draggingCommand = new MoveBoardCommand(this);
          this.views.update();
        }
        return true;
      case "d":
      case "D":
        this.setMode(BoardMode.DRAW);
        return true;
      case "e":
      case "E":
        this.setMode(BoardMode.ERASE);
        return true;
      case "m":
      case "M":
        this.setMode(BoardMode.MOVE);
        return true;
      case "f":
      case "F":
        if (this.state.lastMousePoint) {
          const nearestNode = this.views.getNearestNode(this.state.lastMousePoint);
          if (nearestNode.node && nearestNode.hover) {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Could be the James Gosling in all of us - but chaining expressions with ternery operands is something I like to do
            nearestNode.node.model.final ? this.unmarkFinalNode(nearestNode.node, true) : this.markFinalNode(nearestNode.node, true);
          }
        }
        return true;
      case "i":
      case "I":
        if (this.state.lastMousePoint) {
          const nearestNode = this.views.getNearestNode(this.state.lastMousePoint);
          if (nearestNode.node && nearestNode.hover) {
            if (!nearestNode.node.model.initial) {
              this.setInitialNode(nearestNode.node, true);
            } else {
              this.setInitialNode(null, true);
            }
            this.views.update();
          }
        }
        return true;
      case "y":
      case "Y":
        if (isModifier) {
          this.history.redo();
          return true;
        }
        break;
      case "z":
      case "Z":
        if (isModifier) {
          if (modifiers.shift) {
            this.history.redo();
          } else {
            this.history.undo();
          }
          return true;
        }
        break;
    }

    return false;
  }

  // ─── Viewport (zoom/pan) ───────────────────────────────────────────
  //
  // All viewport operations delegate to the ViewportManager (SRP).
  // The BoardState viewport fields are synced from the ViewportManager
  // after each operation, since the Canvas reads them directly.

  /**
   * Syncs BoardState viewport fields from the ViewportManager.
   * Called after every viewport operation to keep the state consistent
   * for the Canvas component which reads `controller.state.*` directly.
   */
  private syncViewportToState(): void {
    this.state.viewX = this.viewport.viewX;
    this.state.viewY = this.viewport.viewY;
    this.state.viewWidth = this.viewport.viewWidth;
    this.state.viewHeight = this.viewport.viewHeight;
    this.state.zoom = this.viewport.zoom;
  }

  /**
   * Initialize the viewport dimensions (call when canvas size is known).
   * Delegates to {@link ViewportManager.init}.
   */
  public initViewport(canvasWidth: number, canvasHeight: number) {
    this.viewport.init(canvasWidth, canvasHeight);
    this.syncViewportToState();
  }

  /**
   * Convert screen coordinates (relative to SVG element) to SVG coordinate space.
   * Delegates to {@link ViewportManager.screenToSVG}.
   */
  public screenToSVG(screenX: number, screenY: number, canvasWidth: number, canvasHeight: number): MutablePoint {
    return this.viewport.screenToSVG(screenX, screenY, canvasWidth, canvasHeight);
  }

  /**
   * Pan the viewport by a screen-space delta.
   * Delegates to {@link ViewportManager.pan}.
   */
  public panViewport(screenDeltaX: number, screenDeltaY: number, canvasWidth: number, canvasHeight: number) {
    this.viewport.pan(screenDeltaX, screenDeltaY, canvasWidth, canvasHeight);
    this.syncViewportToState();
  }

  /**
   * Zoom the viewport centered on a screen point.
   * Delegates to {@link ViewportManager.zoomAt}.
   */
  public zoomAt(screenX: number, screenY: number, zoomDelta: number, canvasWidth: number, canvasHeight: number) {
    this.viewport.zoomAt(screenX, screenY, zoomDelta, canvasWidth, canvasHeight);
    this.syncViewportToState();
  }

  /**
   * Reset the viewport to the default view (origin, 100% zoom).
   * Delegates to {@link ViewportManager.reset}.
   */
  public resetView(canvasWidth: number, canvasHeight: number) {
    this.viewport.reset(canvasWidth, canvasHeight);
    this.syncViewportToState();
  }

  /**
   * Fit the viewport to show all nodes with padding.
   * Delegates to {@link ViewportManager.zoomToFit}.
   */
  public zoomToFit(canvasWidth: number, canvasHeight: number, padding = 50) {
    if (this.views.nodes.length === 0) {
      this.resetView(canvasWidth, canvasHeight);
      return;
    }

    const bounds = this.getBounds();
    this.viewport.zoomToFit(bounds, canvasWidth, canvasHeight, padding);
    this.syncViewportToState();
  }

  /**
   * Get the current viewBox string for the SVG element.
   * Delegates to {@link ViewportManager.getViewBox}.
   */
  public getViewBox(): string {
    return this.viewport.getViewBox();
  }

  public handleKeyUp(key: string): boolean {
    if (key === " " && this.state.mode === BoardMode.MOVE && this.state.quickMoveFrom !== null) {
      this.state.draggingNode = null;
      this.state.modifyEdgeControl = null;
      this.state.isDraggingBoard = false;
      // If quickMoveFrom is MOVE, we were already in move mode — stay in move mode
      const restoreMode = this.state.quickMoveFrom === BoardMode.MOVE ? BoardMode.MOVE : this.state.quickMoveFrom;
      this.state.mode = restoreMode;
      this.state.quickMoveFrom = null;
      this.views.update();
      return true;
    }
    return false;
  }
}
