import type { Edge } from "../edge";
import type { IGraph } from "../graphs/abstract-graph";
import type { Node } from "../node";

// ─── Step Simulation Types ───────────────────────────────────────────

/**
 * A single entry in a configuration's call trace, recording that a
 * sub-automaton was invoked at a particular call state and consumed
 * a portion of the input.
 *
 * This implements the "computation path" concept from the RSM formalism
 * (Alur & Yannakakis, 2001), making it visible which call states a
 * configuration passed through and what each sub-automaton consumed.
 */
export interface CallTraceEntry {
  /** The label of the call state node that initiated the call */
  readonly callNodeLabel: string;
  /** The automaton ID that was invoked */
  readonly targetAutomatonId: string;
  /** The input that was fed to the sub-automaton */
  readonly inputBefore: string;
  /** The remaining input after the sub-automaton finished */
  readonly inputAfter: string;
}

/**
 * A snapshot of a single configuration in the simulation.
 * This is the common interface across all machine types.
 */
export interface SimulationConfiguration {
  /** The node/state this configuration is in */
  readonly node: Node;
  /** Human-readable description of this configuration */
  readonly description: string;
  /** Whether this configuration is in a final/accepting state */
  readonly isFinal: boolean;
  /**
   * The call trace for this configuration — records which sub-automata
   * were invoked along the computation path and what each consumed.
   * Empty for configurations that haven't passed through any call states.
   */
  readonly callTrace?: readonly CallTraceEntry[];
}

/** FA-specific configuration snapshot */
export interface FASimulationConfig extends SimulationConfiguration {
  readonly remainingInput: string;
}

/** TM-specific configuration snapshot */
export interface TMSimulationConfig extends SimulationConfiguration {
  readonly tape: readonly (string | null)[];
  readonly headPosition: number;
}

/** PDA-specific configuration snapshot */
export interface PDASimulationConfig extends SimulationConfiguration {
  readonly remainingInput: string;
  readonly stack: string;
}

/**
 * Configuration for step simulation behavior.
 *
 * Different automaton types have different loop detection and termination
 * strategies. This configuration captures those differences so the generic
 * step simulator can handle all types uniformly.
 *
 * - **FA**: Simple set-based deduplication, no global limits
 * - **TM**: Count-based deduplication (same config can be visited multiple times),
 *   global step limit to detect infinite loops
 * - **PDA**: Simple set-based deduplication, max configurations limit
 */
export interface StepSimulationConfig {
  /**
   * Maximum times a single configuration string can be visited.
   * - FA/PDA: 1 (equivalent to set-based deduplication)
   * - TM: 100 (allows revisiting states, needed for TM loops)
   */
  readonly maxVisitCount: number;

  /**
   * Maximum total configurations explored before aborting.
   * - FA: Infinity (no limit — FA configuration space is finite)
   * - TM: 1000 (global step limit to detect infinite loops)
   * - PDA: 10000 (PDA configuration space can be infinite due to stack)
   */
  readonly maxConfigurations: number;

  /**
   * Whether accepting (halted) states should be retained in the frontier.
   * - FA/PDA: false (accepting states are terminal, removed from frontier)
   * - TM: true (halted states are kept for display but produce no successors)
   */
  readonly retainAcceptingInFrontier: boolean;

  /**
   * Whether to skip successor computation for accepting states.
   * - FA: false (accepting states may still have epsilon transitions)
   * - TM: true (halted states have no successors by definition)
   * - PDA: true (accepting states have consumed all input)
   */
  readonly skipAcceptingSuccessors: boolean;
}

/**
 * Error thrown by machine execution engines when computation limits are exceeded
 * or invalid configurations are encountered.
 */
export class MachineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MachineError";
  }
}

/**
 * Maximum call depth for sub-automaton invocations in the RSM system.
 *
 * This limit prevents infinite recursion. While recursive calls are a legitimate
 * and powerful feature of Recursive State Machines (they give RSMs over FAs the
 * power of PDAs — Alur & Yannakakis, 2001), unbounded recursion would cause
 * the simulator to hang. This limit is analogous to a stack overflow guard.
 *
 * The value of 100 is chosen to be large enough for meaningful recursive
 * computations (e.g., recognizing a^n b^n for n up to ~50) while still
 * providing a safety net against infinite loops.
 */
export const MAX_CALL_DEPTH = 100;

/**
 * Maximum number of configurations explored before aborting (for PDA and sub-automaton BFS).
 */
export const MAX_CONFIGURATIONS = 10000;

// ─── Machine State Interface ─────────────────────────────────────────

/**
 * Represents an instantaneous description (ID) of a machine's computation.
 *
 * In automata theory, an instantaneous description captures everything needed
 * to determine the machine's future behavior at a given point in computation.
 * The specific contents vary by machine type:
 *
 * - **FA**: (remaining input, current state) — Sipser (2012), Definition 1.5
 * - **TM**: (tape contents, head position, current state) — Sipser (2012), Definition 3.3
 * - **PDA**: (remaining input, stack contents, current state) — Sipser (2012), Definition 2.13
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation (3rd ed.).
 */
export interface IMachineState {
  /** The current state (node) in the automaton. */
  readonly node: Node;

  /** Whether this configuration represents an accepting computation. */
  isFinal(): boolean;

  /** Serializes this configuration to a unique string key for deduplication. */
  toString(): string;
}

// ─── Machine Type Strategy Interface ─────────────────────────────────

