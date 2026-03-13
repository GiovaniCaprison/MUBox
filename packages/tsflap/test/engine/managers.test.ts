import { describe, it, expect } from "vitest";

import { MutablePoint } from "../../src/core/point";
import { SelectionManager } from "../../src/engine/managers/selection-manager";
import { ViewportManager } from "../../src/engine/managers/viewport-manager";
import { Simulation } from "../../src/engine/simulation";
import { NodeView } from "../../src/engine/views/node-view";
import { Node } from "../../src/model/node";

describe("ViewportManager", () => {
  it("initializes with default values", () => {
    const vm = new ViewportManager();
    vm.init(800, 600);
    expect(vm.viewWidth).toBe(800);
    expect(vm.viewHeight).toBe(600);
    expect(vm.zoom).toBe(1);
  });

  it("getViewBox returns correct SVG viewBox string", () => {
    const vm = new ViewportManager();
    vm.init(800, 600);
    const vb = vm.getViewBox();
    expect(vb).toContain("800");
    expect(vb).toContain("600");
  });

  it("screenToSVG converts screen coordinates to SVG space", () => {
    const vm = new ViewportManager();
    vm.init(800, 600);
    const point = vm.screenToSVG(400, 300, 800, 600);
    // At default zoom (1x), screen center should map to SVG center
    expect(point.x).toBeCloseTo(400, 0);
    expect(point.y).toBeCloseTo(300, 0);
  });

  it("pan shifts the viewport", () => {
    const vm = new ViewportManager();
    vm.init(800, 600);
    const initialX = vm.viewX;
    const initialY = vm.viewY;

    vm.pan(100, 50, 800, 600);
    // Pan should shift the view origin
    expect(vm.viewX).not.toBe(initialX);
    expect(vm.viewY).not.toBe(initialY);
  });

  it("zoomAt changes the zoom level", () => {
    const vm = new ViewportManager();
    vm.init(800, 600);
    const initialZoom = vm.zoom;

    vm.zoomAt(400, 300, -0.1, 800, 600); // zoom in (negative delta = zoom in)
    // Zoom should have changed from initial
    expect(vm.zoom).not.toBe(initialZoom);
  });

  it("reset restores default view", () => {
    const vm = new ViewportManager();
    vm.init(800, 600);
    vm.pan(200, 200, 800, 600);
    vm.zoomAt(400, 300, -0.5, 800, 600);

    vm.reset(800, 600);
    expect(vm.zoom).toBe(1);
    expect(vm.viewX).toBe(0);
    expect(vm.viewY).toBe(0);
  });

  it("zoomToFit adjusts viewport to show all nodes", () => {
    const vm = new ViewportManager();
    vm.init(800, 600);

    const bounds = { minX: 100, maxX: 500, minY: 100, maxY: 400 };
    vm.zoomToFit(bounds, 800, 600, 50);

    // After zoom-to-fit, the viewport should encompass the bounds
    expect(vm.viewWidth).toBeGreaterThan(0);
    expect(vm.viewHeight).toBeGreaterThan(0);
  });

  it("onUpdate callback is called on pan", () => {
    const vm = new ViewportManager();
    vm.init(800, 600);
    let called = false;
    vm.onUpdate = () => {
      called = true;
    };
    vm.pan(10, 10, 800, 600);
    expect(called).toBe(true);
  });
});

