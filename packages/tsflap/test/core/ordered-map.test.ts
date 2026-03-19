import { describe, it, expect } from "vitest";

import { OrderedMap, type Hashable } from "../../src/core/ordered-map";

class TestItem implements Hashable {
  constructor(
    public id: string,
    public name: string,
  ) {}
  hashCode(): string {
    return this.id;
  }
  toString(): string {
    return this.name;
  }
}

describe("OrderedMap", () => {
  it("adds items and maintains insertion order", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("1", "alpha");
    const b = new TestItem("2", "beta");
    const c = new TestItem("3", "gamma");

    map.add(a);
    map.add(b);
    map.add(c);

    expect(map.size).toBe(3);
    expect(map.items[0]).toBe(a);
    expect(map.items[1]).toBe(b);
    expect(map.items[2]).toBe(c);
  });

  it("rejects duplicate hash codes and returns existing item", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("1", "alpha");
    const aDuplicate = new TestItem("1", "alpha-dup");

    const result1 = map.add(a);
    const result2 = map.add(aDuplicate);

    expect(result1).toBe(a);
    expect(result2).toBe(a); // returns existing, not the duplicate
    expect(map.size).toBe(1);
  });

  it("inserts at a specific index", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("1", "alpha");
    const b = new TestItem("2", "beta");
    const c = new TestItem("3", "gamma");

    map.add(a);
    map.add(c);
    map.add(b, 1); // insert between a and c

    expect(map.items[0]).toBe(a);
    expect(map.items[1]).toBe(b);
    expect(map.items[2]).toBe(c);
  });

  it("looks up by hash code in O(1)", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("abc", "alpha");
    map.add(a);

    expect(map.getByHash("abc")).toBe(a);
    expect(map.getByHash("nonexistent")).toBeNull();
    expect(map.hasByHash("abc")).toBe(true);
    expect(map.hasByHash("nonexistent")).toBe(false);
  });

  it("looks up by toString value (O(n) fallback)", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("id1", "alpha");
    map.add(a);

    expect(map.getByString("alpha")).toBe(a);
    expect(map.getByString("nonexistent")).toBeNull();
  });

  it("get() tries hash first, then string", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("id1", "alpha");
    map.add(a);

    // By hash code string
    expect(map.get("id1")).toBe(a);
    // By toString string
    expect(map.get("alpha")).toBe(a);
    // By object
    expect(map.get(a)).toBe(a);
  });

  it("does not fall back to toString when looking up by object identity", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("id1", "shared-name");
    const b = new TestItem("id2", "shared-name");
    map.add(a);

    expect(map.get(b)).toBeNull();
    expect(map.has(b)).toBe(false);
  });

  it("removes items correctly", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("1", "alpha");
    const b = new TestItem("2", "beta");
    map.add(a);
    map.add(b);

    expect(map.remove(a)).toBe(true);
    expect(map.size).toBe(1);
    expect(map.hasByHash("1")).toBe(false);
    expect(map.items[0]).toBe(b);
  });

  it("remove returns false for non-existent items", () => {
    const map = new OrderedMap<TestItem>();
    expect(map.remove("nonexistent")).toBe(false);
  });

  it("does not remove a different object that only shares the same display string", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("id1", "shared-name");
    const b = new TestItem("id2", "shared-name");
    map.add(a);

    expect(map.remove(b)).toBe(false);
    expect(map.size).toBe(1);
    expect(map.get(a)).toBe(a);
  });

  it("constructs from an initial array", () => {
    const items = [new TestItem("1", "a"), new TestItem("2", "b"), new TestItem("3", "c")];
    const map = new OrderedMap(items);

    expect(map.size).toBe(3);
    expect(map.getByHash("2")?.name).toBe("b");
  });

  it("has() works with both objects and strings", () => {
    const map = new OrderedMap<TestItem>();
    const a = new TestItem("id1", "alpha");
    map.add(a);

    expect(map.has(a)).toBe(true);
    expect(map.has("id1")).toBe(true); // hash match
    expect(map.has("alpha")).toBe(true); // string match
    expect(map.has("nonexistent")).toBe(false);
  });
});
