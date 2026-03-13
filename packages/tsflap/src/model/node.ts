import type { Edge } from "./edge";
import { EdgeList } from "./edge-list";
import type { Hashable } from "../core/ordered-map";

/**
 * Options for creating a {@link Node}.
 */
export interface NodeOptions {
  initial?: boolean;
  final?: boolean;
  fromEdges?: EdgeList;
  toEdges?: EdgeList;
  callConfig?: CallStateConfig | null;
}

/**
 * Configuration for a **call state** (also known as a "box" in the RSM literature).
 *
 * In the theory of Recursive State Machines (Alur & Yannakakis, 1998, 2001),
 * a component machine may contain **box nodes** — states that, instead of
 * performing a local transition, transfer control to another component machine.
 * When the called component reaches an exit (accepting) state, control returns
 * to the caller and execution continues from the box node's outgoing transitions.
 *
 * This is the formal mechanism that gives hierarchical automata their additional
 * computational power:
 *
 * - **FA calling FA (with recursion)**: The implicit call stack created by
 *   nested invocations acts as a pushdown stack, making the system equivalent
 *   to a PDA. This is the key theorem of Alur & Yannakakis (2001): RSMs over
 *   finite automata recognize exactly the context-free languages.
 *
 * - **PDA calling PDA (separate stacks)**: Each PDA invocation gets its own
 *   fresh stack. Combined with the RSM call stack, this gives the system
 *   access to multiple independent stacks. A classical result in automata
 *   theory (Hopcroft & Ullman, 1979) shows that a two-stack PDA can simulate
 *   a Turing machine — making this combination Turing-complete.
 *
 * - **TM calling TM**: This is the standard subroutine model of computation.
 *   Each callee gets its own tape initialized with the remaining input.
 *   Turing machines are closed under composition (Sipser, 2012, Theorem 3.16),
 *   so the result remains recursively enumerable.
 *
 * - **Cross-type calls** (e.g., FA calling TM, PDA calling FA): All combinations
 *   are permitted. The resulting computational power is determined by the most
 *   powerful component in the hierarchy. Downward calls (stronger calling weaker)
 *   are always safe since the callee can be simulated by the caller. Upward calls
 *   (weaker calling stronger) effectively grant the caller the callee's power.
 *
 * **Execution semantics (accept-reject mode)**:
 * The input tape is shared between caller and callee. When a call state is entered:
 * 1. The callee automaton begins execution from its initial state, reading from
 *    the current position on the shared input tape.
 * 2. If the callee reaches an accepting state, control returns to the caller.
 *    The caller resumes from the call state with the input advanced past whatever
 *    the callee consumed, and follows outgoing transitions normally.
 * 3. If the callee rejects (exhausts all computation paths without accepting),
 *    that branch of the caller's computation is dead — no outgoing transitions
 *    are followed from the call state.
 * 4. For non-deterministic callees, multiple accepting configurations (each having
 *    consumed a different amount of input) each produce a separate continuation
 *    in the caller, preserving the full non-deterministic semantics.
 *
 * @see Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
 *      ACM Transactions on Programming Languages and Systems, 23(6), 731-782.
 * @see Sipser, M. (2012). Introduction to the Theory of Computation (3rd ed.).
 * @see Hopcroft, J. E., & Ullman, J. D. (1979). Introduction to Automata Theory,
 *      Languages, and Computation. Addison-Wesley.
 */
export interface CallStateConfig {
  /**
   * The unique identifier of the target automaton within the Simulation workspace.
   * This corresponds to a `SimulationEntry.id` and is resolved at execution time
   * by the Simulation's automaton resolver.
   */
  targetAutomatonId: string;

  /**
   * The call mode determines how the callee's result maps back to the caller's
   * computation.
   *
   * - `'accept-reject'`: The simplest and most common mode. The callee is treated
   *   as a black-box language recognizer. If it accepts, the caller continues;
   *   if it rejects, the branch dies. This corresponds to the standard RSM
   *   semantics where each box has a single entry and the return is binary.
   *
   * Future modes (not yet implemented):
   * - `'exit-mapped'`: Each exit (final) node of the callee maps to a distinct
   *   outgoing transition from the call state, allowing richer communication
   *   between caller and callee. This corresponds to RSMs with multiple return
   *   ports per box.
   */
  callMode: "accept-reject" | "exit-mapped";

