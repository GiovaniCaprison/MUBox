import type { Edge } from "../edge";
import type { IGraph } from "../graphs/abstract-graph";
import { FAGraph } from "../graphs/fa-graph";
import type { Node } from "../node";
import { EPSILON } from "../symbols";
import { CharacterTransition } from "../transitions";
import type { CallTraceEntry, FASimulationConfig, IMachineState, IMachineType, StepSimulationConfig } from "./types";

/**
 * Machine state for a Finite Automaton.
 *
 * An FA configuration is a pair (w, q) where:
 * - w ∈ Σ* is the remaining (unconsumed) input
 * - q ∈ Q is the current state
 *
 * The machine accepts if it reaches a configuration (ε, q_f) where q_f ∈ F
 * (input fully consumed and in a final state).
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 1.5.
 */
export class FAMachineState implements IMachineState {
  public readonly input: string;
  public readonly node: Node;

  constructor(input: string, node: Node) {
    this.input = input;
    this.node = node;
  }

  isFinal(): boolean {
    return this.input.length === 0 && this.node.final;
  }

  toString(): string {
    return "(" + this.input + ", " + this.node.toString() + ")";
  }
}

/**
 * Machine type strategy for Finite Automata (DFA and NFA).
 *
 * Finite Automata are the simplest standard model of computation in the
 * Chomsky hierarchy (Type 3, regular languages). An FA reads input symbols
 * one at a time, transitioning between states. It accepts if it reaches
 * a final state with the input fully consumed.
 *
 * **Formal definition** (Sipser, 2012, Definition 1.5):
 * An NFA is a 5-tuple (Q, Σ, δ, q₀, F) where:
 * - Q is a finite set of states
 * - Σ is the input alphabet
 * - δ: Q × (Σ ∪ {ε}) → P(Q) is the transition function
 * - q₀ ∈ Q is the start state
 * - F ⊆ Q is the set of accept states
 *
 * **Transition semantics**: At each step, the machine reads the current
 * input symbol (or takes an ε-transition without consuming input) and
 * moves to a successor state. For NFAs, multiple successors are possible,
 * and the machine accepts if *any* computation path reaches acceptance.
 *
 * **RSM extension** (Alur & Yannakakis, 2001): When an FA calls another
 * automaton recursively, the implicit call stack acts as a pushdown stack,
 * making the system equivalent to a PDA. This is the central theorem of
 * Alur & Yannakakis (2001): RSMs over finite automata recognize exactly
 * the context-free languages.
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation (3rd ed.).
 * @see Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
 *      ACM TOPLAS, 23(6), 731-782.
 */
export class FAMachineType implements IMachineType<FAMachineState> {
  readonly shortName = "FA";
  readonly displayName = "Finite Automaton";

  createInitialState(input: string, initialNode: Node): FAMachineState {
    return new FAMachineState(input, initialNode);
  }

  getSuccessors(state: FAMachineState): { state: FAMachineState; edge: Edge }[] {
    const results: { state: FAMachineState; edge: Edge }[] = [];
    const edgeList = state.node.toEdges.items;

    for (const edge of edgeList) {
      const transition = edge.transition as CharacterTransition;

      if (transition.pending) continue;

      if (transition.canFollowOn(state.input)) {
        const inputLength = transition.character.length === 1 && transition.character !== EPSILON ? 1 : 0;
        const nextState = new FAMachineState(state.input.substring(inputLength), edge.to);
        results.push({ state: nextState, edge });
      }
    }

    return results;
  }

  getRemainingInput(state: FAMachineState): string {
    return state.input;
  }

  describeState(state: FAMachineState): string {
    return `State ${state.node.label}, input: "${state.input}"`;
  }

  createGraph(deterministic: boolean): IGraph {
    return new FAGraph(deterministic);
  }

  readonly stepConfig: StepSimulationConfig = {
    maxVisitCount: 1,
    maxConfigurations: Infinity,
    retainAcceptingInFrontier: false,
    skipAcceptingSuccessors: false,
  };

  createSimulationConfig(state: FAMachineState, callTrace?: readonly CallTraceEntry[]): FASimulationConfig {
    return {
      node: state.node,
      remainingInput: state.input,
      description: state.node.isCallState
        ? `State ${state.node.label} ⟨awaiting call to ${state.node.callConfig?.targetAutomatonId ?? "?"}⟩, input: "${state.input}"`
        : `State ${state.node.label}, input: "${state.input}"`,
      isFinal: state.isFinal(),
      callTrace: callTrace && callTrace.length > 0 ? callTrace : undefined,
    };
  }
}
