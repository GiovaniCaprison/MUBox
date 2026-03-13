import { EPSILON, UNKNOWN } from "../symbols";
import type { ITransitionPart, Transition } from "./types";
import { EditableTransitionPart, StaticTransitionPart } from "./types";

/**
 * Transition for a Pushdown Automaton — read char, pop from stack, push to stack.
 *
 * In the formal definition of a PDA (Sipser, 2012, Definition 2.13),
 * the transition function is δ: Q × (Σ ∪ {ε}) × (Γ ∪ {ε}) → P(Q × (Γ ∪ {ε})).
 * Each transition is a tuple (input char, pop symbol, push string):
 *
 * - **char**: The input character to read (ε = don't consume input)
 * - **pop**: The stack symbol to pop (ε = don't pop)
 * - **push**: The string to push onto the stack (ε = don't push;
 *   leftmost character becomes the new stack top)
 *
 * The transition is displayed as "char, pop → push" (e.g., "a, $ → A$").
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 2.13.
 */
export class PushdownTransition implements Transition {
  public pending = false;

  /** The input character to read (empty string = epsilon/lambda) */
  public char: string;

  /** The stack symbol to pop (empty string = don't pop) */
  public pop: string;

  /** The string to push onto the stack (can be multiple characters, empty = don't push) */
  public push: string;

  constructor(char: string, pop: string, push: string, pending?: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint does not realize that if pending is passed from a property of a null object it too will be null not undefined
    if (pending !== null && pending !== undefined) {
      this.pending = pending;
    }
    this.char = char;
    this.pop = pop;
    this.push = push;
  }

  toString(): string {
    if (this.pending) {
      return UNKNOWN;
    }
    const charDisplay = this.char || EPSILON;
    const popDisplay = this.pop || EPSILON;
    const pushDisplay = this.push || EPSILON;
    return charDisplay + ", " + popDisplay + " → " + pushDisplay;
  }

  /**
   * Can this transition be taken given the current input and stack top?
   */
  canFollowOn(input: string, stackTop: string): boolean {
    if (this.pending) return false;

    // Empty string or the epsilon symbol (ε) both mean "don't check this field"
    const charIsEpsilon = this.char === "" || this.char === EPSILON;
    const popIsEpsilon = this.pop === "" || this.pop === EPSILON;

    const charMatches = charIsEpsilon || (input.length > 0 && this.char === input.charAt(0));
    const popMatches = popIsEpsilon || (stackTop.length > 0 && this.pop === stackTop.charAt(0));

    return charMatches && popMatches;
  }

  getTransitionParts(): ITransitionPart[] {
    return [
      new EditableTransitionPart(
        this.char,
        (newContent: string, transition: Transition) => ((transition as PushdownTransition).char = newContent),
      ),
      new StaticTransitionPart(","),
      new EditableTransitionPart(
        this.pop,
        (newContent: string, transition: Transition) => ((transition as PushdownTransition).pop = newContent),
      ),
      new StaticTransitionPart("→"),
      new EditableTransitionPart(
        this.push,
        (newContent: string, transition: Transition) => ((transition as PushdownTransition).push = newContent),
      ),
    ];
  }

  clone(): Transition {
    return new PushdownTransition(this.char, this.pop, this.push, this.pending);
  }

  /**
   * Applies this transition to a (word, stack) pair, returning the new (word, stack).
   *
   * This encapsulates the PDA transition semantics:
   * - If `char` is ε: don't consume input
   * - If `char` is a symbol: consume one character from the input
   * - If `pop` is ε: don't pop from stack
   * - If `pop` is a symbol: pop the top of the stack
   * - If `push` is ε: don't push to stack
   * - If `push` is a string: push it onto the stack (leftmost char becomes new top)
   *
   * **Precondition**: `canFollowOn(word, stackTop)` must be true.
   *
   * @param word - The remaining input string
   * @param stack - The current stack contents (top of stack is leftmost character)
   * @returns A tuple `[newWord, newStack]` after applying the transition
   */
  applyTo(word: string, stack: string): [string, string] {
    const charIsEpsilon = this.char === "" || this.char === EPSILON;
    const popIsEpsilon = this.pop === "" || this.pop === EPSILON;
    const pushIsEpsilon = this.push === "" || this.push === EPSILON;

    const newWord = charIsEpsilon ? word : word.substring(1);
    let newStack = stack;
    if (!popIsEpsilon) newStack = newStack.substring(1);
    if (!pushIsEpsilon) newStack = this.push + newStack;

    return [newWord, newStack];
  }
}
