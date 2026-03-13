import { MachineTypeRegistry } from "./registry";
import type { IMachineState, IMachineType, SubAutomatonResolver } from "./types";
import { MachineError, MAX_CALL_DEPTH, MAX_CONFIGURATIONS } from "./types";
import type { IGraph } from "../graphs/abstract-graph";

/**
 * Generic execution engine for all automaton types.
 *
 * This class implements the BFS (breadth-first search) exploration algorithm
 * that is common to all automaton types. The type-specific behavior (state
 * representation, transition semantics, acceptance condition) is delegated
 * to the {@link IMachineType} strategy.
 *
 * **Algorithm**: The engine performs a breadth-first search over the
 * configuration space of the automaton. Starting from the initial
 * configuration, it explores all reachable configurations by following
 * transitions. The input is accepted if any reachable configuration
 * satisfies the acceptance condition.
 *
 * For non-deterministic automata (NFA, NPDA), the BFS naturally explores
 * all computation branches in parallel. This is equivalent to the standard
 * definition of NFA acceptance: the input is accepted if *there exists*
 * a computation path that leads to acceptance (Sipser, 2012, Definition 1.16).
 *
 * **RSM extension** (Alur & Yannakakis, 2001): When the engine encounters
 * a **call state** (box node), it invokes the referenced sub-automaton
 * on the remaining input. The sub-automaton is resolved via the
 * {@link SubAutomatonResolver} and executed recursively. The results
 * (remaining input after acceptance) are used to create new configurations
 * for the caller.
 *
 * This generic engine replaces the three separate machine classes
 * (FAMachine, TMachine, PDAMachine) that previously duplicated the
 * BFS logic. The Strategy pattern (Gamma et al., 1994) eliminates
 * this duplication while preserving the full semantics of each type.
 *
 * **Design pattern**: Template Method (Gamma et al., 1994) — the BFS
 * algorithm is the template, and the machine type strategy provides
 * the type-specific steps.
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation (3rd ed.).
 * @see Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
 * @see Gamma, E., et al. (1994). Design Patterns. Addison-Wesley.
 */
export class ExecutionEngine<TState extends IMachineState> {
  private readonly machineType: IMachineType<TState>;
  private graph: IGraph;

  /**
   * Optional resolver for sub-automaton calls (RSM extension).
   *
   * When set, the engine can handle call states (box nodes) by invoking
   * the referenced automaton. When null, call states are treated as
   * ordinary states (no sub-automaton invocation occurs).
   */
  public resolver: SubAutomatonResolver | null = null;

  constructor(machineType: IMachineType<TState>, graph: IGraph) {
    this.machineType = machineType;
    this.graph = graph;
  }

  /**
   * Sets the graph to execute on.
   */
  setGraph(graph: IGraph): void {
    this.graph = graph;
  }

