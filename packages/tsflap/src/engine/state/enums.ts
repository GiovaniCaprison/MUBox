/**
 * Board interaction modes.
 *
 * Each mode changes how mouse/keyboard events are interpreted:
 * - DRAW: Create nodes and edges
 * - MOVE: Reposition nodes, edges, and the board
 * - ERASE: Delete nodes, edges, and transitions
 */
export enum BoardMode {
  DRAW = 0,
  MOVE = 1,
  ERASE = 2,
}

/**
 * Transition label display style.
 *
 * Controls how transition labels are oriented relative to their edge:
 * - UPRIGHT: Labels are always upright (horizontal)
 * - PERPENDICULAR: Labels are perpendicular to the edge path
 */
export enum TransitionStyle {
  UPRIGHT = 0,
  PERPENDICULAR = 1,
}
