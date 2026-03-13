import type { Edge } from "../model/edge";
import type { Node } from "../model/node";
import type { EdgeView } from "./views/edge-view";
import type { NodeView } from "./views/node-view";

/**
 * Centralized registry mapping model objects to their view representations.
 *
 * This replaces the `visualization: unknown` property that was previously
 * stored directly on `Node` and `Edge` model objects. That approach created
 * a hidden bidirectional dependency between the model and engine layers —
 * the model layer had to carry a reference to engine-layer objects, violating
 * the principle that models should be independent of their presentation.
 *
 * **Design pattern**: Identity Map (Fowler, 2002) — maintains a 1:1 mapping
 * between model objects and their view representations, using WeakMaps so
 * that views are automatically garbage-collected when their model objects
 * are no longer referenced.
 *
 * **Usage**: The engine layer registers views when they are created (in
 * `ViewCollection.addNode/addEdge`) and looks them up when needed (in
 * commands, mode handlers, etc.) via `ViewRegistry.getNodeView(node)`.
 *
 * @see Fowler, M. (2002). Patterns of Enterprise Application Architecture.
 *      Addison-Wesley. — Identity Map pattern.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- How did you get this number? As I already told your colleague, I don't want to buy constants instead of static classes!
export class ViewRegistry {
  private static readonly _nodeViews = new WeakMap<Node, NodeView>();
  private static readonly _edgeViews = new WeakMap<Edge, EdgeView>();

  // ─── Node Views ────────────────────────────────────────────────────

  /** Register a NodeView for a model Node. */
  static setNodeView(node: Node, view: NodeView): void {
    ViewRegistry._nodeViews.set(node, view);
  }

  /** Look up the NodeView for a model Node. Returns undefined if not registered. */
  static getNodeView(node: Node): NodeView | undefined {
    return ViewRegistry._nodeViews.get(node);
  }

  /** Remove the NodeView registration for a model Node. */
  static removeNodeView(node: Node): void {
    ViewRegistry._nodeViews.delete(node);
  }

  // ─── Edge Views ────────────────────────────────────────────────────

  /** Register an EdgeView for a model Edge. */
  static setEdgeView(edge: Edge, view: EdgeView): void {
    ViewRegistry._edgeViews.set(edge, view);
  }

  /** Look up the EdgeView for a model Edge. Returns undefined if not registered. */
  static getEdgeView(edge: Edge): EdgeView | undefined {
    return ViewRegistry._edgeViews.get(edge);
  }

  /** Remove the EdgeView registration for a model Edge. */
  static removeEdgeView(edge: Edge): void {
    ViewRegistry._edgeViews.delete(edge);
  }
}
