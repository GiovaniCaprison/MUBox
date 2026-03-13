import type { Edge } from "../edge";
import { BLANK, EPSILON } from "../symbols";
import type { Transition } from "../transitions";
import { CharacterTransition } from "../transitions";
import { AbstractGraph } from "./abstract-graph";

/**
 * Finite Automaton Graph (DFA / NFA).
 *
 * Represents a finite automaton — the simplest standard model of computation
 * in the Chomsky hierarchy (Type 3, regular languages).
 *
 * An FA is formally defined as a 5-tuple (Q, Σ, δ, q₀, F) where:
 * - Q is a finite set of states
 * - Σ is the input alphabet
 * - δ: Q × (Σ ∪ {ε}) → P(Q) is the transition function (NFA) or Q × Σ → Q (DFA)
 * - q₀ ∈ Q is the initial state
 * - F ⊆ Q is the set of accepting states
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 1.5.
 */
export class FAGraph extends AbstractGraph {
  public shortName = "FA";

  createTransitionFromString(transition: string, pending: boolean): Transition {
    return new CharacterTransition(transition, pending);
  }

  updateAlphabetForEdge(edge: Edge): void {
    const transitionChar = edge.transition.toString();
    // eslint-disable-next-line no-prototype-builtins -- We aren't parsing JSON payloads from a client request - this is a prototype of a domain object which we ourselves create it is safe to use
    if (!this.alphabet.hasOwnProperty(transitionChar) && transitionChar !== EPSILON && transitionChar !== BLANK) {
      this.alphabet[transitionChar] = true;
    }
  }

  getEmptyTransitionCharacter(): string {
    return EPSILON;
  }

  /**
   * Validates the FA.
   *
   * **All FAs**: Must have an initial state and at least one final state.
   *
   * **DFA additional requirements** (Sipser, 2012, Definition 1.5):
   * - Exactly one transition per symbol from each state (total function)
   * - No ε-transitions
   */
  isValid(): boolean {
    if (!this.initialNode || this.getFinalNodes().size === 0) {
      return false;
    }

    this.updateAlphabet();

    if (this.deterministic) {
      for (const node of this.nodes.items) {
        const alphabet = { ...this.alphabet };

        for (const edge of node.toEdges.items) {
          const transitionChar = edge.transition.toString();
          // eslint-disable-next-line no-prototype-builtins -- We aren't parsing JSON payloads from a client request - this is a prototype of a domain object which we ourselves create it is safe to use
          if (transitionChar !== BLANK && transitionChar !== EPSILON && alphabet.hasOwnProperty(transitionChar)) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- We need to dynamically delete keys here - otherwise we precompute and build a list of keys to delete - which I think is shit
            delete alphabet[transitionChar];
          } else {
            return false;
          }
        }

        if (Object.keys(alphabet).length > 0) {
          return false;
        }
      }
    }

    return true;
  }
}