/**
 * Type for the sub-automaton resolver function.
 *
 * In the Recursive State Machine (RSM) formalism (Alur & Yannakakis, 2001),
 * when a machine encounters a **call state** (box node), it must resolve the
 * reference to the target automaton. This resolver function performs that lookup.
 *
 * The resolver takes an automaton ID (from `CallStateConfig.targetAutomatonId`)
 * and returns the target graph, or null if the reference cannot be resolved.
 *
 * @see CallStateConfig for the full theoretical documentation
 * @see Simulation.createGraphResolver for the standard resolver implementation
 */
export type SubAutomatonResolver = (automatonId: string) => IGraph | null;

/**
 * A **Machine Type Strategy** encapsulates everything that varies between
 * different automaton types (FA, TM, PDA, and future types).
 *
 * This is the central abstraction that enables the library to support multiple
 * automaton types without code duplication. The generic execution engine
 * ({@link ExecutionEngine}) and step simulator are parameterized by this
 * strategy, implementing the BFS exploration loop once while delegating
 * type-specific behavior to the strategy.
 *
 * **Design pattern**: This is the Strategy pattern (Gamma et al., 1994),
 * applied to the variation point in the Chomsky hierarchy. Each level of
 * the hierarchy (Type 3 regular, Type 2 context-free, Type 0 recursively
 * enumerable) has different state representations and transition semantics,
 * but the BFS exploration algorithm is identical across all types.
 *
 * **Extensibility**: To add a new automaton type (e.g., Linear Bounded
 * Automaton, Multi-tape Turing Machine, Mealy/Moore machine), implement
 * this interface and register it in the {@link MachineTypeRegistry}.
 * No existing code needs to change — this is the Open/Closed Principle
 * (Meyer, 1988) applied to automata theory.
 *
 * **Academic references**:
 * - Sipser, M. (2012). Introduction to the Theory of Computation (3rd ed.).
 *   Cengage Learning. — Definitions of FA (1.5), PDA (2.13), TM (3.3).
 * - Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
 *   ACM TOPLAS, 23(6), 731-782. — RSM formalism and call state semantics.
 * - Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). Design Patterns:
 *   Elements of Reusable Object-Oriented Software. Addison-Wesley. — Strategy pattern.
 * - Meyer, B. (1988). Object-Oriented Software Construction. Prentice Hall.
 *   — Open/Closed Principle.
 *
 * @typeParam TState - The machine state type (e.g., FAMachineState, TMachineState)
 */
export interface IMachineType<TState extends IMachineState> {
  /**
   * Short identifier for this automaton type.
   * Must match the corresponding graph's `shortName` (e.g., "FA", "TM", "PDA").
   */
  readonly shortName: string;

  /**
   * Human-readable name for display purposes.
   * E.g., "Finite Automaton", "Turing Machine", "Pushdown Automaton".
   */
  readonly displayName: string;

  /**
   * Creates the initial machine state from an input string and initial node.
   *
   * This corresponds to the initial configuration of the machine:
   * - FA: (w, q₀) where w is the input and q₀ is the start state
   * - TM: (q₀, ▷w☐☐...) where the tape is initialized with the input
   * - PDA: (w, Z₀, q₀) where Z₀ is the initial stack symbol
   *
   * @param input - The input string to process
   * @param initialNode - The initial state q₀
   * @returns The initial machine state
   */
  createInitialState(input: string, initialNode: Node): TState;

  /**
   * Computes all successor states reachable from the given state via one transition.
   *
   * This implements the transition function δ for this machine type:
   * - FA: δ(q, a) → {q'} (follow character/epsilon transitions)
   * - TM: δ(q, a) → (q', b, D) (read, write, move head)
   * - PDA: δ(q, a, X) → {(q', γ)} (read input, pop stack, push string)
   *
   * Each successor is returned with the edge that was traversed, enabling
   * the execution engine to track which transitions were followed (for
   * visualization and step simulation).
   *
   * @param state - The current machine state
   * @returns Array of (successor state, traversed edge) pairs
   */
  getSuccessors(state: TState): { state: TState; edge: Edge }[];

  /**
   * Extracts the remaining input from a machine state.
   *
   * Used by the RSM sub-automaton invocation mechanism: when a call state
   * is encountered, the remaining input is passed to the sub-automaton.
   *
   * - FA: the unconsumed portion of the input string
   * - TM: the tape contents from the head position onward
   * - PDA: the unconsumed portion of the input word
   *
   * @param state - The machine state to extract input from
   * @returns The remaining input as a string
   */
  getRemainingInput(state: TState): string;

  /**
   * Creates a human-readable description of a machine state.
   *
   * Used by the step simulator to display configuration information
   * in the simulation panel.
   *
   * @param state - The machine state to describe
   * @returns A human-readable description string
   */
  describeState(state: TState): string;

  /**
   * Creates a new graph of this automaton type.
   *
   * @param deterministic - Whether the graph should be deterministic
   * @returns A new empty graph of the appropriate type
   */
  createGraph(deterministic: boolean): IGraph;

  /**
   * Configuration for step simulation behavior (loop detection, limits).
   *
   * Each automaton type has different termination characteristics:
   * - FA: finite configuration space, simple deduplication
   * - TM: potentially infinite computation, needs step limits
   * - PDA: potentially infinite stack, needs configuration limits
   */
  readonly stepConfig: StepSimulationConfig;

  /**
   * Creates a simulation configuration snapshot for display in the step simulator UI.
   *
   * Each machine type returns its specific config type (FASimulationConfig,
   * TMSimulationConfig, PDASimulationConfig) which extends SimulationConfiguration
   * with type-specific details (remaining input, tape contents, stack contents).
   *
   * @param state - The machine state to create a config for
   * @param callTrace - Optional call trace entries for RSM computation paths
   * @returns A simulation configuration snapshot
   */
  createSimulationConfig(state: TState, callTrace?: readonly CallTraceEntry[]): SimulationConfiguration;
}
