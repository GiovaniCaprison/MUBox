/* eslint-disable @typescript-eslint/no-non-null-assertion -- We have been here before */
import type { IPoint } from "../../core/point";
import type { Edge } from "../../model/edge";
import type { IGraph } from "../../model/graphs/abstract-graph";
import { Node as ModelNode, type Node } from "../../model/node";
import type { Controller } from "../controller";
import { ViewRegistry } from "../view-registry";
import type { ICommand } from "./types";
import type { EdgeView } from "../views/edge-view";
import { NodeView } from "../views/node-view";

/**
 * Command to add a node at a specific point
 */
export class AddNodeAtPointCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private point: IPoint;
  private nodeV: NodeView;
  private node: Node;

  constructor(board: Controller, point: IPoint) {
    this.board = board;
    this.graph = board.graph;
    this.point = point;
    this.node = new ModelNode(board.getNextNodeLabel(), {
      initial: board.views.nodes.length === 0,
    });
    this.nodeV = new NodeView(this.node, point.getMPoint());
  }

  execute(): void {
    this.graph.addNode(this.node);
    this.board.views.addNode(this.nodeV);
  }

  undo(): void {
    this.graph.removeNode(this.node);
    this.board.views.removeNode(this.nodeV);
  }

  getNodeV(): NodeView {
    return this.nodeV;
  }

  getNode(): Node {
    return this.node;
  }
}

/**
 * Command to add an edge from one node to another (or create new node)
 */
export class AddEdgeFromNodeCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private startNodeV: NodeView;
  private endNodeV: NodeView;
  private endNode: Node;
  private neededToCreateNode: boolean;
  private edge!: Edge;
  private edgeIndex!: number;
  private edgeV!: EdgeView;
  private firstTime = true;

  constructor(board: Controller, startNodeV: NodeView, endingPoint: IPoint) {
    this.board = board;
    this.graph = board.graph;
    this.startNodeV = startNodeV;

    const nearestNode = board.views.getNearestNode(endingPoint);

    if (nearestNode.node && nearestNode.distance < 40) {
      this.endNodeV = nearestNode.node;
      this.endNode = nearestNode.node.model;
      this.neededToCreateNode = false;
    } else {
      this.endNode = new ModelNode(board.getNextNodeLabel());
      this.endNodeV = new NodeView(this.endNode, endingPoint.getMPoint());
      this.neededToCreateNode = true;
    }
  }

  execute(): void {
    if (this.neededToCreateNode) {
      this.graph.addNode(this.endNode);
      this.board.views.addNode(this.endNodeV);
    }

    this.edgeV = this.board.addEdge(
      this.edgeV,
      this.startNodeV,
      this.endNodeV,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      this.edge ? this.edge.transition : undefined,
      undefined,
      true,
    );
    this.firstTime = false;

    if (!this.edgeIndex) {
      this.edgeIndex = this.edgeV.models.items.length - 1;
      this.edge = this.edgeV.models.items[this.edgeIndex];
    }
  }

  undo(): void {
    this.board.removeEdgeTransition(this.edgeV, this.edge);

    if (this.neededToCreateNode) {
      this.board.removeNodeAndSaveSettings(this.endNodeV);
    }
  }

  getEndNodeV(): NodeView {
    return this.endNodeV;
  }

  getEdge(): Edge {
    return this.edge;
  }
}

/**
 * Command to erase a node (and all connected edges)
 */
export class EraseNodeCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private nodeV: NodeView;
  private node: Node;
  private fromEdges!: Edge[];
  private toEdges!: Edge[];

  constructor(board: Controller, nodeV: NodeView) {
    this.board = board;
    this.graph = board.graph;
    this.nodeV = nodeV;
    this.node = nodeV.model;
  }

  execute(): void {
    this.fromEdges = this.node.fromEdges.items.slice(0);
    this.toEdges = this.node.toEdges.items.slice(0);
    this.board.removeNode(this.nodeV);
  }

  undo(): void {
    this.board.views.shouldAutoUpdateOnModify = false;
    this.graph.addNode(this.node);
    this.board.views.addNode(this.nodeV);

    const updateFn = (edge: Edge) => {
      this.board.addEdge(
        ViewRegistry.getEdgeView(edge)!,
        ViewRegistry.getNodeView(edge.from)!,
        ViewRegistry.getNodeView(edge.to)!,
        edge.transition,
        edge.visualizationNumber,
      );
      ViewRegistry.getEdgeView(edge)!.reindexEdgeModels();
    };

    this.fromEdges.forEach(updateFn);
    this.toEdges.forEach(updateFn);
    this.nodeV.model = this.node;

    this.board.views.update();
    this.board.views.shouldAutoUpdateOnModify = true;
  }

  getNode(): Node {
    return this.node;
  }
}

/**
 * Command to set a node as the initial node
 */
export class SetInitialNodeCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private setInitialNode: Node | null;
  private prevInitialNode: Node | null;

  constructor(board: Controller, setInitialNode: Node | null) {
    this.board = board;
    this.graph = board.graph;
    this.setInitialNode = setInitialNode;
    this.prevInitialNode = this.graph.getInitialNode();
  }

  execute(): void {
    this.graph.setInitialNode(this.setInitialNode);
    this.board.views.update();
  }

  undo(): void {
    this.graph.setInitialNode(this.prevInitialNode);
    this.board.views.update();
  }
}

/**
 * Command to mark a node as final
 */
export class MarkFinalNodeCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private node: Node;

  constructor(board: Controller, node: Node) {
    this.board = board;
    this.graph = board.graph;
    this.node = node;
  }

  execute(): void {
    this.graph.markFinalNode(this.node);
    this.board.views.update();
  }

  undo(): void {
    this.graph.unmarkFinalNode(this.node);
    this.board.views.update();
  }
}

/**
 * Command to unmark a node as final
 */
export class UnmarkFinalNodeCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private node: Node;

  constructor(board: Controller, node: Node) {
    this.board = board;
    this.graph = board.graph;
    this.node = node;
  }

  execute(): void {
    this.graph.unmarkFinalNode(this.node);
    this.board.views.update();
  }

  undo(): void {
    this.graph.markFinalNode(this.node);
    this.board.views.update();
  }
}

/**
 * Command to relabel a node
 */
export class RelabelNodeCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private node: Node;
  private newName: string;
  private oldName: string;

  constructor(board: Controller, node: Node, newName: string) {
    this.board = board;
    this.graph = board.graph;
    this.node = node;
    this.oldName = node.label;
    this.newName = newName;
  }

  execute(): void {
    this.node.label = this.newName;
    this.board.views.update();
  }

  undo(): void {
    this.node.label = this.oldName;
    this.board.views.update();
  }
}

/**
 * Command to re-index all node labels (q0, q1, q2, ...)
 */
export class ReindexNodeLabelsCommand implements ICommand {
  private board: Controller;
  private graph: IGraph;
  private nodeLabelStateStart: { model: Node; label: string }[];
  private nodes: Node[];

  constructor(board: Controller) {
    this.board = board;
    this.graph = board.graph;
    this.nodes = this.graph.getNodes().items;
    this.nodeLabelStateStart = this.nodes.map((node) => ({ model: node, label: node.label }));
  }

  execute(): void {
    this.nodes.forEach((node: Node, index: number) => {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- Have a day off?
      node.label = "q" + index;
    });
    this.board.views.update();
  }

  undo(): void {
    this.nodeLabelStateStart.forEach((state) => {
      state.model.label = state.label;
    });
    this.board.views.update();
  }
}
