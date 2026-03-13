import { BLANK, UNKNOWN } from "../symbols";
import type { ITransitionPart, Transition } from "./types";
import { EditableTransitionPart, StaticTransitionPart } from "./types";

/**
 * Head movement direction for a Turing Machine transition.
 *
 * In the formal definition (Sipser, 2012, Definition 3.3), the transition
 * function maps to Q × Γ × {L, R}, where L and R indicate left and right
 * head movement respectively.
 */
export enum TuringTransitionDirection {
  LEFT = -1,
  RIGHT = 1,
}

/**
 * Transition for a Turing Machine — read symbol, write symbol, head direction.
 *
 * In the formal definition of a TM (Sipser, 2012, Definition 3.3),
 * the transition function is δ: Q × Γ → Q × Γ × {L, R}. Each transition:
 * 1. Reads the symbol under the tape head
 * 2. Writes a new symbol to the tape
 * 3. Moves the head one cell left (L) or right (R)
 *
 * The transition is displayed as "read/write; direction" (e.g., "a/b; R").
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Definition 3.3.
 */
export class TuringTransition implements Transition {
  public pending = false;
  public read: string;
  public write: string;
  public direction: TuringTransitionDirection | null;

  constructor(read: string, write: string, direction: TuringTransitionDirection | null, pending?: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint does not realize that if pending is passed from a property of a null object it too will be null not undefined
    if (pending !== null && pending !== undefined) {
      this.pending = pending;
    }
    if (read.length > 1 || write.length > 1) {
      throw new Error("Turing Transition read and write length must be less than or equal to 1");
    } else {
      this.read = read;
      this.write = write;
      this.direction = direction;
    }
  }

  getDirectionString(): string {
    switch (this.direction) {
      case TuringTransitionDirection.LEFT:
        return "L";
      case TuringTransitionDirection.RIGHT:
        return "R";
      default:
        return "S";
    }
  }

  setDirectionFromString(directionString: string) {
    switch (directionString) {
      case "L":
      case "l":
        this.direction = TuringTransitionDirection.LEFT;
        break;
      case "R":
      case "r":
        this.direction = TuringTransitionDirection.RIGHT;
        break;
      default:
        this.direction = null;
    }
  }

  toString(): string {
    if (this.pending) {
      return UNKNOWN;
    }
    return this.read + "/" + this.write + "; " + this.getDirectionString();
  }

  canFollowOn(input: string): boolean {
    if (this.pending) {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint does not realize that if pending is passed from a property of a null object it too will be null not undefined
    if (this.read === BLANK || this.read === null || this.read === "") {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint does not realize that if pending is passed from a property of a null object it too will be null not undefined
      return input === BLANK || input === null || input === "";
    } else {
      return input === this.read;
    }
  }

  getTransitionParts(): ITransitionPart[] {
    return [
      new EditableTransitionPart(
        this.read,
        (newContent: string, transition: Transition) => ((transition as TuringTransition).read = newContent),
      ),
      new StaticTransitionPart("/"),
      new EditableTransitionPart(
        this.write,
        (newContent: string, transition: Transition) => ((transition as TuringTransition).write = newContent),
      ),
      new StaticTransitionPart(";"),
      new EditableTransitionPart(this.getDirectionString(), (newContent: string, transition: Transition) =>
        (transition as TuringTransition).setDirectionFromString(newContent),
      ),
    ];
  }

  clone(): Transition {
    return new TuringTransition(this.read, this.write, this.direction, this.pending);
  }
}