  /**
   * Runs the automaton on the given input string.
   *
   * Performs a BFS over the configuration space, starting from the initial
   * configuration. Returns true if any accepting configuration is reachable.
   *
   * @param input - The input string to process
   * @returns true if the input is accepted, false if rejected
   * @throws MachineError if computation limits are exceeded
   * @throws Error if the graph is invalid or has no initial state
   */
  run(input: string): boolean {
    if (!this.graph.isValid()) {
      throw new Error("Invalid graph");
    }

    const initialNode = this.graph.getInitialNode();
    if (!initialNode) return false;

    const initialState = this.machineType.createInitialState(input, initialNode);

    const visited = new Set<string>();
    visited.add(initialState.toString());
    const queue: TState[] = [initialState];

    while (queue.length > 0) {
      if (visited.size > MAX_CONFIGURATIONS) {
        throw new MachineError(`Reached max configurations (${MAX_CONFIGURATIONS})`);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- This will not be undefined as we already check the length - but the queue interface treats it as such so ignore
      const current = queue.shift()!;

      if (current.isFinal()) {
        return true;
      }

      // ─── RSM Extension: Handle call states ───
      if (current.node.isCallState && this.resolver && current.node.callConfig) {
        const callConfig = current.node.callConfig;
        const currentInput = this.machineType.getRemainingInput(current);

        if (callConfig.callMode === "exit-mapped" && callConfig.exitMap) {
          // ─── Exit-mapped mode (Alur & Yannakakis, 2001: multiple return ports) ───
          // The callee's exit node label determines which outgoing transition to follow.
          const exitResults = this.invokeSubAutomatonWithExitInfo(current.node, currentInput, 0);
          for (const { remainingInput, exitNodeLabel } of exitResults) {
            const mappedTransitionLabel = callConfig.exitMap[exitNodeLabel];
            if (!mappedTransitionLabel) continue; // No mapping for this exit → dead branch

            // Find the specific outgoing edge whose transition matches the mapped label
            const postCallState = this.machineType.createInitialState(mappedTransitionLabel + remainingInput, current.node);
            const successors = this.machineType.getSuccessors(postCallState);
            for (const { state: next } of successors) {
              const key = next.toString();
              if (!visited.has(key)) {
                visited.add(key);
                queue.push(next);
              }
            }
          }
        } else {
          // ─── Accept-reject mode (standard RSM semantics) ───
          const callResults = this.invokeSubAutomaton(current.node, currentInput, 0);
          for (const remainingInput of callResults) {
            const postCallState = this.machineType.createInitialState(remainingInput, current.node);
            const successors = this.machineType.getSuccessors(postCallState);
            for (const { state: next } of successors) {
              const key = next.toString();
              if (!visited.has(key)) {
                visited.add(key);
                queue.push(next);
              }
            }
            if (remainingInput.length === 0 && current.node.final) {
              return true;
            }
          }
        }
        continue; // Skip normal transition processing for call states
      }

      // ─── Normal transitions ───
      const successors = this.machineType.getSuccessors(current);
      for (const { state: next } of successors) {
        const key = next.toString();
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(next);
        }
      }
    }

    return false;
  }

  /**
   * Collects all accepting configurations reachable from the initial state.
   *
   * Unlike {@link run} which returns a boolean, this method returns all
   * remaining input strings at which the automaton accepts. This is needed
   * for the RSM sub-automaton invocation mechanism: when a caller invokes
   * a sub-automaton, it needs to know all the different amounts of input
   * the callee might consume (non-determinism).
   *
   * @param input - The input string to process
   * @returns Array of remaining input strings (one per accepting configuration)
   */
  collectAcceptingConfigurations(input: string): string[] {
    return this.collectAcceptingConfigurationsWithExitInfo(input).map((r) => r.remainingInput);
  }

  /**
   * Like collectAcceptingConfigurations but also returns the exit node label
   * for each accepting configuration. This is needed for exit-mapped call mode
   * where the caller needs to know which specific exit the callee reached.
   */
  collectAcceptingConfigurationsWithExitInfo(input: string): { remainingInput: string; exitNodeLabel: string }[] {
    if (!this.graph.isValid()) return [];

    const initialNode = this.graph.getInitialNode();
    if (!initialNode) return [];

    const initialState = this.machineType.createInitialState(input, initialNode);
    const results: { remainingInput: string; exitNodeLabel: string }[] = [];
    const visited = new Set<string>();
    visited.add(initialState.toString());
    const queue: TState[] = [initialState];

    while (queue.length > 0) {
      if (visited.size > MAX_CONFIGURATIONS) {
        throw new MachineError(`Exceeded max configurations (${MAX_CONFIGURATIONS})`);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- This will not be undefined as we already check the length - but the queue interface treats it as such so ignore
      const current = queue.shift()!;

      if (current.node.final) {
        results.push({
          remainingInput: this.machineType.getRemainingInput(current),
          exitNodeLabel: current.node.label,
        });
      }

      // Handle nested call states
      if (current.node.isCallState && this.resolver && current.node.callConfig) {
        const subResults = this.invokeSubAutomaton(current.node, this.machineType.getRemainingInput(current), 0);
        for (const remaining of subResults) {
          const postCallState = this.machineType.createInitialState(remaining, current.node);
          for (const { state: next } of this.machineType.getSuccessors(postCallState)) {
            const key = next.toString();
            if (!visited.has(key)) {
              visited.add(key);
              queue.push(next);
            }
          }
        }
        continue;
      }

      for (const { state: next } of this.machineType.getSuccessors(current)) {
        const key = next.toString();
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(next);
        }
      }
    }

    return results;
  }

