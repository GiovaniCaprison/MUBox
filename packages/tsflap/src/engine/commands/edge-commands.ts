/* eslint-disable @typescript-eslint/no-non-null-assertion -- I think I will try and remove eslint disable comments from TSFlap - not now - but some day - the majority are just from poor type interfaces which came from the speed at which I had to develop this */
import type { Edge } from "../../model/edge";
import type { IGraph } from "../../model/graphs/abstract-graph";
import type { Transition } from "../../model/transitions";
import type { Controller } from "../controller";
import { ViewRegistry } from "../view-registry";
import type { ICommand } from "./types";
import type { EdgeView } from "../views/edge-view";
import type { NodeView } from "../views/node-view";

/**
 * Command to erase an edge
 */
export class EraseEdgeCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private edgeV: EdgeView;

  constructor(board: Controller, edgeV: EdgeView) {
    this.board = board;
    this.graph = board.graph;
    this.edgeV = edgeV;
  }

  execute(): void {
    this.board.removeEdge(this.edgeV);
  }

  undo(): void {
    const from = this.edgeV.fromModel;
    const to = this.edgeV.toModel;

    this.edgeV.models.items.forEach((edge: Edge) => {
      this.graph.addEdge(edge);
      edge.addNodes();
    });

    this.edgeV.reindexEdgeModels();
    this.board.handleOppositeEdgeExpanding(this.edgeV);
    this.board.views.addEdge(this.edgeV);
    this.edgeV.toModel = to;
    this.edgeV.fromModel = from;
  }
}

/**
 * Command to erase a specific transition from an edge
 */
export class EraseEdgeTransitionCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private edge: Edge;
  private edgeV!: EdgeView;
  private edgeT!: Transition;
  private fromNodeV!: NodeView;
  private toNodeV!: NodeView;
  private edgeIndex!: number;

  constructor(board: Controller, edge: Edge) {
    this.board = board;
    this.graph = board.graph;
    this.edge = edge;
  }

  execute(): void {
    this.edgeV = ViewRegistry.getEdgeView(this.edge)!;
    this.edgeT = this.edge.transition;
    this.fromNodeV = ViewRegistry.getNodeView(this.edgeV.fromModel)!;
    this.toNodeV = ViewRegistry.getNodeView(this.edgeV.toModel)!;
    this.edgeIndex = this.edgeV.models.items.indexOf(this.edge);

    this.board.removeEdgeTransition(ViewRegistry.getEdgeView(this.edge)!, this.edge);
  }

  undo(): void {
    this.board.addEdge(this.edgeV, this.fromNodeV, this.toNodeV, this.edgeT, this.edgeIndex);
  }
}

/**
 * Command to edit a transition on an edge
 */
export class EditEdgeTransitionCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private edge: Edge;
  private transitionTo: Transition;
  private transitionFrom: Transition;

  constructor(board: Controller, edge: Edge, transitionTo: Transition, transitionFrom: Transition) {
    this.board = board;
    this.graph = board.graph;
    this.edge = edge;
    this.transitionTo = transitionTo;
    this.transitionFrom = transitionFrom;
  }

  execute(): void {
    const results = ViewRegistry.getEdgeView(this.edge)!.models.items.filter((edge: Edge) => edge.transition === this.transitionFrom);
    if (results.length > 0) {
      results[0].transition = this.transitionTo;
    }
    this.board.state.editableTextInputField = null;
    this.board.views.update();
    if (typeof this.board.onBoardUpdateFn === "function") {
      this.board.onBoardUpdateFn();
    }
  }

  undo(): void {
    const results = ViewRegistry.getEdgeView(this.edge)!.models.items.filter((edge: Edge) => edge.transition === this.transitionTo);
    if (results.length > 0) {
      results[0].transition = this.transitionFrom;
    }
    this.board.state.editableTextInputField = null;
    this.board.views.update();
    if (typeof this.board.onBoardUpdateFn === "function") {
      this.board.onBoardUpdateFn();
    }
  }
}
