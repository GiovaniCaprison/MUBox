/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { IPoint } from "../../core/point";
import { MutablePoint } from "../../core/point";
import type { Edge } from "../../model/edge";
import { MoveBoardCommand, MoveNodeCommand } from "../commands";
import type { Controller } from "../controller";
import { ViewRegistry } from "../view-registry";
import type { IModeHandler } from "./types";
import { EdgeView, EdgeViewPathMode } from "../views/edge-view";
import { NodeView } from "../views/node-view";

/**
 * Handles mouse interactions in Move mode.
 *
 * In Move mode, the user can:
 * - Drag a single node to reposition it
 * - Drag multiple selected nodes together
 * - Drag an edge control point to curve the edge
 * - Drag empty space to pan the entire board
 *
 * This handler encapsulates all move-mode-specific interaction logic,
 * extracted from the Controller for Single Responsibility (SRP).
 */
export class MoveModeHandler implements IModeHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- legacy param - might remove might use it later
  handleMouseDown(controller: Controller, point: IPoint, button: number): void {
    if (controller.state.modifyEdgeControl) return;

    const nearestNode = controller.views.getNearestNode(point);

    if (nearestNode.node && nearestNode.hover) {
      // If clicking a selected node, drag all selected nodes together
      if (controller.state.selectedNodes.has(nearestNode.node) && controller.state.selectedNodes.size > 1) {
        controller.state.draggingNode = nearestNode.node;
        controller.state.draggingCommand = null; // batch move handled specially
      } else {
        // Clear selection if clicking an unselected node without shift
        controller.clearSelection();
        controller.state.draggingNode = nearestNode.node;
        controller.state.draggingCommand = new MoveNodeCommand(controller, controller.state.draggingNode);
      }
    } else {
      // Clicking empty space without shift clears selection
      controller.clearSelection();
      controller.state.isDraggingBoard = true;
      controller.state.draggingCommand = new MoveBoardCommand(controller);
    }
  }

  handleMouseMove(controller: Controller, point: IPoint): void {
    const mpoint = point.getMPoint();
    const snappedPoint = mpoint.getMPoint();
    if (controller.settings.grid) snappedPoint.round(20);

    if (
      controller.state.draggingNode &&
      controller.state.selectedNodes.size > 1 &&
      controller.state.selectedNodes.has(controller.state.draggingNode)
    ) {
      // Batch move: move all selected nodes by the delta
      if (controller.state.lastMousePoint) {
        const delta = snappedPoint.getMPoint().subtract(controller.state.lastMousePoint);
        controller.state.selectedNodes.forEach((nodeV: NodeView) => {
          nodeV.position.add(delta);
          nodeV.updateEdgeVisualizationPaths();
        });
        controller.views.update();
      }
    } else if (controller.state.draggingNode) {
      const oldDraggingNodePoint = controller.state.draggingNode.position.getMPoint();
      controller.state.draggingNode.position = snappedPoint;
      const newDraggingNodePoint = controller.state.draggingNode.position;

      let updateFn: ((edgeModel: Edge) => void) | undefined = undefined;

      if (!controller.state.ctrlKeyPressed) {
        const adjustedEdges: Record<string, boolean> = {};

        updateFn = (edgeModel: Edge) => {
          const edgeV = ViewRegistry.getEdgeView(edgeModel)!;
          const edgeVHash = edgeV.fromModel.toString() + ", " + edgeV.toModel.toString();
          // eslint-disable-next-line no-prototype-builtins -- We have met before! global search for an explanation of this disable
          if (!adjustedEdges.hasOwnProperty(edgeVHash)) {
            adjustedEdges[edgeVHash] = true;
          } else {
            return;
          }

          let controlPoint: MutablePoint | undefined;
          if (edgeV.hasMovedControlPoint() && edgeV.pathMode !== EdgeViewPathMode.SELF) {
            const otherNode = (
              edgeModel.from === controller.state.draggingNode!.model
                ? ViewRegistry.getNodeView(edgeModel.to)
                : ViewRegistry.getNodeView(edgeModel.from)
            )!;
            const oldControlPoint = edgeV.control.getMPoint();
            const axisNodePosition = otherNode.position;
            const oldMidpoint = MutablePoint.getMidpoint(oldDraggingNodePoint, axisNodePosition);
            const newMidpoint = MutablePoint.getMidpoint(newDraggingNodePoint, axisNodePosition);
            const theta1 = oldMidpoint.getAngleTo(oldControlPoint);
            const theta2 = Math.PI - oldMidpoint.getAngleTo(axisNodePosition);
            const theta3 = theta1 + theta2;
            const oldDistance = oldMidpoint.getDistanceTo(oldControlPoint);
            const oldLength = oldMidpoint.getDistanceTo(axisNodePosition);
            const newLength = newMidpoint.getDistanceTo(axisNodePosition);
            const lengthRatio = newLength / oldLength;
            const newDistance = lengthRatio * oldDistance;
            const offset = MutablePoint.getNormalOffset(newDraggingNodePoint, newMidpoint, newDistance, theta3);
            controlPoint = newMidpoint.add(offset);
          } else if (edgeV.hasMovedControlPoint() && edgeV.pathMode === EdgeViewPathMode.SELF) {
            controlPoint = edgeV.control.getMPoint().add(newDraggingNodePoint.getMPoint().subtract(oldDraggingNodePoint));
          }

          edgeV.recalculatePath(controlPoint ?? undefined);
        };
      }

      controller.state.draggingNode.updateEdgeVisualizationPaths(updateFn);
      controller.views.update();
    } else if (controller.state.modifyEdgeControl) {
      controller.state.modifyEdgeControl.control = snappedPoint;
      controller.state.modifyEdgeControl.recalculatePath(controller.state.modifyEdgeControl.control);
      controller.views.update();
    } else if (controller.state.isDraggingBoard) {
      if (controller.settings.grid) mpoint.round(20);
      if (controller.state.lastMousePoint) {
        const delta = mpoint.subtract(controller.state.lastMousePoint);
        controller.views.nodes.forEach((nodeV: NodeView) => {
          nodeV.position.add(delta);
        });
        controller.views.edges.forEach((edgeV: EdgeView) => {
          const controlPoint = edgeV.hasMovedControlPoint() ? edgeV.control.add(delta) : undefined;
          edgeV.recalculatePath(controlPoint);
        });
        controller.views.update();
      }
    }
  }

  handleMouseUp(controller: Controller): void {
    if (controller.state.draggingCommand !== null) {
      controller.history.trackExecution(controller.state.draggingCommand);
      controller.state.draggingCommand = null;
    }
    controller.state.draggingNode = null;
    controller.state.modifyEdgeControl = null;
    controller.state.isDraggingBoard = false;
  }
}
