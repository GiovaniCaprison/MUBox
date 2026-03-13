import type { IPoint } from "../../core/point";
import { MutablePoint } from "../../core/point";
import type { Edge } from "../../model/edge";
import type { Node } from "../../model/node";
import { ViewRegistry } from "../view-registry";

/**
 * Visual representation of a node on the canvas
 */
export class NodeView {
  public model: Node;
  public radius = 20;
  public position: MutablePoint;

  constructor(model: Node, position: MutablePoint) {
    this.position = position;
    this.model = model;
    ViewRegistry.setNodeView(model, this);
  }

  public updateEdgeVisualizationPaths(updateFn?: (value: Edge, index: number, array: Edge[]) => void) {
    updateFn ??= (edgeModel: Edge) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Wait a sec - I know you!
      const ev = ViewRegistry.getEdgeView(edgeModel)!;
      ev.recalculatePath(ev.hasMovedControlPoint() ? ev.control : undefined);
    };
    this.forEachEdge(updateFn);
  }

  public forEachEdge(callBackFn: (value: Edge, index: number, array: Edge[]) => void) {
    this.model.toEdges.items.forEach(callBackFn);
    this.model.fromEdges.items.forEach(callBackFn);
  }

  public getAnchorPointFrom(point: IPoint): MutablePoint {
    const posX = this.position.x;
    const posY = this.position.y;

    // For call states (RSM boxes), compute the intersection of the line
    // from center to target with the rectangle boundary instead of a circle.
    // The rectangle dimensions must match those in NodeView.tsx rendering.
    if (this.model.isCallState) {
      const halfW = this.radius * 1.3; // half of w = r * 2.6
      const halfH = this.radius * 1.1; // half of h = r * 2.2
      // Add a small padding so the arrowhead tip sits outside the rectangle
      // rather than exactly on the edge (arrowhead length is ~5-7px)
      const padW = halfW;
      const padH = halfH;
      const dx = point.x - posX;
      const dy = point.y - posY;

      if (dx === 0 && dy === 0) {
        return new MutablePoint(posX + padW, posY);
      }

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      let t: number;
      if (absDx * padH > absDy * padW) {
        t = padW / absDx;
      } else {
        t = padH / absDy;
      }

      return new MutablePoint(posX + t * dx, posY + t * dy);
    }

    // For ordinary states: circle anchor point
    const r = this.radius;
    const dx = point.x - posX;
    const dy = point.y - posY;
    const theta = Math.atan2(dy, dx);
    const anchorX = posX + r * Math.cos(theta);
    const anchorY = posY + r * Math.sin(theta);
    return new MutablePoint(anchorX, anchorY);
  }

  public getSelfAnchorPoints(from?: IPoint): [MutablePoint, MutablePoint] {
    const posX = this.position.x;
    const posY = this.position.y;
    const r = this.radius;
    const theta0 = from ? this.position.getAngleTo(from) : Math.PI / 2;
    const theta1 = theta0 + Math.PI / 6;
    const theta2 = theta0 - Math.PI / 6;
    const anchorX1 = posX + -r * Math.cos(theta1);
    const anchorY1 = posY + -r * Math.sin(theta1);
    const anchorX2 = posX + -r * Math.cos(theta2);
    const anchorY2 = posY + -r * Math.sin(theta2);
    return [new MutablePoint(anchorX1, anchorY1), new MutablePoint(anchorX2, anchorY2)];
  }
}
