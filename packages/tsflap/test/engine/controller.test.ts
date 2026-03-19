import { describe, expect, it } from "vitest";

import { MutablePoint } from "../../src/core/point";
import { BatchCommand } from "../../src/engine/commands/batch-command";
import {
  AddEdgeFromNodeCommand,
  AddNodeAtPointCommand,
  MarkFinalNodeCommand,
  ReindexNodeLabelsCommand,
  RelabelNodeCommand,
  SetInitialNodeCommand,
  UnmarkFinalNodeCommand,
} from "../../src/engine/commands/node-commands";
import { Controller } from "../../src/engine/controller";
import { BoardMode } from "../../src/engine/state/enums";
import { ViewRegistry } from "../../src/engine/view-registry";
import { NodeView } from "../../src/engine/views/node-view";
import { FAGraph } from "../../src/model/graphs/fa-graph";
import { PDAGraph } from "../../src/model/graphs/pda-graph";
import { TMGraph } from "../../src/model/graphs/tm-graph";
import { Node } from "../../src/model/node";
import { CharacterTransition } from "../../src/model/transitions/character-transition";

describe("Controller", () => {
  it("creates with a default FA graph", () => {
    const ctrl = new Controller();
    expect(ctrl.graph).toBeDefined();
    expect(ctrl.graph.shortName).toBe("FA");
  });

  it("creates with a provided graph", () => {
    const g = new TMGraph(false);
    const ctrl = new Controller(g);
    expect(ctrl.graph.shortName).toBe("TM");
  });

  it("setNewGraph replaces the graph and resets state", () => {
    const ctrl = new Controller();
    const g2 = new PDAGraph(false);
    ctrl.setNewGraph(g2);
    expect(ctrl.graph.shortName).toBe("PDA");
    expect(ctrl.views.nodes).toHaveLength(0);
  });

  it("getNextNodeLabel generates sequential labels", () => {
    const ctrl = new Controller();
    expect(ctrl.getNextNodeLabel()).toBe("q0");

    // Add a node manually
    const g = ctrl.graph;
    const n = g.addNode("q0", { initial: true });
    const nv = new NodeView(n, new MutablePoint(100, 100));
    ctrl.views.addNode(nv);

    expect(ctrl.getNextNodeLabel()).toBe("q1");
  });

  it("setMode changes the board mode", () => {
    const ctrl = new Controller();
    expect(ctrl.state.mode).toBe(BoardMode.DRAW);

    ctrl.setMode(BoardMode.MOVE);
    expect(ctrl.state.mode).toBe(BoardMode.MOVE);

    ctrl.setMode(BoardMode.ERASE);
    expect(ctrl.state.mode).toBe(BoardMode.ERASE);
  });

  it("setMode returns false when mode is already set", () => {
    const ctrl = new Controller();
    expect(ctrl.setMode(BoardMode.DRAW)).toBe(false);
    expect(ctrl.setMode(BoardMode.MOVE)).toBe(true);
    expect(ctrl.setMode(BoardMode.MOVE)).toBe(false);
  });

  it("setInitialNode sets and clears initial state", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0");
    const n2 = g.addNode("q1");
    const nv1 = new NodeView(n1, new MutablePoint(100, 100));
    const nv2 = new NodeView(n2, new MutablePoint(200, 200));
    ctrl.views.addNode(nv1);
    ctrl.views.addNode(nv2);

    ctrl.setInitialNode(nv1);
    expect(g.getInitialNode()).toBe(n1);
    expect(n1.initial).toBe(true);

    ctrl.setInitialNode(nv2);
    expect(g.getInitialNode()).toBe(n2);
    expect(n1.initial).toBe(false);
    expect(n2.initial).toBe(true);

    ctrl.setInitialNode(null);
    expect(g.getInitialNode()).toBeNull();
  });

  it("markFinalNode and unmarkFinalNode toggle final state", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n = g.addNode("q0");
    const nv = new NodeView(n, new MutablePoint(100, 100));
    ctrl.views.addNode(nv);

    ctrl.markFinalNode(nv);
    expect(n.final).toBe(true);
    expect(g.getFinalNodes().size).toBe(1);

    ctrl.unmarkFinalNode(nv);
    expect(n.final).toBe(false);
    expect(g.getFinalNodes().size).toBe(0);
  });

  it("addEdge creates an edge between two nodes", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0", { initial: true });
    const n2 = g.addNode("q1", { final: true });
    const nv1 = new NodeView(n1, new MutablePoint(100, 100));
    const nv2 = new NodeView(n2, new MutablePoint(300, 100));
    ctrl.views.addNode(nv1);
    ctrl.views.addNode(nv2);

    const edgeV = ctrl.addEdge(null, nv1, nv2, new CharacterTransition("a"));
    expect(edgeV).toBeDefined();
    expect(g.getEdges().size).toBe(1);
    expect(ctrl.views.edges).toHaveLength(1);
  });

  it("removeNode removes node and its edges", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0", { initial: true });
    const n2 = g.addNode("q1", { final: true });
    const nv1 = new NodeView(n1, new MutablePoint(100, 100));
    const nv2 = new NodeView(n2, new MutablePoint(300, 100));
    ctrl.views.addNode(nv1);
    ctrl.views.addNode(nv2);
    ctrl.addEdge(null, nv1, nv2, new CharacterTransition("a"));

    ctrl.removeNode(nv1);
    expect(g.getNodes().size).toBe(1);
    expect(g.getEdges().size).toBe(0);
    expect(ctrl.views.nodes).toHaveLength(1);
    expect(ViewRegistry.getNodeView(n1)).toBeUndefined();
  });

  it("removeEdge clears edge view registry entries", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0", { initial: true });
    const n2 = g.addNode("q1", { final: true });
    const nv1 = new NodeView(n1, new MutablePoint(100, 100));
    const nv2 = new NodeView(n2, new MutablePoint(300, 100));
    ctrl.views.addNode(nv1);
    ctrl.views.addNode(nv2);

    const edgeView = ctrl.addEdge(null, nv1, nv2, new CharacterTransition("a"));
    const edgeModel = edgeView.models.items[0];

    ctrl.removeEdge(edgeView);

    expect(g.getEdges().size).toBe(0);
    expect(ctrl.views.edges).toHaveLength(0);
    expect(ViewRegistry.getEdgeView(edgeModel)).toBeUndefined();
  });

  it("reindexNodeNames relabels all nodes sequentially", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("x");
    const n2 = g.addNode("y");
    const n3 = g.addNode("z");
    ctrl.views.addNode(new NodeView(n1, new MutablePoint(100, 100)));
    ctrl.views.addNode(new NodeView(n2, new MutablePoint(200, 100)));
    ctrl.views.addNode(new NodeView(n3, new MutablePoint(300, 100)));

    ctrl.reindexNodeNames();
    expect(n1.label).toBe("q0");
    expect(n2.label).toBe("q1");
    expect(n3.label).toBe("q2");
  });

  it("history tracks undo/redo for setInitialNode", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0");
    const n2 = g.addNode("q1");
    const nv1 = new NodeView(n1, new MutablePoint(100, 100));
    const nv2 = new NodeView(n2, new MutablePoint(200, 200));
    ctrl.views.addNode(nv1);
    ctrl.views.addNode(nv2);

    ctrl.setInitialNode(nv1, true); // tracked
    expect(g.getInitialNode()).toBe(n1);

    ctrl.setInitialNode(nv2, true); // tracked
    expect(g.getInitialNode()).toBe(n2);

    ctrl.history.undo();
    expect(g.getInitialNode()).toBe(n1);

    ctrl.history.redo();
    expect(g.getInitialNode()).toBe(n2);
  });

  it("onBoardUpdateFn callback is invoked on view updates", () => {
    const ctrl = new Controller();
    let called = false;
    ctrl.onBoardUpdateFn = () => {
      called = true;
    };
    ctrl.views.update();
    expect(called).toBe(true);
  });

  it("getBounds computes bounding box of all nodes", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0");
    const n2 = g.addNode("q1");
    ctrl.views.addNode(new NodeView(n1, new MutablePoint(50, 50)));
    ctrl.views.addNode(new NodeView(n2, new MutablePoint(300, 400)));

    const bounds = ctrl.getBounds();
    expect(bounds.minX).toBeLessThan(100);
    expect(bounds.maxX).toBeGreaterThan(250);
    expect(bounds.minY).toBeLessThan(100);
    expect(bounds.maxY).toBeGreaterThan(350);
  });

  it("viewport operations work through controller", () => {
    const ctrl = new Controller();
    ctrl.initViewport(800, 600);
    expect(ctrl.state.viewWidth).toBe(800);
    expect(ctrl.state.viewHeight).toBe(600);

    const vb = ctrl.getViewBox();
    expect(vb).toContain("800");

    const svgPoint = ctrl.screenToSVG(400, 300, 800, 600);
    expect(svgPoint.x).toBeCloseTo(400, 0);
    expect(svgPoint.y).toBeCloseTo(300, 0);
  });

  it("selection operations work through controller", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n = g.addNode("q0");
    const nv = new NodeView(n, new MutablePoint(100, 100));
    ctrl.views.addNode(nv);

    expect(ctrl.isNodeSelected(nv)).toBe(false);
    ctrl.toggleNodeSelection(nv);
    expect(ctrl.isNodeSelected(nv)).toBe(true);
    expect(ctrl.state.selectedNodes.has(nv)).toBe(true);

    ctrl.clearSelection();
    expect(ctrl.isNodeSelected(nv)).toBe(false);
    expect(ctrl.state.selectedNodes.size).toBe(0);
  });

  it("hydrateViewsFromGraph creates views for pre-existing graph", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    g.addNode("q1", { final: true });
    g.addEdge("q0", "q1", "a");

    const ctrl = new Controller(g);
    // Views should have been created for the pre-existing nodes and edges
    expect(ctrl.views.nodes).toHaveLength(2);
    expect(ctrl.views.edges).toHaveLength(1);
  });

  it("toLaTeX generates LaTeX output", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0", { initial: true });
    const n2 = g.addNode("q1", { final: true });
    ctrl.views.addNode(new NodeView(n1, new MutablePoint(100, 100)));
    ctrl.views.addNode(new NodeView(n2, new MutablePoint(300, 100)));
    ctrl.addEdge(null, ctrl.views.nodes[0], ctrl.views.nodes[1], new CharacterTransition("a"));

    const latex = ctrl.toLaTeX();
    expect(latex).toContain("\\begin{tikzpicture}");
    expect(latex).toContain("q0");
    expect(latex).toContain("q1");
    expect(latex).toContain("\\end{tikzpicture}");
  });
});

