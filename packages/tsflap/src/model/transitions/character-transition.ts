import { EPSILON, UNKNOWN } from "../symbols";
import type { ITransitionPart, Transition } from "./types";
import { EditableTransitionPart } from "./types";

/**
 * Transition for a Finite Automaton — a single input character (or ε).
 *
 * In the formal definition of an NFA (Sipser, 2012, Definition 1.5),
 * the transition function is δ: Q × (Σ ∪ {ε}) → P(Q). Each transition
 * reads one character from the input (or ε to not consume input) and
 * moves to a new state.
 *
 * For a DFA (Sipser, 2012, Definition 1.5), the transition function is
 * δ: Q × Σ → Q — exactly one transition per symbol, no ε-transitions.
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 1.5.
 */
export class CharacterTransition implements Transition {
  public pending = false;
  public character: string;

  constructor(character: string, pending?: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint does not realize that if pending is passed from a property of a null object it too will be null not undefined
    if (pending !== null && pending !== undefined) {
      this.pending = pending;
    }
    if (character.length > 1) {
      throw new Error("Character Transition length must be less than or equal to 1");
    } else {
      this.character = character;
    }
  }

  toString(): string {
    return !this.pending ? this.character : UNKNOWN;
  }

  canFollowOn(input: string): boolean {
    if (this.pending) {
      return false;
    }
    return this.character === EPSILON ? true : input.startsWith(this.character);
  }

  getTransitionParts(): ITransitionPart[] {
    return [
      new EditableTransitionPart(
        this.character,
        (newContent: string, transition: Transition) => ((transition as CharacterTransition).character = newContent),
      ),
    ];
  }

  clone(): Transition {
    return new CharacterTransition(this.character, this.pending);
  }
}
