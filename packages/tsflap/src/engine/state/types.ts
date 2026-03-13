import { TransitionStyle } from "./enums";

/**
 * Context menu option displayed on right-click.
 */
export interface ContextMenuOption {
  display: string;
  callback: () => void;
}

/**
 * Selection rectangle in SVG coordinates.
 * Used for multi-select via shift+drag.
 */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Board display settings (theme, transition style, grid).
 */
export interface BoardSettings {
  theme: string;
  transitionStyle: TransitionStyle;
  grid: boolean;
}
