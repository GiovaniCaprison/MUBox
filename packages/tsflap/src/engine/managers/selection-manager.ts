import type { IPoint } from "../../core/point";
import type { SelectionRect } from "../state/types";
import type { NodeView } from "../views/node-view";

/**
 * Manages node selection state: individual selection, multi-select,
 * and selection rectangle (rubber-band) operations.
 *
 * Extracted from Controller to follow the Single Responsibility Principle.
 */
export class SelectionManager {
  /** Set of currently selected node views. */
  public selectedNodes = new Set<NodeView>();

  /** The selection rectangle being drawn (SVG coords), null when not selecting. */
  public selectionRect: SelectionRect | null = null;

  /** Whether the user is currently drawing a selection rectangle. */
  public isSelecting = false;

  /** The SVG-space origin point where the selection drag started. */
  public selectionOrigin: IPoint | null = null;

  /** Callback invoked after selection changes. */
  public onUpdate: (() => void) | null = null;

  /** Clear all selected nodes and reset selection state. */
  public clear(): void {
    this.selectedNodes.clear();
    this.selectionRect = null;
    this.isSelecting = false;
    this.selectionOrigin = null;
  }

  /** Check if a node is currently selected. */
  public isNodeSelected(nodeV: NodeView): boolean {
    return this.selectedNodes.has(nodeV);
  }

  /** Toggle selection of a single node. */
  public toggleNode(nodeV: NodeView): void {
    if (this.selectedNodes.has(nodeV)) {
      this.selectedNodes.delete(nodeV);
    } else {
      this.selectedNodes.add(nodeV);
    }
  }

  /** Select all nodes whose centers fall within the given rectangle. */
  public selectNodesInRect(rect: SelectionRect, allNodes: NodeView[]): void {
    const minX = rect.x;
    const minY = rect.y;
    const maxX = rect.x + rect.width;
    const maxY = rect.y + rect.height;

    this.selectedNodes.clear();
    allNodes.forEach((nodeV: NodeView) => {
      const px = nodeV.position.x;
      const py = nodeV.position.y;
      if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
        this.selectedNodes.add(nodeV);
      }
    });
  }

  /** Start a selection rectangle at the given SVG point. */
  public startSelection(point: IPoint): void {
    this.isSelecting = true;
    this.selectionOrigin = point;
    this.selectionRect = { x: point.x, y: point.y, width: 0, height: 0 };
  }

  /** Update the selection rectangle as the mouse moves. */
  public updateSelection(point: IPoint): void {
    if (!this.selectionOrigin) return;
    const ox = this.selectionOrigin.x;
    const oy = this.selectionOrigin.y;
    this.selectionRect = {
      x: Math.min(ox, point.x),
      y: Math.min(oy, point.y),
      width: Math.abs(point.x - ox),
      height: Math.abs(point.y - oy),
    };
  }

  /** Finish the selection rectangle and select nodes inside it. */
  public finishSelection(allNodes: NodeView[]): void {
    if (this.selectionRect && this.selectionRect.width > 2 && this.selectionRect.height > 2) {
      this.selectNodesInRect(this.selectionRect, allNodes);
    }
    this.selectionRect = null;
    this.isSelecting = false;
    this.selectionOrigin = null;
    this.notifyUpdate();
  }

  /** Number of selected nodes. */
  get size(): number {
    return this.selectedNodes.size;
  }

  /** Whether any nodes are selected. */
  get hasSelection(): boolean {
    return this.selectedNodes.size > 0;
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate();
    }
  }
}
