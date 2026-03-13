/**
 * Transition module — per-type transition classes for the Chomsky hierarchy.
 *
 * @module
 */

// Shared types and interfaces
export type { Transition, ITransitionPart, EditableTransitionPartUpdateFn } from "./types";
export { EditableTransitionPart, StaticTransitionPart } from "./types";

// Concrete transition types
export { CharacterTransition } from "./character-transition";
export { TuringTransition, TuringTransitionDirection } from "./turing-transition";
export { PushdownTransition } from "./pushdown-transition";