  /**
   * For `exit-mapped` mode: maps each exit (final) node label of the callee
   * to a specific outgoing transition label from the call state.
   *
   * When the callee reaches a final node whose label is in this map, the caller
   * follows the corresponding outgoing transition. This enables richer communication
   * between caller and callee than the binary accept/reject of `accept-reject` mode.
   *
   * Only used when `callMode` is `"exit-mapped"`. Ignored for `"accept-reject"`.
   *
   * @see Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
   *      — RSMs with multiple return ports per box.
   */
  exitMap?: Record<string, string>;
}

/**
 * Represents a state (node) in a formal automaton.
 *
 * In the standard formalism, a state q ∈ Q is an element of the finite state set.
 * States can be:
 * - **Initial** (q₀): The unique start state where computation begins
 * - **Final/Accepting** (q ∈ F): States that indicate the input has been accepted
 * - **Call states** (boxes): States that invoke a sub-automaton (RSM extension)
 *
 * The Node class serves as the fundamental building block of all automaton types
 * in the Chomsky hierarchy supported by this library: DFA, NFA, PDA, and TM.
 * The call state extension follows the Recursive State Machine formalism.
 *
 * **Design note**: The `visualization` property provides a slot for the engine/view
 * layer to attach rendering metadata. The model layer does not depend on or
 * interpret this value — it exists solely to enable bidirectional model↔view
 * binding without requiring a separate registry. This is typed as `unknown`
 * to prevent accidental use from the model layer; the engine layer casts it
 * to the appropriate view type (e.g., `NodeView`).
 */
export class Node implements Hashable {
  private _hashCode: string = crypto.randomUUID();

  /** The label of this state (e.g., "q0", "q1"). Corresponds to the state name in formal notation. */
  public label: string;

  /** Whether this node is the initial/start state (q₀). */
  public initial: boolean;

  /** Whether this node is a final/accepting state (q ∈ F). */
  public final: boolean;

  /** Edges whose target is this node (incoming transitions). */
  public fromEdges: EdgeList;

  /** Edges whose source is this node (outgoing transitions). */
  public toEdges: EdgeList;

  /**
   * If non-null, this node is a **call state** (box) in the Recursive State Machine
   * sense. Instead of being a simple state with local transitions, entering this
   * node triggers the invocation of another automaton.
   *
   * @see CallStateConfig for full theoretical documentation
   */
  public callConfig: CallStateConfig | null;

  /**
   * Whether this node is a call state (box) that invokes a sub-automaton.
   *
   * Call states are visually rendered differently from ordinary states
   * (as rectangles rather than circles, following the RSM convention)
   * and have special execution semantics during simulation.
   */
  get isCallState(): boolean {
    return this.callConfig !== null;
  }

  constructor(label: string, options?: NodeOptions) {
    this.label = label;

    if (options) {
      this.initial = options.initial ?? false;
      this.final = options.final ?? false;
      this.fromEdges = options.fromEdges ?? new EdgeList();
      this.toEdges = options.toEdges ?? new EdgeList();
      this.callConfig = options.callConfig ?? null;
    } else {
      this.initial = false;
      this.final = false;
      this.fromEdges = new EdgeList();
      this.toEdges = new EdgeList();
      this.callConfig = null;
    }
  }

  /**
   * Registers an incoming edge (an edge whose target is this node).
   * @returns The added edge, or null if the edge's target does not match this node.
   */
  addFromEdge(edge: Edge): Edge | null {
    if (edge.to.hashCode() === this.hashCode()) {
      return this.fromEdges.add(edge);
    }
    return null;
  }

  /**
   * Registers an outgoing edge (an edge whose source is this node).
   * @returns The added edge, or null if the edge's source does not match this node.
   */
  addToEdge(edge: Edge): Edge | null {
    if (edge.from.hashCode() === this.hashCode()) {
      return this.toEdges.add(edge);
    }
    return null;
  }

  /**
   * Removes an incoming edge.
   * @returns true if the edge was found and removed, false otherwise.
   */
  removeFromEdge(edge: Edge): boolean {
    if (edge.to.hashCode() === this.hashCode()) {
      return this.fromEdges.remove(edge);
    }
    return false;
  }

  /**
   * Removes an outgoing edge.
   * @returns true if the edge was found and removed, false otherwise.
   */
  removeToEdge(edge: Edge): boolean {
    if (edge.from.hashCode() === this.hashCode()) {
      return this.toEdges.remove(edge);
    }
    return false;
  }

  toString(): string {
    return this.label;
  }

  public hashCode(): string {
    return this._hashCode;
  }
}
