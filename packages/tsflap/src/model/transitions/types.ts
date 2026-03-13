/**
 * Transition types and parts — shared interfaces for all automaton transition types.
 *
 * A transition in formal automata theory represents the mapping from one
 * configuration to another. The specific data carried by a transition varies
 * by automaton type (character for FA, read/write/direction for TM,
 * char/pop/push for PDA), but all transitions share the common interface
 * defined here.
 *
 * @module
 */

/**
 * A part of a transition label that can be displayed in the UI.
 * Transitions are composed of parts — some editable (e.g., the character),
 * some static (e.g., the "/" separator in TM transitions).
 */
export interface ITransitionPart {
  content: string;
}

/**
 * Callback type for when an editable transition part is modified by the user.
 */
export type EditableTransitionPartUpdateFn = (newContent: string, transition: Transition) => void;

/**
 * An editable part of a transition label.
 * When the user clicks on this part, an inline editor appears.
 * The `onEdit` callback is invoked when the user commits a new value.
 */
export class EditableTransitionPart implements ITransitionPart {
  public content: string;
  public onEdit: EditableTransitionPartUpdateFn;

  constructor(content: string, onEdit: EditableTransitionPartUpdateFn) {
    this.content = content;
    this.onEdit = onEdit;
  }
}

/**
 * A static (non-editable) part of a transition label.
 * Used for separators and delimiters (e.g., "/", ";", "→", ",").
 */
export class StaticTransitionPart implements ITransitionPart {
  public content: string;

  constructor(content: string) {
    this.content = content;
  }
}

/**
 * Common interface for all transition types across the Chomsky hierarchy.
 *
 * Each automaton type has its own concrete transition class:
 * - **FA**: {@link CharacterTransition} — a single input character (or ε)
 * - **TM**: {@link TuringTransition} — read symbol, write symbol, head direction
 * - **PDA**: {@link PushdownTransition} — input character, stack pop, stack push
 *
 * The `pending` flag indicates a transition that has been created but not yet
 * fully specified by the user (e.g., during edge drawing). Pending transitions
 * are displayed with a placeholder symbol and cannot be followed during execution.
 */
export interface Transition {
  /** Whether this transition is still being edited (not yet committed). */
  pending: boolean;

  /** Returns the formal notation string for this transition. */
  toString(): string;

  /** Returns the UI-renderable parts of this transition label. */
  getTransitionParts(): ITransitionPart[];

  /** Creates a deep copy of this transition. */
  clone(): Transition;

  /**
   * Tests whether this transition can be followed given the current input context.
   *
   * The semantics vary by automaton type:
   * - **FA**: `canFollowOn(input: string)` — matches if the first character equals
   *   the transition character, or if the transition is ε (always matches).
   * - **TM**: `canFollowOn(tapeSymbol: string)` — matches if the tape symbol under
   *   the head equals the transition's read symbol.
   * - **PDA**: `canFollowOn(input: string, stackTop: string)` — matches if both
   *   the input character and stack top match (ε fields match anything).
   *
   * @param args - Context-dependent arguments (input string, tape symbol, stack top)
   * @returns true if this transition can be taken in the given context
   */
  canFollowOn(...args: string[]): boolean;
}