describe("Commands", () => {
  it("SetInitialNodeCommand execute/undo", () => {
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0");
    const n2 = g.addNode("q1");
    ctrl.views.addNode(new NodeView(n1, new MutablePoint(100, 100)));
    ctrl.views.addNode(new NodeView(n2, new MutablePoint(200, 200)));

    g.setInitialNode(n1);
    const cmd = new SetInitialNodeCommand(ctrl, n2);
    cmd.execute();
    expect(g.getInitialNode()).toBe(n2);

    cmd.undo();
    expect(g.getInitialNode()).toBe(n1);
  });

  it("MarkFinalNodeCommand execute/undo", () => {
    const ctrl = new Controller();
    const n = ctrl.graph.addNode("q0");
    ctrl.views.addNode(new NodeView(n, new MutablePoint(100, 100)));

    const cmd = new MarkFinalNodeCommand(ctrl, n);
    cmd.execute();
    expect(n.final).toBe(true);

    cmd.undo();
    expect(n.final).toBe(false);
  });

  it("UnmarkFinalNodeCommand execute/undo", () => {
    const ctrl = new Controller();
    const n = ctrl.graph.addNode("q0", { final: true });
    ctrl.views.addNode(new NodeView(n, new MutablePoint(100, 100)));

    const cmd = new UnmarkFinalNodeCommand(ctrl, n);
    cmd.execute();
    expect(n.final).toBe(false);

    cmd.undo();
    expect(n.final).toBe(true);
  });

  it("RelabelNodeCommand execute/undo", () => {
    const ctrl = new Controller();
    const n = ctrl.graph.addNode("q0");
    ctrl.views.addNode(new NodeView(n, new MutablePoint(100, 100)));

    const cmd = new RelabelNodeCommand(ctrl, n, "start");
    cmd.execute();
    expect(n.label).toBe("start");

    cmd.undo();
    expect(n.label).toBe("q0");
  });

  it("ReindexNodeLabelsCommand execute/undo", () => {
    const ctrl = new Controller();
    const n1 = ctrl.graph.addNode("alpha");
    const n2 = ctrl.graph.addNode("beta");
    ctrl.views.addNode(new NodeView(n1, new MutablePoint(100, 100)));
    ctrl.views.addNode(new NodeView(n2, new MutablePoint(200, 200)));

    const cmd = new ReindexNodeLabelsCommand(ctrl);
    cmd.execute();
    expect(n1.label).toBe("q0");
    expect(n2.label).toBe("q1");

    cmd.undo();
    expect(n1.label).toBe("alpha");
    expect(n2.label).toBe("beta");
  });

  it("BatchCommand executes all and undoes in reverse", () => {
    const log: string[] = [];
    const cmd1 = {
      execute: () => log.push("exec1"),
      undo: () => log.push("undo1"),
    };
    const cmd2 = {
      execute: () => log.push("exec2"),
      undo: () => log.push("undo2"),
    };
    const cmd3 = {
      execute: () => log.push("exec3"),
      undo: () => log.push("undo3"),
    };

    const batch = new BatchCommand([cmd1, cmd2, cmd3]);
    batch.execute();
    expect(log).toEqual(["exec1", "exec2", "exec3"]);

    log.length = 0;
    batch.undo();
    expect(log).toEqual(["undo3", "undo2", "undo1"]);
  });

  it("AddNodeAtPointCommand does not mutate the graph until execute", () => {
    const ctrl = new Controller();
    const cmd = new AddNodeAtPointCommand(ctrl, new MutablePoint(100, 100));

    expect(ctrl.graph.getNodes().size).toBe(0);
    expect(ctrl.views.nodes).toHaveLength(0);

    cmd.execute();
    expect(ctrl.graph.getNodes().size).toBe(1);
    expect(ctrl.views.nodes).toHaveLength(1);
    expect(ctrl.graph.getInitialNode()).toBe(cmd.getNode());
  });

  it("AddEdgeFromNodeCommand does not create a node until execute when drawing into empty space", () => {
    const ctrl = new Controller();
    const start = ctrl.graph.addNode("q0", { initial: true });
    const startView = new NodeView(start, new MutablePoint(100, 100));
    ctrl.views.addNode(startView);

    const cmd = new AddEdgeFromNodeCommand(ctrl, startView, new MutablePoint(300, 300));

    expect(ctrl.graph.getNodes().size).toBe(1);
    expect(ctrl.views.nodes).toHaveLength(1);
    expect(ctrl.graph.getEdges().size).toBe(0);

    cmd.execute();
    expect(ctrl.graph.getNodes().size).toBe(2);
    expect(ctrl.views.nodes).toHaveLength(2);
    expect(ctrl.graph.getEdges().size).toBe(1);
  });
});

describe("BoardState", () => {
  it("initializes with default values", () => {
    const ctrl = new Controller();
    const state = ctrl.state;
    expect(state.mode).toBe(BoardMode.DRAW);
    expect(state.draggingNode).toBeNull();
    expect(state.isErasing).toBe(false);
    expect(state.selectedNodes.size).toBe(0);
    expect(state.simulationActive).toBe(false);
    expect(state.zoom).toBe(1.0);
    expect(state.viewWidth).toBe(800);
    expect(state.viewHeight).toBe(600);
  });
});

describe("ViewRegistry", () => {
  it("registers and retrieves node views", () => {
    const node = new Node("q0");
    const nv = new NodeView(node, new MutablePoint(100, 100));

    ViewRegistry.setNodeView(node, nv);
    expect(ViewRegistry.getNodeView(node)).toBe(nv);

    ViewRegistry.removeNodeView(node);
    expect(ViewRegistry.getNodeView(node)).toBeUndefined();
  });
});
