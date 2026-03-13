import { EdgeView } from "./edge-view";
import { NodeView } from "./node-view";
import type { IPoint } from "../../core/point";
import type { Edge } from "../../model/edge";
import type { Node } from "../../model/node";
import { ViewRegistry } from "../view-registry";

export interface NearestNode {
  node: NodeView | null;
  distance: number;
  hover: boolean;
}

/**
 * Manages all node and edge views
 */
export class ViewCollection {
  public nodes: NodeView[];
  public edges: EdgeView[];
  public shouldAutoUpdateOnModify = true;
  public shouldForceUpdateAnimation = false;
  public shouldForceStandardAnimation = false;
  public onUpdate: (() => void) | null = null;

  constructor() {
    this.nodes = [];
    this.edges = [];
  }

  public update() {
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  public addNode(node: NodeView): NodeView {
    this.nodes.push(node);
    if (this.shouldAutoUpdateOnModify) {
      this.update();
    }
    return node;
  }

  public addEdge(edge: EdgeView): EdgeView {
    this.edges.push(edge);
    if (this.shouldAutoUpdateOnModify) {
      this.update();
    }
    return edge;
  }

  getNearestNode(point: IPoint): NearestNode {
    const nearestNode: NearestNode = {
      node: null,
      distance: Infinity,
      hover: false,
    };

    this.nodes.forEach((node) => {
      const distance = point.getDistanceTo(node.position);
      if (distance < nearestNode.distance) {
        nearestNode.node = node;
        nearestNode.distance = distance;
        nearestNode.hover = nearestNode.distance <= node.radius;
      }
    });

    return nearestNode;
  }

  removeNode(node: NodeView): boolean {
    const nodeIndex = this.nodes.indexOf(node);
    if (nodeIndex === -1) return false;
    this.nodes.splice(nodeIndex, 1);
    if (this.shouldAutoUpdateOnModify) {
      this.update();
    }
    return true;
  }

  removeEdge(edge: EdgeView | Edge): boolean {
    let edgeV: EdgeView;
    if (edge instanceof EdgeView) {
      edgeV = edge;
    } else {
      const view = ViewRegistry.getEdgeView(edge);
      if (!view) return false;
      edgeV = view;
    }

    const edgeIndex = this.edges.indexOf(edgeV);
    if (edgeIndex === -1) return false;
    this.edges.splice(edgeIndex, 1);
    if (this.shouldAutoUpdateOnModify) {
      this.update();
    }
    return true;
  }

  getEdgeViewByNodes(from: Node, to: Node): EdgeView | null {
    const query = this.edges.filter((edge: EdgeView) => edge.fromModel === from && edge.toModel === to);
    return query.length > 0 ? query[0] : null;
  }

  getNodeViewByLabel(label: string): NodeView | null {
    const query = this.nodes.filter((nodeV: NodeView) => nodeV.model.label === label);
    return query.length > 0 ? query[0] : null;
  }

  forEachNode(callbackFn: (node: NodeView, index: number) => void) {
    this.nodes.forEach(callbackFn);
  }

  forEachEdge(callbackFn: (edge: EdgeView, index: number) => void) {
    this.edges.forEach(callbackFn);
  }
}
