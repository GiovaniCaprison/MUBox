import type { Node } from "./node";
import type { Transition } from "./transitions";
import type { Hashable } from "../core/ordered-map";

/**
 * Represents a directed edge (transition) between two states in a formal automaton.
 *
 * In the standard formalism, a transition δ(q, a) = q' maps a source state q
 * and an input symbol a to a target state q'. The Edge class encapsulates this
 * triple: (from, to, transition).
 *
 * For different automaton types, the transition carries different information:
 * - **FA**: A single character (or ε for epsilon transitions)
 * - **TM**: A read symbol, write symbol, and head direction (L/R)
 * - **PDA**: An input character, a stack pop symbol, and a stack push string
 *
 * **Design note**: The `visualization` and `visualizationNumber` properties
 * provide slots for the engine/view layer to attach rendering metadata.
 * The model layer does not depend on or interpret these values.
 *
 * @see Node for the state representation
 * @see Transition for the transition data
 */
export class Edge implements Hashable {
  private _hashCode: string = crypto.randomUUID();

  /** The source state of this transition. */
  public from: Node;

  /** The target state of this transition. */
  public to: Node;

  /** The transition data (input symbol, stack operations, tape operations, etc.). */
  public transition: Transition;

  /**
   * The index of this edge within its visual group (for multiple transitions
   * between the same pair of nodes). Set by the engine's view layer.
   *
   * @internal Used by the engine layer only.
   */
  public visualizationNumber: number;

  constructor(from: Node, to: Node, transition: Transition) {
    this.from = from;
    this.to = to;
    this.transition = transition;
    this.visualizationNumber = 0;
    this.addNodes();
  }

  /**
   * Removes this edge from its source and target nodes' edge lists.
   * Called when the edge is being deleted from the graph.
   */
  removeNodes(): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Node is an object which can be instantiated but have a null value - eslint is smoking something good - we have to make this assertion
    if (this.from) {
      this.from.removeToEdge(this);
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.to) {
      this.to.removeFromEdge(this);
    }
  }

  /**
   * Registers this edge with its source and target nodes' edge lists.
   * Called during construction.
   */
  addNodes(): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.from) {
      this.from.addToEdge(this);
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.to) {
      this.to.addFromEdge(this);
    }
  }

  /**
   * Returns the formal notation string: (from, to, transition).
   */
  toString(): string {
    return "(" + this.from.toString() + ", " + this.to.toString() + ", " + this.transition.toString() + ")";
  }

  hashCode(): string {
    return this._hashCode;
  }
}
