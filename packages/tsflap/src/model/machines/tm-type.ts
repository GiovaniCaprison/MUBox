import type { Edge } from "../edge";
import type { IGraph } from "../graphs/abstract-graph";
import { TMGraph } from "../graphs/tm-graph";
import type { Node } from "../node";
import { BLANK } from "../symbols";
import { TuringTransition } from "../transitions";
import type { CallTraceEntry, IMachineState, IMachineType, StepSimulationConfig, TMSimulationConfig } from "./types";

/**
 * Machine state for a Turing Machine.
 *
 * A TM configuration (instantaneous description) is a triple (tape, head, q) where:
 * - tape ∈ Γ* is the current tape contents (infinite in both directions, but
 *   represented as a finite array with null for blank cells)
 * - head ∈ ℕ is the current head position on the tape
 * - q ∈ Q is the current state
 *
 * The machine accepts when it reaches a final state with no available transitions
 * (halting in an accepting state). This differs from FA/PDA acceptance, which
 * requires the input to be fully consumed.
 *
 * **Formal definition** (Sipser, 2012, Definition 3.3):
 * A TM is a 7-tuple (Q, Σ, Γ, δ, q₀, q_accept, q_reject) where:
 * - δ: Q × Γ → Q × Γ × {L, R} is the transition function
 * - The machine reads the symbol under the head, writes a new symbol,
 *   and moves the head left or right.
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 3.3.
 */
export class TMachineState implements IMachineState {
  public readonly input: (string | null)[];
  public readonly inputPosition: number;
  public readonly node: Node;

  constructor(input: (string | null)[], inputPosition: number, node: Node) {
    this.input = input;
    this.inputPosition = inputPosition;
    this.node = node;
  }

  /**
   * A TM configuration is accepting when the machine halts in a final state.
   * "Halting" means no outgoing transitions match the current tape symbol.
   * This is checked by verifying both that the state is final AND that
   * no transitions can be followed.
   */
  isFinal(): boolean {
    return this.getNextStatesRaw().length === 0 && this.node.final;
  }

  /**
   * Computes raw successor states (without edge tracking).
   * Used internally by isFinal() to check for halting.
   */
  getNextStatesRaw(): TMachineState[] {
    const edgeList = this.node.toEdges.items;
    const nextStates: TMachineState[] = [];

    for (const edge of edgeList) {
      const transition = edge.transition as TuringTransition;

      if (transition.pending) continue;

      if (transition.canFollowOn(this.input[this.inputPosition] ?? "")) {
        if (typeof transition.direction !== "undefined") {
          let newInputPosition = this.inputPosition + (transition.direction ?? 0);
          const newInput = this.input.slice();
          newInput[this.inputPosition] = transition.write;

          if (newInputPosition < 0) {
            newInputPosition = 0;
            newInput.unshift(null);
          } else if (newInputPosition >= newInput.length) {
            newInput.push(null);
          }

          nextStates.push(new TMachineState(newInput, newInputPosition, edge.to));
        }
      }
    }

    return nextStates;
  }

  toString(): string {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- To string for a null input provides us with a null part for the input - eslint thinks it's a bad thing - for us it's not here
    return `(${this.input}, ${this.inputPosition}, ${this.node.toString()})`;
  }
}

/**
 * Machine type strategy for Turing Machines.
 *
 * Turing Machines are the most powerful standard model of computation in the
 * Chomsky hierarchy (Type 0, recursively enumerable languages). A TM operates
 * on an infinite tape, reading and writing symbols, moving the head left or right.
 *
 * **Formal definition** (Sipser, 2012, Definition 3.3):
 * A TM is a 7-tuple (Q, Σ, Γ, δ, q₀, q_accept, q_reject) where:
 * - Q is a finite set of states
 * - Σ is the input alphabet (not including the blank symbol)
 * - Γ is the tape alphabet (Σ ⊆ Γ, includes the blank symbol ☐)
 * - δ: Q × Γ → Q × Γ × {L, R} is the transition function
 * - q₀ is the start state
 * - q_accept is the accept state
 * - q_reject is the reject state
 *
 * **Transition semantics**: At each step, the machine reads the symbol under
 * the head, writes a new symbol to the tape, and moves the head one cell
 * left or right. The machine halts when it enters a state with no matching
 * transition for the current tape symbol.
 *
 * **Acceptance**: The machine accepts when it halts in a final (accepting) state.
 * Unlike FA and PDA, acceptance does NOT require the input to be fully consumed —
 * the TM can move its head freely over the tape.
 *
 * **RSM extension**: TM-to-TM calls correspond to the standard subroutine model
 * of computation (Sipser, 2012, Theorem 3.16). Each callee gets a fresh tape.
 * Turing machines are closed under composition, so the resulting system remains
 * recursively enumerable.
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation (3rd ed.).
 * @see Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
 */
export class TMMachineType implements IMachineType<TMachineState> {
  readonly shortName = "TM";
  readonly displayName = "Turing Machine";

  createInitialState(input: string, initialNode: Node): TMachineState {
    const inputTape: (string | null)[] = input.length > 0 ? input.split("") : [null];
    return new TMachineState(inputTape, 0, initialNode);
  }

  getSuccessors(state: TMachineState): { state: TMachineState; edge: Edge }[] {
    const results: { state: TMachineState; edge: Edge }[] = [];
    const edgeList = state.node.toEdges.items;

    for (const edge of edgeList) {
      const transition = edge.transition as TuringTransition;

      if (transition.pending) continue;

      if (transition.canFollowOn(state.input[state.inputPosition] ?? "")) {
        if (typeof transition.direction !== "undefined") {
          let newInputPosition = state.inputPosition + (transition.direction ?? 0);
          const newInput = state.input.slice();
          newInput[state.inputPosition] = transition.write;

          if (newInputPosition < 0) {
            newInputPosition = 0;
            newInput.unshift(null);
          } else if (newInputPosition >= newInput.length) {
            newInput.push(null);
          }

          results.push({
            state: new TMachineState(newInput, newInputPosition, edge.to),
            edge,
          });
        }
      }
    }

    return results;
  }

  getRemainingInput(state: TMachineState): string {
    return state.input
      .slice(state.inputPosition)
      .map((c) => (c ?? ""))
      .join("");
  }

  describeState(state: TMachineState): string {
    const tapeStr = state.input
      .map((cell, i) => {
        const ch = cell ?? BLANK;
        return i === state.inputPosition ? `[${ch}]` : ch;
      })
      .join("");
    return `State ${state.node.label}, tape: [${tapeStr}]`;
  }

  createGraph(deterministic: boolean): IGraph {
    return new TMGraph(deterministic);
  }

  readonly stepConfig: StepSimulationConfig = {
    maxVisitCount: 100,
    maxConfigurations: 1000,
    retainAcceptingInFrontier: true,
    skipAcceptingSuccessors: true,
  };

  createSimulationConfig(state: TMachineState, callTrace?: readonly CallTraceEntry[]): TMSimulationConfig {
    const tapeStr = state.input
      .map((cell, i) => {
        const ch = cell ?? BLANK;
        return i === state.inputPosition ? `[${ch}]` : ch;
      })
      .join("");
    return {
      node: state.node,
      tape: state.input,
      headPosition: state.inputPosition,
      description: `State ${state.node.label}, tape: [${tapeStr}]`,
      isFinal: state.isFinal(),
      callTrace: callTrace && callTrace.length > 0 ? callTrace : undefined,
    };
  }
}
