/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
// We are validating that ImmutablePoint class does not expose a mutable API surface
// in the last test of this suite. That requires casting the object to any.
import { describe, expect, it } from "vitest";

import { ImmutablePoint, MutablePoint } from "../../src/core/point";

describe("MutablePoint", () => {
  it("stores x and y coordinates", () => {
    const p = new MutablePoint(3, 4);
    expect(p.x).toBe(3);
    expect(p.y).toBe(4);
  });

  it("computes Euclidean distance correctly", () => {
    const a = new MutablePoint(0, 0);
    const b = new MutablePoint(3, 4);
    expect(a.getDistanceTo(b)).toBeCloseTo(5, 10);
  });

  it("computes distance to self as zero", () => {
    const p = new MutablePoint(5, 5);
    expect(p.getDistanceTo(p)).toBe(0);
  });

  it("computes angle to another point", () => {
    // getAngleTo computes atan2(this.y - other.y, this.x - other.x)
    // So origin.getAngleTo(point) = angle FROM point TO origin
    const origin = new MutablePoint(0, 0);

    // Point to the right: atan2(0, 0-(-1)) = atan2(0, 1) = 0
    const left = new MutablePoint(-1, 0);
    expect(origin.getAngleTo(left)).toBeCloseTo(0, 5);

    // Point to the left: atan2(0, 0-1) = atan2(0, -1) = PI
    const right = new MutablePoint(1, 0);
    expect(origin.getAngleTo(right)).toBeCloseTo(Math.PI, 5);

    // Point below: atan2(0-1, 0) = atan2(-1, 0) = -PI/2
    const below = new MutablePoint(0, 1);
    expect(origin.getAngleTo(below)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it("add mutates in place and returns this", () => {
    const p = new MutablePoint(1, 2);
    const result = p.add(new MutablePoint(3, 4));
    expect(result).toBe(p); // returns this
    expect(p.x).toBe(4);
    expect(p.y).toBe(6);
  });

  it("subtract mutates in place and returns this", () => {
    const p = new MutablePoint(5, 7);
    const result = p.subtract(new MutablePoint(2, 3));
    expect(result).toBe(p);
    expect(p.x).toBe(3);
    expect(p.y).toBe(4);
  });

  it("round snaps to nearest integer by default", () => {
    const p = new MutablePoint(3.7, 4.2);
    p.round();
    expect(p.x).toBe(4);
    expect(p.y).toBe(4);
  });

  it("round snaps to grid with precision", () => {
    const p = new MutablePoint(17, 23);
    p.round(10);
    expect(p.x).toBe(20);
    expect(p.y).toBe(20);
  });

  it("round with precision 20 (grid snap)", () => {
    const p = new MutablePoint(33, 47);
    p.round(20);
    expect(p.x).toBe(40);
    expect(p.y).toBe(40);
  });

  it("getMPoint creates a copy", () => {
    const p = new MutablePoint(1, 2);
    const copy = p.getMPoint();
    expect(copy.x).toBe(1);
    expect(copy.y).toBe(2);
    expect(copy).not.toBe(p);
    copy.x = 99;
    expect(p.x).toBe(1); // original unchanged
  });

  it("getIMPoint creates an ImmutablePoint copy", () => {
    const p = new MutablePoint(1, 2);
    const im = p.getIMPoint();
    expect(im).toBeInstanceOf(ImmutablePoint);
    expect(im.x).toBe(1);
    expect(im.y).toBe(2);
  });

  it("getMidpoint computes the midpoint between two points", () => {
    const a = new MutablePoint(0, 0);
    const b = new MutablePoint(10, 20);
    const mid = MutablePoint.getMidpoint(a, b);
    expect(mid.x).toBe(5);
    expect(mid.y).toBe(10);
  });

  it("toString formats as 'x, y'", () => {
    const p = new MutablePoint(3, 4);
    expect(p.toString()).toBe("3, 4");
  });

  it("chaining works: add then round", () => {
    const p = new MutablePoint(1.5, 2.5);
    p.add(new MutablePoint(0.3, 0.3)).round();
    expect(p.x).toBe(2);
    expect(p.y).toBe(3);
  });
});

describe("ImmutablePoint", () => {
  it("stores readonly x and y", () => {
    const p = new ImmutablePoint(3, 4);
    expect(p.x).toBe(3);
    expect(p.y).toBe(4);
  });

  it("computes distance correctly", () => {
    const a = new ImmutablePoint(0, 0);
    const b = new ImmutablePoint(3, 4);
    expect(a.getDistanceTo(b)).toBeCloseTo(5, 10);
  });

  it("getIMPoint returns itself (no copy needed)", () => {
    const p = new ImmutablePoint(1, 2);
    expect(p.getIMPoint()).toBe(p);
  });

  it("getMPoint creates a mutable copy", () => {
    const p = new ImmutablePoint(1, 2);
    const mp = p.getMPoint();
    expect(mp).toBeInstanceOf(MutablePoint);
    expect(mp.x).toBe(1);
    expect(mp.y).toBe(2);
  });

  it("does not expose mutation methods", () => {
    const p = new ImmutablePoint(1, 2);
    // TypeScript prevents this at compile time, but verify at runtime
    expect((p as any).add).toBeUndefined();
    expect((p as any).subtract).toBeUndefined();
    expect((p as any).round).toBeUndefined();
  });
});
