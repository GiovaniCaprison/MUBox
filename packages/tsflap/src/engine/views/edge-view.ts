import type { IPoint } from "../../core/point";
import { MutablePoint } from "../../core/point";
import type { Edge } from "../../model/edge";
import { EdgeList } from "../../model/edge-list";
import type { Node } from "../../model/node";
import { ViewRegistry } from "../view-registry";

export enum EdgeViewPathMode {
  DEFAULT = 0,
  SELF = 1,
  OPPOSING_A = 2,
  OPPOSING_B = 3,
}

/**
 * Visual representation of an edge on the canvas
 */
export class EdgeView {
  public start!: MutablePoint;
  public end!: MutablePoint;
  private _control!: MutablePoint;
  public models: EdgeList;
  public fromModel!: Node;
  public toModel!: Node;
  private _hasMovedControlPoint = false;
  public pathMode: EdgeViewPathMode | null = null;

  constructor(models: Edge | Edge[], control?: MutablePoint) {
    let edgeListModels: Edge[];
    if (Array.isArray(models)) {
      edgeListModels = models;
    } else if (models instanceof Object) {
      edgeListModels = [models];
    } else {
      edgeListModels = [];
    }

    this.models = new EdgeList();
    edgeListModels.forEach((edge: Edge) => this.addEdgeModel(edge));

    this.pathMode = this.fromModel !== this.toModel ? EdgeViewPathMode.DEFAULT : EdgeViewPathMode.SELF;

    this.recalculatePath(control);
  }

  public addEdgeModel(edge: Edge, index?: number): Edge | null {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Hmmm Object is null - but member variable is undefined? Yea makes sense - thanks TS
    if (!this.fromModel || !this.toModel) {
      this.fromModel = edge.from;
      this.toModel = edge.to;
      ViewRegistry.setEdgeView(edge, this);
      edge.visualizationNumber = typeof index === "number" ? index : this.models.items.length;
      return this.models.add(edge, index);
    } else if (edge.from === this.fromModel && edge.to === this.toModel) {
      ViewRegistry.setEdgeView(edge, this);
      edge.visualizationNumber = typeof index === "number" ? index : this.models.items.length;
      return this.models.add(edge);
    } else {
      return null;
    }
  }

  public reindexEdgeModels() {
    this.models.items.forEach((edge: Edge, index: number) => {
      edge.visualizationNumber = index;
    });
  }

  public recalculatePath(control?: MutablePoint) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Ahhh yes - design patterns in TS - what could possibly go wrong!?
    const fromView = ViewRegistry.getNodeView(this.fromModel)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const toView = ViewRegistry.getNodeView(this.toModel)!;
    if (this.pathMode !== EdgeViewPathMode.SELF) {
      const tempControlPoint = this.getInitialControlPoint(fromView.position, toView.position);
      this.start = fromView.getAnchorPointFrom(control ?? tempControlPoint);
      this.end = toView.getAnchorPointFrom(control ?? tempControlPoint);
      this._control = control ?? this.getInitialControlPoint();
    } else {
      const anchorPoints = fromView.getSelfAnchorPoints(control);
      this.start = anchorPoints[0];
      this.end = anchorPoints[1];
      this._control = control ?? this.getInitialControlPoint();
    }
  }

  public getInitialControlPoint(startPoint?: IPoint, endPoint?: IPoint): MutablePoint {
    startPoint = startPoint ?? this.start;
    endPoint = endPoint ?? this.end;
    const controlPoint = MutablePoint.getMidpoint(startPoint, endPoint);

    switch (this.pathMode) {
      case EdgeViewPathMode.SELF:
        controlPoint.y -= 80;
        break;
      case EdgeViewPathMode.OPPOSING_A:
      case EdgeViewPathMode.OPPOSING_B:
        controlPoint.add(MutablePoint.getNormalOffset(startPoint, endPoint, Math.max(startPoint.getDistanceTo(endPoint) / 15, 20)));
        break;
    }

    return controlPoint;
  }

  public hasMovedControlPoint(): boolean {
    return this._hasMovedControlPoint;
  }

  public resetControlPoint() {
    this._hasMovedControlPoint = false;
    this._control = this.getInitialControlPoint();
  }

  set control(point: MutablePoint) {
    this._hasMovedControlPoint = true;
    this._control = point;
  }

  get control(): MutablePoint {
    return this._control;
  }

  public setControlDirectly(point: MutablePoint) {
    this._control = point;
  }

  public setHasMovedControlPointDirectly(val: boolean) {
    this._hasMovedControlPoint = val;
  }

  public getPath(): string {
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- Not bothered today unfortunately
    return "M" + this.start + " Q" + this.control + " " + this.end;
  }

  public getTransitionPoint(modelNumber?: number): MutablePoint {
    const t = 0.5;
    const x = (1 - t) * (1 - t) * this.start.x + 2 * (1 - t) * t * this.control.x + t * t * this.end.x;
    const y = (1 - t) * (1 - t) * this.start.y + 2 * (1 - t) * t * this.control.y + t * t * this.end.y;

    return new MutablePoint(x, y).add(
      MutablePoint.getNormalOffset(this.start, this.end, (this.pathMode !== EdgeViewPathMode.SELF ? 1 : -1) * ((modelNumber ?? 0) * 20)),
    );
  }

  public getDirection(): number {
    return this.start.x < this.end.x ? 1 : -1;
  }
}
