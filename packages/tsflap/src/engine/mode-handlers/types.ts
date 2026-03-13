import type { IPoint } from "../../core/point";
import type { Controller } from "../controller";

/**
 * Strategy interface for board interaction mode handlers.
 *
 * Each board mode (Draw, Move, Erase) has distinct mouse/keyboard behavior.
 * Extracting these into strategy objects follows the Strategy pattern
 * (Gamma et al., 1994), keeping the Controller focused on coordination
 * while each handler encapsulates its mode-specific interaction logic.
 *
 * **Design pattern**: Strategy (Gamma et al., 1994) — the Controller
 * delegates mouse/keyboard events to the active mode handler, which
 * implements the mode-specific behavior.
 */
export interface IModeHandler {
  /** Called when the mouse button is pressed on the canvas. */
  handleMouseDown(controller: Controller, point: IPoint, button: number): void;

  /** Called when the mouse moves on the canvas. */
  handleMouseMove(controller: Controller, point: IPoint): void;

  /** Called when the mouse button is released on the canvas. */
  handleMouseUp(controller: Controller): void;
}
