/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";

import { Controller } from "../../src/engine/controller";
import { crossProduct, testEquivalence, unionViaEpsilon } from "../../src/engine/tools/multi-automata-tools";
import { FAGraph } from "../../src/model/graphs/fa-graph";
import { PDAGraph } from "../../src/model/graphs/pda-graph";
import { ExecutionEngine } from "../../src/model/machines/execution-engine";
import { FAMachineType } from "../../src/model/machines/fa-type";
import { CharacterTransition } from "../../src/model/transitions/character-transition";

const faType = new FAMachineType();

function assertAccepts(graph: FAGraph, inputs: string[]) {
  const engine = new ExecutionEngine(faType, graph);
  for (const input of inputs) {
    expect(engine.run(input), `Expected to accept "${input}"`).toBe(true);
  }
}

function assertRejects(graph: FAGraph, inputs: string[]) {
  const engine = new ExecutionEngine(faType, graph);
  for (const input of inputs) {
    expect(engine.run(input), `Expected to reject "${input}"`).toBe(false);
  }
}

/** DFA accepting strings ending in 'a' over {a,b} */
function buildDFAEndingInA(): Controller {
  const g = new FAGraph(true);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1", { final: true });
  g.addEdge(q0, q1, new CharacterTransition("a"));
  g.addEdge(q0, q0, new CharacterTransition("b"));
  g.addEdge(q1, q1, new CharacterTransition("a"));
  g.addEdge(q1, q0, new CharacterTransition("b"));
  return new Controller(g);
}

/** DFA accepting strings ending in 'b' over {a,b} */
function buildDFAEndingInB(): Controller {
  const g = new FAGraph(true);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1", { final: true });
  g.addEdge(q0, q0, new CharacterTransition("a"));
  g.addEdge(q0, q1, new CharacterTransition("b"));
  g.addEdge(q1, q0, new CharacterTransition("a"));
  g.addEdge(q1, q1, new CharacterTransition("b"));
  return new Controller(g);
}

/** NFA accepting "a" or "b" */
function buildNFAaOrB(): Controller {
  const g = new FAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1", { final: true });
  g.addEdge(q0, q1, new CharacterTransition("a"));
  g.addEdge(q0, q1, new CharacterTransition("b"));
  return new Controller(g);
}

/** NFA accepting only "a" */
function buildNFAa(): Controller {
  const g = new FAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1", { final: true });
  g.addEdge(q0, q1, new CharacterTransition("a"));
  return new Controller(g);
}

/** NFA accepting only "b" */
function buildNFAb(): Controller {
  const g = new FAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1", { final: true });
  g.addEdge(q0, q1, new CharacterTransition("b"));
  return new Controller(g);
}

describe("crossProduct", () => {
  it("intersection: accepts strings ending in both 'a' AND 'b' (impossible → empty language)", () => {
    const result = crossProduct(buildDFAEndingInA(), buildDFAEndingInB(), "intersection");
    expect(result).not.toBeNull();
    const g = result!.graph as FAGraph;
    // No string can end in both 'a' and 'b' simultaneously
    // The product DFA has no final states, so getFinalNodes().size === 0
    expect(g.getFinalNodes().size).toBe(0);
  });

  it("union: accepts strings ending in 'a' OR 'b' (everything non-empty)", () => {
    const result = crossProduct(buildDFAEndingInA(), buildDFAEndingInB(), "union");
    expect(result).not.toBeNull();
    const g = result!.graph as FAGraph;
    assertAccepts(g, ["a", "b", "ab", "ba", "aa", "bb", "aab", "bba"]);
    assertRejects(g, [""]); // empty string ends in neither
  });

  it("difference: accepts strings ending in 'a' but NOT 'b'", () => {
    const result = crossProduct(buildDFAEndingInA(), buildDFAEndingInB(), "difference");
    expect(result).not.toBeNull();
    const g = result!.graph as FAGraph;
    assertAccepts(g, ["a", "aa", "ba", "bba"]);
    assertRejects(g, ["", "b", "ab", "bb"]);
  });

  it("handles NFA inputs by converting to DFA first", () => {
    // NFA accepting "a" or "b" intersected with NFA accepting "a"
    const result = crossProduct(buildNFAaOrB(), buildNFAa(), "intersection");
    expect(result).not.toBeNull();
    const g = result!.graph as FAGraph;
    assertAccepts(g, ["a"]);
    assertRejects(g, ["", "b", "ab"]);
  });

  it("returns null for non-FA graphs", () => {
    const pdaCtrl = new Controller(new PDAGraph(false));
    expect(crossProduct(pdaCtrl, buildDFAEndingInA(), "union")).toBeNull();
  });
});

describe("testEquivalence", () => {
  it("returns true for equivalent automata", () => {
    // Two different DFAs that both accept strings ending in 'a'
    const ctrl1 = buildDFAEndingInA();
    const ctrl2 = buildDFAEndingInA(); // same language, different graph objects
    expect(testEquivalence(ctrl1, ctrl2)).toBe(true);
  });

  it("returns false for non-equivalent automata", () => {
    expect(testEquivalence(buildDFAEndingInA(), buildDFAEndingInB())).toBe(false);
  });

  it("handles NFA inputs", () => {
    // NFA accepting "a" vs NFA accepting "a" — should be equivalent
    expect(testEquivalence(buildNFAa(), buildNFAa())).toBe(true);
    // NFA accepting "a" vs NFA accepting "b" — not equivalent
    expect(testEquivalence(buildNFAa(), buildNFAb())).toBe(false);
  });

  it("returns null for non-FA graphs", () => {
    const pdaCtrl = new Controller(new PDAGraph(false));
    expect(testEquivalence(pdaCtrl, buildDFAEndingInA())).toBeNull();
  });
});

describe("unionViaEpsilon", () => {
  it("creates union of two FAs via epsilon transitions", () => {
    const result = unionViaEpsilon(buildNFAa(), buildNFAb());
    expect(result).not.toBeNull();
    const g = result!.graph as FAGraph;
    assertAccepts(g, ["a", "b"]);
    assertRejects(g, ["", "ab", "c"]);
  });

  it("union preserves both languages", () => {
    const result = unionViaEpsilon(buildDFAEndingInA(), buildDFAEndingInB());
    expect(result).not.toBeNull();
    const g = result!.graph as FAGraph;
    // Should accept anything ending in 'a' OR ending in 'b'
    assertAccepts(g, ["a", "b", "aa", "bb", "ab", "ba"]);
    assertRejects(g, [""]); // empty string
  });

  it("returns null for mismatched graph types", () => {
    const pdaCtrl = new Controller(new PDAGraph(false));
    expect(unionViaEpsilon(pdaCtrl, buildDFAEndingInA())).toBeNull();
  });

  it("returns null when either graph has no initial state", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { final: true }); // no initial
    const ctrl = new Controller(g);
    expect(unionViaEpsilon(ctrl, buildNFAa())).toBeNull();
  });
});
