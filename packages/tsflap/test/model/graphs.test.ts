import { describe, expect, it } from "vitest";

import { Edge } from "../../src/model/edge";
import { FAGraph } from "../../src/model/graphs/fa-graph";
import { PDAGraph } from "../../src/model/graphs/pda-graph";
import { TMGraph } from "../../src/model/graphs/tm-graph";
import { Node } from "../../src/model/node";
import { BLANK, EPSILON, INITIAL_STACK } from "../../src/model/symbols";
import { CharacterTransition } from "../../src/model/transitions/character-transition";
import { PushdownTransition } from "../../src/model/transitions/pushdown-transition";
import { TuringTransition, TuringTransitionDirection } from "../../src/model/transitions/turing-transition";

describe("FAGraph", () => {
  it("adds nodes and edges correctly", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new CharacterTransition("a"));

    expect(g.getNodes().size).toBe(2);
    expect(g.getEdges().size).toBe(1);
    expect(g.getInitialNode()).toBe(q0);
    expect(g.getFinalNodes().size).toBe(1);
  });

  it("computes alphabet from edges (excluding epsilon)", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new CharacterTransition("a"));
    g.addEdge(q0, q1, new CharacterTransition("b"));
    g.addEdge(q0, q1, new CharacterTransition(EPSILON));

    g.updateAlphabet();
    const alpha = g.getAlphabet();
    expect(alpha).toHaveProperty("a");
    expect(alpha).toHaveProperty("b");
    expect(alpha).not.toHaveProperty(EPSILON);
  });

  it("validates DFA: requires transitions for all symbols from all states", () => {
    const g = new FAGraph(true);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new CharacterTransition("a"));
    g.addEdge(q1, q0, new CharacterTransition("a"));

    // Valid: each state has exactly one transition for 'a'
    expect(g.isValid()).toBe(true);
  });

  it("validates DFA: rejects missing transitions", () => {
    const g = new FAGraph(true);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new CharacterTransition("a"));
    g.addEdge(q0, q0, new CharacterTransition("b"));
    // q1 is missing transitions for 'a' and 'b'

    expect(g.isValid()).toBe(false);
  });

  it("validates NFA: only needs initial + final", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    g.addNode("q1", { final: true });
    expect(g.isValid()).toBe(true);
  });

  it("rejects invalid graph without initial state", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { final: true });
    expect(g.isValid()).toBe(false);
  });

  it("rejects invalid graph without final state", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    expect(g.isValid()).toBe(false);
  });

  it("removes nodes and edges", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    const edge = g.addEdge(q0, q1, new CharacterTransition("a"));

    expect(g.removeEdge(edge)).toBe(true);
    expect(g.getEdges().size).toBe(0);

    expect(g.removeNode(q1)).toBe(true);
    expect(g.getNodes().size).toBe(1);
    expect(g.getFinalNodes().size).toBe(0);
  });

  it("removing a node cascades to all incident edges", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1");
    const q2 = g.addNode("q2", { final: true });

    g.addEdge(q0, q1, new CharacterTransition("a"));
    g.addEdge(q1, q2, new CharacterTransition("b"));
    g.addEdge(q2, q1, new CharacterTransition("c"));

    expect(g.removeNode(q1)).toBe(true);
    expect(g.getNodes().size).toBe(2);
    expect(g.getEdges().size).toBe(0);
    expect(q0.toEdges.size).toBe(0);
    expect(q2.toEdges.size).toBe(0);
    expect(q2.fromEdges.size).toBe(0);
  });

  it("recomputes alphabet when an edge is removed", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    const edgeA = g.addEdge(q0, q1, new CharacterTransition("a"));
    g.addEdge(q0, q1, new CharacterTransition("b"));

    g.updateAlphabet();
    expect(g.getAlphabet()).toHaveProperty("a");
    expect(g.getAlphabet()).toHaveProperty("b");

    expect(g.removeEdge(edgeA)).toBe(true);
    expect(g.getAlphabet()).not.toHaveProperty("a");
    expect(g.getAlphabet()).toHaveProperty("b");
  });

  it("setInitialNode clears previous initial", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1");

    g.setInitialNode(q1);
    expect(q0.initial).toBe(false);
    expect(q1.initial).toBe(true);
    expect(g.getInitialNode()).toBe(q1);
  });

  it("rejects setting a node from another graph as initial", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });

    expect(() => g.setInitialNode(new Node("foreign"))).toThrow(/does not belong to this graph/);
  });

  it("markFinalNode and unmarkFinalNode work", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });

    g.markFinalNode(q0);
    expect(q0.final).toBe(true);
    expect(g.getFinalNodes().size).toBe(1);

    g.unmarkFinalNode(q0);
    expect(q0.final).toBe(false);
    expect(g.getFinalNodes().size).toBe(0);
  });

  it("rejects marking a node from another graph as final", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });

    expect(() => g.markFinalNode(new Node("foreign"))).toThrow(/does not belong to this graph/);
  });

  it("serializes and deserializes (round-trip for simple FA)", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    g.addNode("q1", { final: true });
    g.addEdge("q0", "q1", "a");

    const str = g.toString();
    expect(str).toContain("NFA");
    expect(str).toContain("q0");
    expect(str).toContain("q1");

    const g2 = new FAGraph(false);
    const result = g2.fromString(str);
    expect(result).toBe(true);
    expect(g2.getNodes().size).toBe(2);
    expect(g2.getInitialNode()?.label).toBe("q0");
  });

  it("deserializes empty alphabet and edge sections without creating empty symbols", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    g.addNode("q1", { final: true });

    const serialized = g.toString();
    const parsed = new FAGraph(false);

    expect(parsed.fromString(serialized)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(parsed.getAlphabet(), "")).toBe(false);
    expect(parsed.getEdges().size).toBe(0);
    expect(parsed.getFinalNodes().items.map((node) => node.label)).toEqual(["q1"]);
  });

  it("getEmptyTransitionCharacter returns epsilon", () => {
    const g = new FAGraph(false);
    expect(g.getEmptyTransitionCharacter()).toBe(EPSILON);
  });
});

