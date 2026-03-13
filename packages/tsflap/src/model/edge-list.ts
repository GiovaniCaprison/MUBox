import type { Edge } from "./edge";
import { OrderedMap } from "../core/ordered-map";

/**
 * An ordered collection of {@link Edge} objects with O(1) hash-based lookups.
 *
 * Represents the transition set δ in the formal automaton definition.
 * Maintains insertion order for deterministic iteration while providing
 * fast membership testing via hash codes.
 */
export class EdgeList extends OrderedMap<Edge> {}
