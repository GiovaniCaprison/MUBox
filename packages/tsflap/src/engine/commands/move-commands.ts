import type { ICommand } from "./types";
import type { MutablePoint } from "../../core/point";
import type { IGraph } from "../../model/graphs/abstract-graph";
import type { Controller } from "../controller";
import { ViewRegistry } from "../view-registry";
import type { EdgeView } from "../views/edge-view";
import type { NodeView } from "../views/node-view";

interface EdgeViewPositionState {
  visualization: EdgeView;
  start: MutablePoint;
  end: MutablePoint;
  control: MutablePoint;
}

interface NodeViewPositionState {
  visualization: NodeView;
  position: MutablePoint;
}

interface EdgeViewControlPositionState {
  visualization: EdgeView;
  hasMovedControl: boolean;
  control: MutablePoint;
  start: MutablePoint;
  end: MutablePoint;
}

/**
 * Command to move a node
 */
export class MoveNodeCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private nodeV: NodeView;
  private nodeStartPosition: MutablePoint;
  private nodeEndPosition!: MutablePoint;
  private firstTime = true;
  private edgeViewStartPositions: EdgeViewPositionState[];
  private edgeViewEndPositions!: EdgeViewPositionState[];
  private relatedEdges: EdgeView[];

  constructor(board: Controller, nodeV: NodeView) {
    this.board = board;
    this.graph = board.graph;
    this.nodeV = nodeV;
    this.nodeStartPosition = nodeV.position.getMPoint();
    this.relatedEdges = this.getRelatedEdges();
    this.edgeViewStartPositions = this.makeEdgeViewPositionStates(this.relatedEdges);
  }

  private getRelatedEdges(): EdgeView[] {
    return this.board.views.edges.filter(
      (edgeV: EdgeView) =>
        ViewRegistry.getNodeView(edgeV.fromModel) === this.nodeV || ViewRegistry.getNodeView(edgeV.toModel) === this.nodeV,
    );
  }

  private makeEdgeViewPositionStates(edgeViews: EdgeView[]): EdgeViewPositionState[] {
    return edgeViews.map((edgeV: EdgeView) => ({
      visualization: edgeV,
      start: edgeV.start.getMPoint(),
      end: edgeV.end.getMPoint(),
      control: edgeV.control.getMPoint(),
    }));
  }

  private applyEdgeViewPositionStates(states: EdgeViewPositionState[]) {
    states.forEach((eps: EdgeViewPositionState) => {
      eps.visualization.start = eps.start.getMPoint();
      eps.visualization.end = eps.end.getMPoint();
      eps.visualization.setControlDirectly(eps.control.getMPoint());
    });
  }

  execute(): void {
    if (this.firstTime) {
      this.nodeEndPosition = this.nodeV.position.getMPoint();
      this.edgeViewEndPositions = this.makeEdgeViewPositionStates(this.relatedEdges);
      this.firstTime = false;
      return;
    }

    this.nodeV.position = this.nodeEndPosition.getMPoint();
    this.applyEdgeViewPositionStates(this.edgeViewEndPositions);
    this.board.views.shouldForceUpdateAnimation = true;
    this.board.views.update();
    this.board.views.shouldForceUpdateAnimation = false;
  }

  undo(): void {
    this.nodeV.position = this.nodeStartPosition.getMPoint();
    this.applyEdgeViewPositionStates(this.edgeViewStartPositions);
    this.board.views.shouldForceUpdateAnimation = true;
    this.board.views.update();
    this.board.views.shouldForceUpdateAnimation = false;
  }
}

/**
 * Command to move an edge control point
 */