  /**
   * Invokes a sub-automaton on the given input, returning all possible
   * remaining input strings after acceptance.
   *
   * This implements the RSM call semantics: the sub-automaton reads from
   * the current input position and may accept after consuming different
   * amounts of input (non-determinism). Each accepting configuration
   * produces a different "remaining input" that the caller can continue with.
   *
   * The sub-automaton type is determined by the target graph's `shortName`,
   * and the appropriate machine type strategy is looked up from the registry.
   * This enables **cross-type composition**: an FA can call a PDA, a PDA
   * can call a TM, etc.
   *
   * @param callNode - The call state node containing the sub-automaton reference
   * @param input - The remaining input to pass to the sub-automaton
   * @param depth - Current call depth (for recursion limiting)
   * @returns Array of remaining input strings (one per accepting configuration)
   */
  private invokeSubAutomaton(callNode: import("../node").Node, input: string, depth: number): string[] {
    if (depth >= MAX_CALL_DEPTH) {
      throw new MachineError(
        `Sub-automaton call depth exceeded (${MAX_CALL_DEPTH}). ` + `This may indicate infinite recursion in the RSM system.`,
      );
    }

    if (!callNode.callConfig || !this.resolver) return [];

    const targetGraph = this.resolver(callNode.callConfig.targetAutomatonId);
    if (!targetGraph) {
      throw new MachineError(`Call state "${callNode.label}" references unknown automaton "${callNode.callConfig.targetAutomatonId}".`);
    }

    // Look up the machine type for the target graph from the registry.
    // This is where cross-type composition happens: the target may be
    // a different automaton type than the caller.
    const targetType = MachineTypeRegistry.get(targetGraph.shortName);
    if (!targetType) {
      throw new MachineError(`No machine type registered for graph type "${targetGraph.shortName}".`);
    }

    // Create a child execution engine for the sub-automaton
    const childEngine = new ExecutionEngine(targetType, targetGraph);
    childEngine.resolver = this.resolver; // Propagate resolver for nested calls

    // For FA and PDA targets, collect all accepting configurations
    // (each consuming a different amount of input).
    // For TM targets, use oracle semantics (accept/reject, input unchanged).
    if (targetType.shortName === "TM") {
      // TM sub-automata use oracle semantics: the TM is a yes/no predicate.
      // If it accepts, the caller continues with the input unchanged.
      // This matches the standard subroutine/oracle model in computability
      // theory (Sipser, 2012, Theorem 3.16; Rogers, 1967, §9.7).
      try {
        if (childEngine.run(input)) {
          return [input];
        }
      } catch {
        // TM error — treat as rejection
      }
      return [];
    } else {
      // FA and PDA: collect all accepting configurations
      return childEngine.collectAcceptingConfigurations(input);
    }
  }

  /**
   * Like invokeSubAutomaton but returns exit node labels alongside remaining input.
   * Used by exit-mapped call mode to determine which return port the callee used.
   */
  private invokeSubAutomatonWithExitInfo(
    callNode: import("../node").Node,
    input: string,
    depth: number,
  ): { remainingInput: string; exitNodeLabel: string }[] {
    if (depth >= MAX_CALL_DEPTH) {
      throw new MachineError(
        `Sub-automaton call depth exceeded (${MAX_CALL_DEPTH}). ` + `This may indicate infinite recursion in the RSM system.`,
      );
    }

    if (!callNode.callConfig || !this.resolver) return [];

    const targetGraph = this.resolver(callNode.callConfig.targetAutomatonId);
    if (!targetGraph) {
      throw new MachineError(`Call state "${callNode.label}" references unknown automaton "${callNode.callConfig.targetAutomatonId}".`);
    }

    const targetType = MachineTypeRegistry.get(targetGraph.shortName);
    if (!targetType) {
      throw new MachineError(`No machine type registered for graph type "${targetGraph.shortName}".`);
    }

    const childEngine = new ExecutionEngine(targetType, targetGraph);
    childEngine.resolver = this.resolver;

    if (targetType.shortName === "TM") {
      try {
        if (childEngine.run(input)) {
          // For TM, we don't have a specific exit node — use a generic label
          return [{ remainingInput: input, exitNodeLabel: "__TM_ACCEPT__" }];
        }
      } catch {
        // TM error
      }
      return [];
    } else {
      return childEngine.collectAcceptingConfigurationsWithExitInfo(input);
    }
  }
}
