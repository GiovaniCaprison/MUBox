import type { Node } from "./node";
import { OrderedMap } from "../core/ordered-map";

/**
 * An ordered collection of {@link Node} objects with O(1) hash-based lookups.
 *
 * Represents the finite state set Q in the formal automaton definition.
 * Maintains insertion order for deterministic iteration while providing
 * fast membership testing via hash codes.
 */
export class NodeList extends OrderedMap<Node> {}
