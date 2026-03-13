/* eslint-disable @typescript-eslint/no-non-null-assertion -- Probably quite a few of these at this point.. */
import type { IPoint } from "../../core/point";
import { AddEdgeFromNodeCommand, AddNodeAtPointCommand } from "../commands";
import type { Controller } from "../controller";
import type { IModeHandler } from "./types";
import { FutureEdgeView } from "../views/future-edge-view";

/**
 * Handles mouse interactions in Draw mode.
 *
 * In Draw mode, the user can:
 * - Click empty space to create a new node
 * - Click and drag from a node to create an edge
 * - Click a selected node to deselect
 *
 * This handler encapsulates all draw-mode-specific interaction logic,
 * extracted from the Controller for Single Responsibility (SRP).
 */
export class DrawModeHandler implements IModeHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- button might be used in the future - haven't figured out yet what for / how
  handleMouseDown(controller: Controller, point: IPoint, button: number): void {
    if (controller.state.editableTextInputField !== null) return;

    const nearestNode = controller.views.getNearestNode(point);

    if (nearestNode.node && nearestNode.distance < 70) {
      controller.state.futureEdgeFrom = nearestNode.node;
    } else if (controller.state.selectedNodes.size > 0) {
      // Clicking empty space with selection active: just deselect
      controller.clearSelection();
      controller.views.update();
    } else {
      const snappedPoint = point.getMPoint();
      if (controller.settings.grid) snappedPoint.round(20);
      const cmd = new AddNodeAtPointCommand(controller, snappedPoint);
      controller.history.trackExecution(cmd);
      controller.state.futureEdgeFromCreated = true;
      controller.state.futureEdgeFrom = cmd.getNodeV();
    }
  }

  handleMouseMove(controller: Controller, point: IPoint): void {
    const mpoint = point.getMPoint();
    if (controller.settings.grid) mpoint.round(20);

    if (controller.state.futureEdge !== null) {
      const nearestNode = controller.views.getNearestNode(mpoint);
      if (nearestNode.node && nearestNode.distance < 40) {
        controller.state.futureEdge.end = nearestNode.node.getAnchorPointFrom(controller.state.futureEdge.start);
      } else {
        controller.state.futureEdge.end = mpoint;
      }
      controller.state.futureEdge.start = controller.state.futureEdgeFrom!.getAnchorPointFrom(controller.state.futureEdge.end);
    } else if (controller.state.futureEdgeFrom !== null) {
      if (!controller.state.futureEdgeFromValid) {
        const distance = mpoint.getDistanceTo(controller.state.futureEdgeFrom.position);
        if (distance > controller.state.futureEdgeFrom.radius) {
          controller.state.futureEdgeFromValid = true;
        }
      }
      if (controller.state.futureEdgeFromValid) {
        controller.state.futureEdge = new FutureEdgeView(point.getMPoint(), point.getMPoint());
        controller.state.futureEdge.start = controller.state.futureEdgeFrom.getAnchorPointFrom(point);
      }
    }
  }

  handleMouseUp(controller: Controller): void {
    if (controller.state.futureEdge) {
      const cmd = new AddEdgeFromNodeCommand(controller, controller.state.futureEdgeFrom!, controller.state.futureEdge.end);
      const endingNode = cmd.getEndNodeV();
      controller.state.futureEdge.end = endingNode.getAnchorPointFrom(controller.state.futureEdge.start);
      controller.history.trackExecution(cmd);
      controller.editEdgeTransition(cmd.getEdge());
      // Flag to prevent the click event from opening node label editor (self-loop case)
      controller.state._edgeJustCompleted = true;
    }
    controller.state.futureEdge = null;
    controller.state.futureEdgeFrom = null;
    controller.state.futureEdgeFromValid = false;
    controller.state.futureEdgeFromCreated = false;
  }
}
