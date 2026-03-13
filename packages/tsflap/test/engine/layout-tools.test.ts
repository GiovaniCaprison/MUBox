import { describe, it, expect } from "vitest";

import { MutablePoint } from "../../src/core/point";
import { Controller } from "../../src/engine/controller";
import { circleLayout, treeLayout, forceDirectedLayout, alignToGrid } from "../../src/engine/tools/layout-tools";
import { NodeView } from "../../src/engine/views/node-view";
import { FAGraph } from "../../src/model/graphs/fa-graph";
import { CharacterTransition } from "../../src/model/transitions/character-transition";

function buildTestController(): Controller {
  const g = new FAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1");
  const q2 = g.addNode("q2", { final: true });
  g.addEdge(q0, q1, new CharacterTransition("a"));
  g.addEdge(q1, q2, new CharacterTransition("b"));
  return new Controller(g);
}

describe("circleLayout", () => {
  it("arranges nodes in a circle", () => {
    const ctrl = buildTestController();
    circleLayout(ctrl);

    // All nodes should have positions
    expect(ctrl.views.nodes.length).toBe(3);

    // Nodes should be at different positions
    const positions = ctrl.views.nodes.map((nv) => ({ x: nv.position.x, y: nv.position.y }));
    const uniquePositions = new Set(positions.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`));
    expect(uniquePositions.size).toBe(3);
  });

  it("handles single node", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true, final: true });
    const ctrl = new Controller(g);
    circleLayout(ctrl);
    expect(ctrl.views.nodes.length).toBe(1);
  });

  it("handles empty graph", () => {
    const ctrl = new Controller(new FAGraph(false));
    // Should not throw
    circleLayout(ctrl);
    expect(ctrl.views.nodes.length).toBe(0);
  });
});

describe("treeLayout", () => {
  it("arranges nodes in a tree from initial state", () => {
    const ctrl = buildTestController();
    treeLayout(ctrl);

    expect(ctrl.views.nodes.length).toBe(3);
    // Initial node should be at the left/top
    const initialNV = ctrl.views.nodes.find((nv) => nv.model.initial);
    expect(initialNV).toBeDefined();
  });

  it("handles graph without initial state", () => {
    const g = new FAGraph(false);
    g.addNode("q0");
    g.addNode("q1");
    const ctrl = new Controller(g);
    // Should not throw even without initial state
    treeLayout(ctrl);
  });
});

describe("forceDirectedLayout", () => {
  it("repositions nodes using force simulation", () => {
    const ctrl = buildTestController();
    const positionsBefore = ctrl.views.nodes.map((nv) => ({ x: nv.position.x, y: nv.position.y }));

    forceDirectedLayout(ctrl);

    // Positions should have changed (force-directed moves nodes)
    const positionsAfter = ctrl.views.nodes.map((nv) => ({ x: nv.position.x, y: nv.position.y }));
    // At least some positions should differ
    const anyChanged = positionsAfter.some((p, i) => Math.abs(p.x - positionsBefore[i].x) > 1 || Math.abs(p.y - positionsBefore[i].y) > 1);
    expect(anyChanged).toBe(true);
  });
});

describe("alignToGrid", () => {
  it("snaps node positions to grid", () => {
    const ctrl = new Controller(new FAGraph(false));
    const n1 = ctrl.graph.addNode("q0");
    const n2 = ctrl.graph.addNode("q1");
    ctrl.views.addNode(new NodeView(n1, new MutablePoint(33, 47)));
    ctrl.views.addNode(new NodeView(n2, new MutablePoint(117, 83)));

    alignToGrid(ctrl, 20);

    // Positions should be snapped to nearest multiple of 20
    expect(ctrl.views.nodes[0].position.x % 20).toBe(0);
    expect(ctrl.views.nodes[0].position.y % 20).toBe(0);
    expect(ctrl.views.nodes[1].position.x % 20).toBe(0);
    expect(ctrl.views.nodes[1].position.y % 20).toBe(0);
  });
});
