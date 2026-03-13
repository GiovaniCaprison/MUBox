/**
 * Interface for objects that can be stored in hash-based collections.
 *
 * Implementing classes must provide:
 * - A stable `hashCode()` for identity-based lookups (O(1))
 * - A `toString()` for human-readable representation and label-based lookups
 *
 * This is analogous to Java's `Object.hashCode()` / `Object.equals()` contract,
 * adapted for TypeScript's string-based hashing.
 */
export interface Hashable {
  /** Returns a unique identifier for this object (used for O(1) map lookups). */
  hashCode(): string;
  /** Returns a human-readable string representation. */
  toString(): string;
}

/**
 * A collection that maintains insertion order while providing O(1) lookups by hash code.
 *
 * This data structure combines the ordered iteration of an array with the fast
 * lookup of a hash map. Items are stored in insertion order (accessible via `items`)
 * and indexed by their `hashCode()` for O(1) retrieval.
 *
 * Used throughout the automata model to store states (nodes) and transitions (edges)
 * where both ordered iteration and fast membership testing are required.
 *
 * @typeParam T - The type of items stored, must implement {@link Hashable}
 */
export class OrderedMap<T extends Hashable> {
  /** The items in insertion order. Read-only to prevent bypassing the hash index. */
  public readonly items: T[];

  /** Hash-indexed lookup map for O(1) access by hash code. */
  private _hashIndex: Map<string, T>;

  constructor(items?: T[]) {
    this.items = [];
    this._hashIndex = new Map();
    if (items) {
      items.forEach((item) => {
        this.add(item);
      });
    }
  }

  /**
   * Adds an item to the collection. If an item with the same hash code already
   * exists, returns the existing item without modification.
   *
   * @param item - The item to add
   * @param index - Optional insertion index (appends to end if omitted)
   * @returns The added item, or the existing item if a duplicate was found
   */
  public add(item: T, index?: number): T {
    if (!this.hasByHash(item.hashCode())) {
      if (typeof index !== "number") {
        this.items.push(item);
      } else {
        this.items.splice(index, 0, item);
      }
      this._hashIndex.set(item.hashCode(), item);
      return item;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We know this will not be null given our implementation but the Map interface defines it as such
      return this._hashIndex.get(item.hashCode())!;
    }
  }

  /**
   * Checks whether the collection contains an item.
   * Accepts either an item object (checked by hash code) or a string
   * (checked first as hash code, then as toString() match).
   */
  public has(item: T | string): boolean {
    if (typeof item === "string") {
      return this.hasByHash(item) || this.hasByString(item);
    } else {
      return this.hasByHash(item.hashCode());
    }
  }

  /**
   * Retrieves an item from the collection.
   * Accepts either an item object (looked up by hash code) or a string
   * (looked up first as hash code, then as toString() match).
   */
  public get(item: T | string): T | null {
    if (typeof item === "string") {
      return this.getByHash(item) ?? this.getByString(item);
    } else {
      return this.getByHash(item.hashCode()) ?? this.getByString(item.toString());
    }
  }

  /**
   * Removes an item from the collection.
   * @returns true if the item was found and removed, false otherwise
   */
  public remove(item: T | string): boolean {
    const itemObject = this.get(item);
    if (!itemObject) {
      return false;
    }
    const idx = this.items.indexOf(itemObject);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
    this._hashIndex.delete(itemObject.hashCode());
    return true;
  }

  /** O(1) lookup by hash code. */
  public getByHash(hashCode: string): T | null {
    return this._hashIndex.get(hashCode) ?? null;
  }

  /** O(1) membership test by hash code. */
  public hasByHash(hashCode: string): boolean {
    return this._hashIndex.has(hashCode);
  }

  /** O(n) lookup by toString() value. Use `getByHash()` when possible. */
  public getByString(str: string): T | null {
    for (const item of this._hashIndex.values()) {
      if (item.toString() === str) {
        return item;
      }
    }
    return null;
  }

  /** O(n) membership test by toString() value. Use `hasByHash()` when possible. */
  public hasByString(str: string): boolean {
    return this.getByString(str) !== null;
  }

  /** The number of items in the collection. */
  get size(): number {
    return this.items.length;
  }
}
