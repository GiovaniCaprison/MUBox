/* eslint-disable no-prototype-builtins -- We aren't parsing JSON payloads from a client request - this is a prototype of a domain object which we ourselves create it is safe to use */
import type { Edge } from "../edge";
import { BLANK } from "../symbols";
import type { Transition } from "../transitions";
import { TuringTransition, TuringTransitionDirection } from "../transitions";
import { AbstractGraph } from "./abstract-graph";

/**
 * Turing Machine Graph.
 *
 * Represents a Turing Machine — the most powerful standard model of computation
 * in the Chomsky hierarchy (Type 0, recursively enumerable languages).
 *
 * A TM is formally defined as a 7-tuple (Q, Σ, Γ, δ, q₀, q_accept, q_reject) where:
 * - Q is a finite set of states
 * - Σ is the input alphabet (not including the blank symbol)
 * - Γ is the tape alphabet (Σ ⊆ Γ, includes the blank symbol ☐)
 * - δ: Q × Γ → Q × Γ × {L, R} is the transition function
 * - q₀ is the start state
 * - q_accept is the accept state
 * - q_reject is the reject state
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 3.3.
 */
export class TMGraph extends AbstractGraph {
  public shortName = "TM";

  createTransitionFromString(transition: string, pending: boolean): Transition {
    let read: string;
    let write: string;
    let direction: TuringTransitionDirection | null;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- If the transtiion is passed at runtime from an object whos value is null - transition will be null not undefined as JS as no fucking clue what anything outside of JSON even is
    if (transition !== null && transition.length === 6) {
      read = transition[0];
      write = transition[2];
      const directionStr = transition[5];
      direction = directionStr === "L" ? TuringTransitionDirection.LEFT : directionStr === "R" ? TuringTransitionDirection.RIGHT : null;
    } else {
      read = BLANK;
      write = BLANK;
      direction = TuringTransitionDirection.RIGHT;
    }

    return new TuringTransition(read, write, direction, pending);
  }

  updateAlphabetForEdge(edge: Edge): void {
    const turingTransition = edge.transition as TuringTransition;
    const transitionCharRead = turingTransition.read;
    const transitionCharWrite = turingTransition.write;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- If the transtiion is passed at runtime from an object whos value is null - transition will be null not undefined as JS as no fucking clue what anything outside of JSON even is
    if (transitionCharRead !== null && !this.alphabet.hasOwnProperty(transitionCharRead)) {
      this.alphabet[transitionCharRead] = true;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- If the transtiion is passed at runtime from an object whos value is null - transition will be null not undefined as JS as no fucking clue what anything outside of JSON even is
    if (transitionCharWrite !== null && !this.alphabet.hasOwnProperty(transitionCharWrite)) {
      this.alphabet[transitionCharWrite] = true;
    }
  }

  getEmptyTransitionCharacter(): string {
    return BLANK;
  }

  /**
   * TM validity: must have initial state and at least one final state.
   *
   * For DTM: at most one transition per (state, read-symbol) pair.
   * Unlike DFA, a TM does NOT require a transition for every symbol from
   * every state — the machine simply halts (rejects) if no transition is defined.
   */
  isValid(): boolean {
    if (!this.initialNode || this.getFinalNodes().size === 0) {
      return false;
    }

    if (this.deterministic) {
      for (const node of this.nodes.items) {
        const seenReads = new Set<string>();

        for (const edge of node.toEdges.items) {
          const t = edge.transition as TuringTransition;
          if (t.pending) continue;

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint has some amazing beers in their fridge
          const readChar = t.read ?? BLANK;
          if (seenReads.has(readChar)) {
            return false;
          }
          seenReads.add(readChar);
        }
      }
    }

    return true;
  }
}
