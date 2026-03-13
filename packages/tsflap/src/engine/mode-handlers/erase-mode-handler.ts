import type { IPoint } from "../../core/point";
import { EraseEdgeCommand, EraseEdgeTransitionCommand, EraseNodeCommand } from "../commands";
import type { Controller } from "../controller";
import type { IModeHandler } from "./types";

/**
 * Handles mouse interactions in Erase mode.
 *
 * In Erase mode, the user can:
 * - Click a node to delete it (and all connected edges)
 * - Click an edge to delete it
 * - Click a transition label to delete just that transition
 * - Click a selected node to erase all selected nodes
 * - Click and drag to erase elements along the path
 *
 * This handler encapsulates all erase-mode-specific interaction logic,
 * extracted from the Controller for Single Responsibility (SRP).
 */
export class EraseModeHandler implements IModeHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- hmmm should we have it still?
  handleMouseDown(controller: Controller, point: IPoint, button: number): void {
    const nearestNode = controller.views.getNearestNode(point);

    // In erase mode, clicking a selected node erases all selected
    if (nearestNode.node && nearestNode.hover && controller.state.selectedNodes.has(nearestNode.node)) {
      controller.eraseSelectedNodes();
      return;
    }

    // Clicking empty space in erase mode clears selection
    if (controller.state.selectedNodes.size > 0 && (!nearestNode.node || !nearestNode.hover)) {
      controller.clearSelection();
      controller.views.update();
    }

    controller.state.isErasing = true;
    this.handleErasing(controller, point);
  }

  handleMouseMove(controller: Controller, point: IPoint): void {
    if (controller.state.isErasing) {
      const mpoint = point.getMPoint();
      this.handleErasing(controller, mpoint);
    }
  }

  handleMouseUp(controller: Controller): void {
    controller.state.isErasing = false;
  }

  /**
   * Performs the actual erasing at the given point.
   * Checks for hovering edges, transitions, and nodes in priority order.
   */
  private handleErasing(controller: Controller, point: IPoint): void {
    if (controller.state.hoveringEdge && controller.graph.hasEdge(controller.state.hoveringEdge.models.items[0])) {
      const cmd = new EraseEdgeCommand(controller, controller.state.hoveringEdge);
      controller.history.trackExecution(cmd);
    } else if (controller.state.hoveringTransition && controller.graph.hasEdge(controller.state.hoveringTransition)) {
      const cmd = new EraseEdgeTransitionCommand(controller, controller.state.hoveringTransition);
      controller.history.trackExecution(cmd);
    } else {
      const nearestNode = controller.views.getNearestNode(point);
      if (nearestNode.node && nearestNode.hover) {
        const cmd = new EraseNodeCommand(controller, nearestNode.node);
        controller.history.trackExecution(cmd);
      }
    }
  }
}
