/**
 * Interface for 2D point objects used in automaton graph layout and rendering.
 *
 * All point types in the library implement this interface, enabling polymorphic
 * use in geometry calculations (distance, angle, midpoint, etc.).
 */
export interface IPoint {
  readonly x: number;
  readonly y: number;
  getMPoint(): MutablePoint;
  getIMPoint(): ImmutablePoint;
  getDistanceTo(point: IPoint): number;
  getAngleTo(point: IPoint): number;
}

/**
 * A mutable 2D point that can be modified in place.
 *
 * Used extensively in the engine layer for node positions, edge control points,
 * and viewport calculations where in-place mutation is needed for performance.
 *
 * Mutation methods (`add`, `subtract`, `round`) return `this` for chaining.
 */
export class MutablePoint implements IPoint {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Creates a new MutablePoint copy of this point. */
  public getMPoint(): MutablePoint {
    return new MutablePoint(this.x, this.y);
  }

  /** Creates an ImmutablePoint copy of this point. */
  public getIMPoint(): ImmutablePoint {
    return new ImmutablePoint(this.x, this.y);
  }

  /** Euclidean distance to another point. */
  public getDistanceTo(other: IPoint): number {
    return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
  }

  /** Angle (in radians) from this point to another, measured from the positive x-axis. */
  public getAngleTo(other: IPoint): number {
    return Math.atan2(this.y - other.y, this.x - other.x);
  }

  /** Adds another point's coordinates to this point (in place). Returns `this` for chaining. */
  public add(other: IPoint): this {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  /** Subtracts another point's coordinates from this point (in place). Returns `this` for chaining. */
  public subtract(other: IPoint): this {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  /**
   * Rounds coordinates to the nearest multiple of `precision` (in place).
   * @param precision - The grid size to snap to (default: 1)
   * @returns `this` for chaining
   */
  public round(precision?: number): this {
    precision ??= 1;
    this.x = Math.round(this.x / precision) * precision;
    this.y = Math.round(this.y / precision) * precision;
    return this;
  }

  /** Returns the midpoint between two points. */
  static getMidpoint(point1: IPoint, point2: IPoint): MutablePoint {
    return new MutablePoint((point1.x + point2.x) / 2, (point1.y + point2.y) / 2);
  }

  /** Returns a normal offset vector from the line between two points. */
  static getNormalOffset(point1: IPoint, point2: IPoint, distance: number, theta0: number = Math.PI / 2): MutablePoint {
    const theta1 = point1.getAngleTo(point2) + theta0;
    return new MutablePoint(distance * Math.cos(theta1), distance * Math.sin(theta1));
  }

  public toString(): string {
    return `${this.x}, ${this.y}`;
  }
}

/**
 * An immutable 2D point whose coordinates cannot be changed after creation.
 *
 * Unlike the previous implementation that extended MutablePoint and threw errors
 * on mutation (violating the Liskov Substitution Principle), this class implements
 * `IPoint` directly. It provides the same read-only geometry operations but does
 * not expose mutation methods.
 *
 * Use `ImmutablePoint` for constant reference points (e.g., origin offsets)
 * where accidental mutation must be prevented at compile time.
 */
export class ImmutablePoint implements IPoint {
  public readonly x: number;
  public readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Creates a new MutablePoint copy of this point. */
  public getMPoint(): MutablePoint {
    return new MutablePoint(this.x, this.y);
  }

  /** Returns this immutable point (no copy needed since it's immutable). */
  public getIMPoint(): this {
    return this;
  }

  /** Euclidean distance to another point. */
  public getDistanceTo(other: IPoint): number {
    return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
  }

  /** Angle (in radians) from this point to another, measured from the positive x-axis. */
  public getAngleTo(other: IPoint): number {
    return Math.atan2(this.y - other.y, this.x - other.x);
  }

  public toString(): string {
    return `${this.x}, ${this.y}`;
  }
}