export class MoveEdgeControlCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private edgeV: EdgeView;
  private firstTime = true;
  private edgeViewControlStartPosition: EdgeViewControlPositionState;
  private edgeViewControlEndPosition!: EdgeViewControlPositionState;

  constructor(board: Controller, edgeV: EdgeView) {
    this.board = board;
    this.graph = board.graph;
    this.edgeV = edgeV;
    this.edgeViewControlStartPosition = this.makeEdgeViewControlPositionState(this.edgeV);
  }

  private makeEdgeViewControlPositionState(edgeV: EdgeView): EdgeViewControlPositionState {
    return {
      visualization: edgeV,
      hasMovedControl: edgeV.hasMovedControlPoint(),
      control: edgeV.control.getMPoint(),
      start: edgeV.start.getMPoint(),
      end: edgeV.end.getMPoint(),
    };
  }

  private applyEdgeViewControlPositionState(eps: EdgeViewControlPositionState) {
    eps.visualization.setHasMovedControlPointDirectly(eps.hasMovedControl);
    eps.visualization.start = eps.start.getMPoint();
    eps.visualization.end = eps.end.getMPoint();
    eps.visualization.setControlDirectly(eps.control.getMPoint());
  }

  execute(): void {
    if (this.firstTime) {
      this.edgeViewControlEndPosition = this.makeEdgeViewControlPositionState(this.edgeV);
      this.firstTime = false;
      return;
    }

    this.applyEdgeViewControlPositionState(this.edgeViewControlEndPosition);
    this.board.views.shouldForceUpdateAnimation = true;
    this.board.views.update();
    this.board.views.shouldForceUpdateAnimation = false;
  }

  undo(): void {
    this.applyEdgeViewControlPositionState(this.edgeViewControlStartPosition);
    this.board.views.shouldForceUpdateAnimation = true;
    this.board.views.update();
    this.board.views.shouldForceUpdateAnimation = false;
  }
}

/**
 * Command to move the entire board
 */
export class MoveBoardCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private nodeStartPositions: NodeViewPositionState[];
  private nodeEndPositions!: NodeViewPositionState[];
  private firstTime = true;
  private edgeViewStartPositions: EdgeViewPositionState[];
  private edgeViewEndPositions!: EdgeViewPositionState[];
  private nodes: NodeView[];
  private edges: EdgeView[];

  constructor(board: Controller) {
    this.board = board;
    this.graph = board.graph;
    this.nodes = this.board.views.nodes;
    this.edges = this.board.views.edges;
    this.nodeStartPositions = this.makeNodeViewPositionStates(this.nodes);
    this.edgeViewStartPositions = this.makeEdgeViewPositionStates(this.edges);
  }

  private makeNodeViewPositionStates(nodeViews: NodeView[]): NodeViewPositionState[] {
    return nodeViews.map((nodeV: NodeView) => ({
      visualization: nodeV,
      position: nodeV.position.getMPoint(),
    }));
  }

  private applyNodeViewPositionStates(states: NodeViewPositionState[]) {
    states.forEach((eps: NodeViewPositionState) => {
      eps.visualization.position = eps.position.getMPoint();
    });
  }

  private makeEdgeViewPositionStates(edgeViews: EdgeView[]): EdgeViewPositionState[] {
    return edgeViews.map((edgeV: EdgeView) => ({
      visualization: edgeV,
      start: edgeV.start.getMPoint(),
      end: edgeV.end.getMPoint(),
      control: edgeV.control.getMPoint(),
    }));
  }

  private applyEdgeViewPositionStates(states: EdgeViewPositionState[]) {
    states.forEach((eps: EdgeViewPositionState) => {
      eps.visualization.start = eps.start.getMPoint();
      eps.visualization.end = eps.end.getMPoint();
      eps.visualization.setControlDirectly(eps.control.getMPoint());
    });
  }

  execute(): void {
    if (this.firstTime) {
      this.nodeEndPositions = this.makeNodeViewPositionStates(this.nodes);
      this.edgeViewEndPositions = this.makeEdgeViewPositionStates(this.edges);
      this.firstTime = false;
      return;
    }

    this.applyNodeViewPositionStates(this.nodeEndPositions);
    this.applyEdgeViewPositionStates(this.edgeViewEndPositions);
    this.board.views.shouldForceUpdateAnimation = true;
    this.board.views.update();
    this.board.views.shouldForceUpdateAnimation = false;
  }

  undo(): void {
    this.applyNodeViewPositionStates(this.nodeStartPositions);
    this.applyEdgeViewPositionStates(this.edgeViewStartPositions);
    this.board.views.shouldForceUpdateAnimation = true;
    this.board.views.update();
    this.board.views.shouldForceUpdateAnimation = false;
  }
}
