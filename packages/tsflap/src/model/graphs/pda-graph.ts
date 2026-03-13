import type { Edge } from "../edge";
import { EPSILON, INITIAL_STACK } from "../symbols";
import type { Transition } from "../transitions";
import { PushdownTransition } from "../transitions";
import { AbstractGraph } from "./abstract-graph";

/**
 * Pushdown Automaton Graph.
 *
 * Represents a Pushdown Automaton — the computational model for context-free
 * languages (Type 2 in the Chomsky hierarchy).
 *
 * A PDA is formally defined as a 7-tuple (Q, Σ, Γ, δ, q₀, Z₀, F) where:
 * - Q is a finite set of states
 * - Σ is the input alphabet
 * - Γ is the stack alphabet
 * - δ: Q × (Σ ∪ {ε}) × Γ → P(Q × Γ*) is the transition function
 * - q₀ ∈ Q is the initial state
 * - Z₀ ∈ Γ is the initial stack symbol
 * - F ⊆ Q is the set of accepting states
 *
 * Transitions are tuples: (input char, pop from stack, push to stack).
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 2.13.
 */
export class PDAGraph extends AbstractGraph {
  public shortName = "PDA";

  /** The stack alphabet Γ (computed from transitions). */
  public stackAlphabet: Record<string, boolean> = {};

  createTransitionFromString(transition: string, pending: boolean): Transition {
    // Parse "char, pop → push" format (e.g., "a, $ → A$")
    // Also handles "char,pop→push" without spaces
    const arrowIndex = transition.indexOf("→");
    if (arrowIndex !== -1) {
      const left = transition.substring(0, arrowIndex).trim();
      const push = transition.substring(arrowIndex + 1).trim();
      const commaIndex = left.indexOf(",");
      if (commaIndex !== -1) {
        const char = left.substring(0, commaIndex).trim();
        const pop = left.substring(commaIndex + 1).trim();
        return new PushdownTransition(char, pop, push, pending);
      }
    }
    return new PushdownTransition("", "", "", pending);
  }

  updateAlphabetForEdge(edge: Edge): void {
    const pdTransition = edge.transition as PushdownTransition;

    // Input alphabet: only the char field (excluding lambda)
    // eslint-disable-next-line no-prototype-builtins -- We aren't parsing JSON payloads from a client request - this is a prototype of a domain object which we ourselves create it is safe to use
    if (pdTransition.char && pdTransition.char !== EPSILON && !this.alphabet.hasOwnProperty(pdTransition.char)) {
      this.alphabet[pdTransition.char] = true;
    }

    // Stack alphabet
    // eslint-disable-next-line no-prototype-builtins -- We aren't parsing JSON payloads from a client request - this is a prototype of a domain object which we ourselves create it is safe to use
    if (pdTransition.pop && !this.stackAlphabet.hasOwnProperty(pdTransition.pop)) {
      this.stackAlphabet[pdTransition.pop] = true;
    }
    if (pdTransition.push) {
      for (const ch of pdTransition.push) {
        // eslint-disable-next-line no-prototype-builtins -- We aren't parsing JSON payloads from a client request - this is a prototype of a domain object which we ourselves create it is safe to use
        if (!this.stackAlphabet.hasOwnProperty(ch)) {
          this.stackAlphabet[ch] = true;
        }
      }
    }
  }

  updateAlphabet(): void {
    this.alphabet = {};
    this.stackAlphabet = {};
    this.stackAlphabet[INITIAL_STACK] = true;
    this.edges.items.forEach((edge: Edge) => this.updateAlphabetForEdge(edge));
  }

  getStackAlphabet(): Record<string, boolean> {
    this.updateAlphabet();
    return this.stackAlphabet;
  }

  getEmptyTransitionCharacter(): string {
    return EPSILON;
  }

  /**
   * PDA validity: must have initial state and at least one final state.
   *
   * For DPDA: no two transitions from the same state can match the same
   * (input char, stack top) combination. Lambda (ε) matches everything,
   * so a lambda transition conflicts with any other transition.
   */
  isValid(): boolean {
    if (!this.initialNode || this.getFinalNodes().size === 0) {
      return false;
    }

    if (this.deterministic) {
      for (const node of this.nodes.items) {
        const seenTuples: { char: string; pop: string }[] = [];

        for (const edge of node.toEdges.items) {
          const t = edge.transition as PushdownTransition;
          if (t.pending) continue;

          for (const seen of seenTuples) {
            const charOverlap = t.char === "" || seen.char === "" || t.char === seen.char;
            const popOverlap = t.pop === "" || seen.pop === "" || t.pop === seen.pop;
            if (charOverlap && popOverlap) {
              return false;
            }
          }
          seenTuples.push({ char: t.char, pop: t.pop });
        }
      }
    }

    return true;
  }
}
