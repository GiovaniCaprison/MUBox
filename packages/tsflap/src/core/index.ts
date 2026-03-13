/**
 * Core utilities — shared data structures and geometry primitives.
 *
 * This module contains the foundational data structures and geometry types
 * used throughout the TSFlap library. These are domain-agnostic utilities
 * that don't depend on automata theory concepts.
 *
 * @module
 */

// Collections
export { OrderedMap } from "./ordered-map";
export type { Hashable } from "./ordered-map";

// Geometry
export { MutablePoint, ImmutablePoint } from "./point";
export type { IPoint } from "./point";
