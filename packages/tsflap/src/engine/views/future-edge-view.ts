import { MutablePoint } from "../../core/point";
import type { IPoint } from "../../core/point";

/**
 * Represents a temporary edge being drawn by the user
 */
export class FutureEdgeView {
  private _start: MutablePoint;
  private _end: MutablePoint;

  constructor(start: MutablePoint, end: MutablePoint) {
    this._start = start;
    this._end = end;
  }

  set start(point: IPoint) {
    this._start.x = point.x;
    this._start.y = point.y;
  }

  get start(): IPoint {
    return this._start;
  }

  set end(point: IPoint) {
    this._end.x = point.x;
    this._end.y = point.y;
  }

  get end(): IPoint {
    return this._end;
  }
}