describe("PDAGraph", () => {
  it("computes input and stack alphabets", () => {
    const g = new PDAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new PushdownTransition("a", INITIAL_STACK, "A" + INITIAL_STACK));

    g.updateAlphabet();
    expect(g.getAlphabet()).toHaveProperty("a");
    expect(g.getStackAlphabet()).toHaveProperty("A");
    expect(g.getStackAlphabet()).toHaveProperty(INITIAL_STACK);
  });

  it("createTransitionFromString parses 'a, $ → A$' format", () => {
    const g = new PDAGraph(false);
    const t = g.createTransitionFromString("a, $ → A$", false) as PushdownTransition;
    expect(t.char).toBe("a");
    expect(t.pop).toBe("$");
    expect(t.push).toBe("A$");
  });

  it("createTransitionFromString returns empty for unparseable input", () => {
    const g = new PDAGraph(false);
    const t = g.createTransitionFromString("garbage", false) as PushdownTransition;
    expect(t.char).toBe("");
    expect(t.pop).toBe("");
    expect(t.push).toBe("");
  });

  it("validates DPDA: rejects conflicting transitions", () => {
    const g = new PDAGraph(true);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    // Two transitions from q0 that both match on 'a' with any stack
    g.addEdge(q0, q1, new PushdownTransition("a", "", "A"));
    g.addEdge(q0, q1, new PushdownTransition("a", "", "B"));

    expect(g.isValid()).toBe(false);
  });
});

describe("TMGraph", () => {
  it("computes tape alphabet from transitions", () => {
    const g = new TMGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new TuringTransition("a", "b", TuringTransitionDirection.RIGHT));

    g.updateAlphabet();
    expect(g.getAlphabet()).toHaveProperty("a");
    expect(g.getAlphabet()).toHaveProperty("b");
  });

  it("validates DTM: rejects duplicate read symbols from same state", () => {
    const g = new TMGraph(true);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new TuringTransition("a", "b", TuringTransitionDirection.RIGHT));
    g.addEdge(q0, q1, new TuringTransition("a", "c", TuringTransitionDirection.LEFT));

    expect(g.isValid()).toBe(false);
  });

  it("getEmptyTransitionCharacter returns blank", () => {
    const g = new TMGraph(false);
    expect(g.getEmptyTransitionCharacter()).toBe(BLANK);
  });
});

describe("Node and Edge", () => {
  it("Node tracks incoming and outgoing edges", () => {
    const q0 = new Node("q0");
    const q1 = new Node("q1");
    new Edge(q0, q1, new CharacterTransition("a"));

    expect(q0.toEdges.size).toBe(1);
    expect(q1.fromEdges.size).toBe(1);
    expect(q0.fromEdges.size).toBe(0);
    expect(q1.toEdges.size).toBe(0);
  });

  it("Edge.removeNodes cleans up both sides", () => {
    const q0 = new Node("q0");
    const q1 = new Node("q1");
    const edge = new Edge(q0, q1, new CharacterTransition("a"));

    edge.removeNodes();
    expect(q0.toEdges.size).toBe(0);
    expect(q1.fromEdges.size).toBe(0);
  });

  it("Node.isCallState reflects callConfig", () => {
    const normal = new Node("q0");
    expect(normal.isCallState).toBe(false);

    const callNode = new Node("q1", {
      callConfig: { targetAutomatonId: "sub", callMode: "accept-reject" },
    });
    expect(callNode.isCallState).toBe(true);
  });

  it("two nodes with same label have different hashCodes", () => {
    const a = new Node("q0");
    const b = new Node("q0");
    expect(a.hashCode()).not.toBe(b.hashCode());
    expect(a.toString()).toBe(b.toString()); // same label
  });

  it("addFromEdge rejects edges targeting a different node", () => {
    const q0 = new Node("q0");
    const q1 = new Node("q1");
    const q2 = new Node("q2");
    const edge = new Edge(q0, q1, new CharacterTransition("a"));

    // q2 tries to register an edge that targets q1, not q2
    expect(q2.addFromEdge(edge)).toBeNull();
  });

  it("Edge.toString returns formal notation", () => {
    const q0 = new Node("q0");
    const q1 = new Node("q1");
    const edge = new Edge(q0, q1, new CharacterTransition("a"));
    expect(edge.toString()).toBe("(q0, q1, a)");
  });
});

describe("RSM call state support in graphs", () => {
  it("getCallStates returns only call state nodes", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    g.addNode("q1", { callConfig: { targetAutomatonId: "sub", callMode: "accept-reject" } });
    g.addNode("q2", { final: true });

    const callStates = g.getCallStates();
    expect(callStates).toHaveLength(1);
    expect(callStates[0].label).toBe("q1");
  });

  it("hasCallStates returns true when call states exist", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    expect(g.hasCallStates()).toBe(false);

    g.addNode("q1", { callConfig: { targetAutomatonId: "sub", callMode: "accept-reject" } });
    expect(g.hasCallStates()).toBe(true);
  });

  it("validateCallStates checks resolver", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true, callConfig: { targetAutomatonId: "exists", callMode: "accept-reject" } });

    const goodResolver = (id: string) => (id === "exists" ? new FAGraph(false) : null);
    const badResolver = () => null;

    expect(g.validateCallStates(goodResolver)).toBe(true);
    expect(g.validateCallStates(badResolver)).toBe(false);
  });
});