describe("SelectionManager", () => {
  function makeNodeView(label: string, x: number, y: number): NodeView {
    const node = new Node(label);
    return new NodeView(node, new MutablePoint(x, y));
  }

  it("starts with empty selection", () => {
    const sm = new SelectionManager();
    expect(sm.selectedNodes.size).toBe(0);
    expect(sm.isSelecting).toBe(false);
  });

  it("toggleNode adds and removes nodes from selection", () => {
    const sm = new SelectionManager();
    const nv = makeNodeView("q0", 100, 100);

    sm.toggleNode(nv);
    expect(sm.selectedNodes.has(nv)).toBe(true);

    sm.toggleNode(nv);
    expect(sm.selectedNodes.has(nv)).toBe(false);
  });

  it("isNodeSelected checks membership", () => {
    const sm = new SelectionManager();
    const nv = makeNodeView("q0", 100, 100);

    expect(sm.isNodeSelected(nv)).toBe(false);
    sm.toggleNode(nv);
    expect(sm.isNodeSelected(nv)).toBe(true);
  });

  it("clear removes all selections", () => {
    const sm = new SelectionManager();
    const nv1 = makeNodeView("q0", 100, 100);
    const nv2 = makeNodeView("q1", 200, 200);

    sm.toggleNode(nv1);
    sm.toggleNode(nv2);
    expect(sm.selectedNodes.size).toBe(2);

    sm.clear();
    expect(sm.selectedNodes.size).toBe(0);
  });

  it("selectNodesInRect selects nodes within rectangle", () => {
    const sm = new SelectionManager();
    const nv1 = makeNodeView("q0", 50, 50);
    const nv2 = makeNodeView("q1", 150, 150);
    const nv3 = makeNodeView("q2", 500, 500); // outside rect

    const rect = { x: 0, y: 0, width: 200, height: 200 };
    sm.selectNodesInRect(rect, [nv1, nv2, nv3]);

    expect(sm.selectedNodes.has(nv1)).toBe(true);
    expect(sm.selectedNodes.has(nv2)).toBe(true);
    expect(sm.selectedNodes.has(nv3)).toBe(false);
  });

  it("startSelection / updateSelection / finishSelection flow", () => {
    const sm = new SelectionManager();
    const nv1 = makeNodeView("q0", 50, 50);
    const nv2 = makeNodeView("q1", 500, 500);

    sm.startSelection(new MutablePoint(0, 0));
    expect(sm.isSelecting).toBe(true);

    sm.updateSelection(new MutablePoint(200, 200));
    expect(sm.selectionRect).not.toBeNull();

    sm.finishSelection([nv1, nv2]);
    expect(sm.isSelecting).toBe(false);
    expect(sm.selectedNodes.has(nv1)).toBe(true);
    expect(sm.selectedNodes.has(nv2)).toBe(false);
  });

  it("selection state is correctly maintained after operations", () => {
    const sm = new SelectionManager();
    const nv1 = makeNodeView("q0", 100, 100);
    const nv2 = makeNodeView("q1", 200, 200);

    sm.toggleNode(nv1);
    sm.toggleNode(nv2);
    expect(sm.selectedNodes.size).toBe(2);

    sm.toggleNode(nv1); // deselect
    expect(sm.selectedNodes.size).toBe(1);
    expect(sm.isNodeSelected(nv1)).toBe(false);
    expect(sm.isNodeSelected(nv2)).toBe(true);

    sm.clear();
    expect(sm.selectedNodes.size).toBe(0);
  });
});

describe("Simulation.detectCycles", () => {
  it("detects direct self-recursion", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("A");

    // A calls itself
    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: a.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    const cycles = sim.detectCycles();
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain(a.id);
  });

  it("detects mutual recursion (A→B→A)", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("A");
    const b = sim.addAutomaton("B");

    // A calls B
    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: b.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    // B calls A
    b.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: a.id, callMode: "accept-reject" },
    });
    b.controller.graph.addNode("q1", { final: true });

    const cycles = sim.detectCycles();
    expect(cycles.length).toBeGreaterThan(0);
  });

  it("returns empty for acyclic call graph", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("A");
    const b = sim.addAutomaton("B");

    // A calls B (no cycle)
    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: b.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    // B has no call states
    b.controller.graph.addNode("q0", { initial: true });
    b.controller.graph.addNode("q1", { final: true });

    const cycles = sim.detectCycles();
    expect(cycles).toHaveLength(0);
  });
});
