import type { Edge } from "../edge";
import type { IGraph } from "../graphs/abstract-graph";
import { PDAGraph } from "../graphs/pda-graph";
import type { Node } from "../node";
import { INITIAL_STACK } from "../symbols";
import { PushdownTransition } from "../transitions";
import type { CallTraceEntry, IMachineState, IMachineType, PDASimulationConfig, StepSimulationConfig } from "./types";

/**
 * Machine state for a Pushdown Automaton.
 *
 * A PDA configuration (instantaneous description) is a triple (w, γ, q) where:
 * - w ∈ Σ* is the remaining (unconsumed) input
 * - γ ∈ Γ* is the current stack contents (top of stack is the leftmost character)
 * - q ∈ Q is the current state
 *
 * This is the standard formalism for describing a PDA's configuration at any
 * point during computation (Sipser, 2012, Definition 2.13). The triple
 * captures everything needed to determine the machine's future behavior.
 *
 * The machine accepts if it reaches a configuration (ε, γ, q_f) where q_f ∈ F
 * (input fully consumed and in a final state). Note: acceptance by final state,
 * not by empty stack — both are equivalent (Sipser, 2012, Theorem 2.20).
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 2.13.
 */
export class PDAMachineState implements IMachineState {
  public readonly word: string;
  public readonly stack: string;
  public readonly node: Node;

  constructor(word: string, stack: string, node: Node) {
    this.word = word;
    this.stack = stack;
    this.node = node;
  }

  isFinal(): boolean {
    return this.word.length === 0 && this.node.final;
  }

  toString(): string {
    return "(" + this.word + ", " + this.stack + ", " + this.node.toString() + ")";
  }
}

/**
 * Machine type strategy for Pushdown Automata.
 *
 * Pushdown Automata are the computational model for context-free languages
 * (Type 2 in the Chomsky hierarchy). A PDA extends a finite automaton with
 * a stack — an unbounded LIFO memory. Each transition can read an input
 * symbol (or ε), pop a symbol from the stack, and push symbols onto the stack.
 *
 * **Formal definition** (Sipser, 2012, Definition 2.13):
 * A PDA is a 6-tuple (Q, Σ, Γ, δ, q₀, F) where:
 * - Q is a finite set of states
 * - Σ is the input alphabet
 * - Γ is the stack alphabet
 * - δ: Q × (Σ ∪ {ε}) × (Γ ∪ {ε}) → P(Q × (Γ ∪ {ε})) is the transition function
 * - q₀ ∈ Q is the start state
 * - F ⊆ Q is the set of accept states
 *
 * **Transition semantics**: Each transition is a tuple (input char, pop, push):
 * - Read an input character (or ε to not consume input)
 * - Pop a symbol from the stack (or ε to not pop)
 * - Push a string onto the stack (or ε to not push; leftmost char becomes new top)
 *
 * **RSM extension — the path to Turing-completeness**:
 * This is where the RSM framework produces its most striking theoretical result.
 * When a PDA calls another PDA, each invocation gets its own **fresh stack**
 * (initialized with Z₀). The RSM call stack provides an additional level of
 * memory beyond the PDA's own stack.
 *
 * A classical result in automata theory (Hopcroft & Ullman, 1979; Minsky, 1967)
 * shows that a machine with **two independent stacks** can simulate a Turing
 * machine. In our RSM system, a PDA calling another PDA has exactly this:
 * the caller's stack and the callee's stack are independent. With recursive
 * calls, the system can create arbitrarily many stack instances, making it
 * **Turing-complete**.
 *
 * This is a profound result: PDAs alone recognize only context-free languages
 * (Type 2 in the Chomsky hierarchy), but PDAs with sub-automaton calls can
 * recognize recursively enumerable languages (Type 0) — jumping two levels
 * in the hierarchy through the simple mechanism of hierarchical composition.
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation (3rd ed.).
 * @see Hopcroft, J. E., & Ullman, J. D. (1979). Introduction to Automata Theory,
 *      Languages, and Computation. Addison-Wesley. (Two-stack PDA = TM)
 * @see Minsky, M. (1967). Computation: Finite and Infinite Machines. Prentice-Hall.
 * @see Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
 */
export class PDAMachineType implements IMachineType<PDAMachineState> {
  readonly shortName = "PDA";
  readonly displayName = "Pushdown Automaton";

  createInitialState(input: string, initialNode: Node): PDAMachineState {
    return new PDAMachineState(input, INITIAL_STACK, initialNode);
  }

  getSuccessors(state: PDAMachineState): { state: PDAMachineState; edge: Edge }[] {
    const results: { state: PDAMachineState; edge: Edge }[] = [];
    const edgeList = state.node.toEdges.items;

    for (const edge of edgeList) {
      const transition = edge.transition as PushdownTransition;

      if (transition.pending) continue;

      if (transition.canFollowOn(state.word, state.stack)) {
        const [newWord, newStack] = transition.applyTo(state.word, state.stack);
        results.push({
          state: new PDAMachineState(newWord, newStack, edge.to),
          edge,
        });
      }
    }

    return results;
  }

  getRemainingInput(state: PDAMachineState): string {
    return state.word;
  }

  describeState(state: PDAMachineState): string {
    return `State ${state.node.label}, input: "${state.word}", stack: [${state.stack}]`;
  }

  createGraph(deterministic: boolean): IGraph {
    return new PDAGraph(deterministic);
  }

  readonly stepConfig: StepSimulationConfig = {
    maxVisitCount: 1,
    maxConfigurations: 10000,
    retainAcceptingInFrontier: false,
    skipAcceptingSuccessors: true,
  };

  createSimulationConfig(state: PDAMachineState, callTrace?: readonly CallTraceEntry[]): PDASimulationConfig {
    return {
      node: state.node,
      remainingInput: state.word,
      stack: state.stack,
      description: `State ${state.node.label}, input: "${state.word}", stack: [${state.stack}]`,
      isFinal: state.isFinal(),
      callTrace: callTrace && callTrace.length > 0 ? callTrace : undefined,
    };
  }
}
