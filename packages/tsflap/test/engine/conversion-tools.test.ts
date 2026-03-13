/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";

import { Controller } from "../../src/engine/controller";
import { convertNFAtoDFA, regexToNFA, removeUnreachableStates } from "../../src/engine/tools/conversion-tools";
import { FAGraph } from "../../src/model/graphs/fa-graph";
import { PDAGraph } from "../../src/model/graphs/pda-graph";
import { ExecutionEngine } from "../../src/model/machines/execution-engine";
import { FAMachineType } from "../../src/model/machines/fa-type";
import { EPSILON } from "../../src/model/symbols";
import { CharacterTransition } from "../../src/model/transitions/character-transition";

const faType = new FAMachineType();

/** Helper: build a controller from a graph */
function controllerFrom(graph: FAGraph): Controller {
  return new Controller(graph);
}

/** Helper: test that a graph accepts/rejects specific strings */
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

describe("removeUnreachableStates", () => {
  it("removes states not reachable from initial", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addNode("q2"); // unreachable
    g.addNode("q3"); // unreachable
    g.addEdge(q0, q1, new CharacterTransition("a"));

    const ctrl = controllerFrom(g);
    const removed = removeUnreachableStates(ctrl);

    expect(removed).toBe(2); // q2 and q3
    expect(g.getNodes().size).toBe(2); // q0 and q1 remain
  });

  it("removes nothing when all states are reachable", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new CharacterTransition("a"));
    g.addEdge(q1, q0, new CharacterTransition("b"));

    const ctrl = controllerFrom(g);
    const removed = removeUnreachableStates(ctrl);
    expect(removed).toBe(0);
  });

  it("returns 0 when there is no initial state", () => {
    const g = new FAGraph(false);
    g.addNode("q0");
    const ctrl = controllerFrom(g);
    expect(removeUnreachableStates(ctrl)).toBe(0);
  });
});

describe("convertNFAtoDFA", () => {
  it("converts a simple NFA to an equivalent DFA", () => {
    // NFA accepting strings ending in 'b'
    const nfa = new FAGraph(false);
    const q0 = nfa.addNode("q0", { initial: true });
    const q1 = nfa.addNode("q1", { final: true });
    nfa.addEdge(q0, q0, new CharacterTransition("a"));
    nfa.addEdge(q0, q0, new CharacterTransition("b"));
    nfa.addEdge(q0, q1, new CharacterTransition("b"));

    const nfaCtrl = controllerFrom(nfa);
    const dfaCtrl = convertNFAtoDFA(nfaCtrl);

    expect(dfaCtrl).not.toBeNull();
    const dfaGraph = dfaCtrl!.graph as FAGraph;
    expect(dfaGraph.deterministic).toBe(true);

    // The DFA should accept the same language
    assertAccepts(dfaGraph, ["b", "ab", "bb", "aab", "bab"]);
    assertRejects(dfaGraph, ["", "a", "ba", "aa"]);
  });

  it("handles NFA with epsilon transitions", () => {
    // NFA: q0 --ε--> q1 --a--> q2(final)
    const nfa = new FAGraph(false);
    const q0 = nfa.addNode("q0", { initial: true });
    const q1 = nfa.addNode("q1");
    const q2 = nfa.addNode("q2", { final: true });
    nfa.addEdge(q0, q1, new CharacterTransition(EPSILON));
    nfa.addEdge(q1, q2, new CharacterTransition("a"));

    const dfaCtrl = convertNFAtoDFA(controllerFrom(nfa));
    expect(dfaCtrl).not.toBeNull();

    const dfaGraph = dfaCtrl!.graph as FAGraph;
    assertAccepts(dfaGraph, ["a"]);
    assertRejects(dfaGraph, ["", "b", "aa"]);
  });

  it("returns null for non-FA graphs", () => {
    const pdaGraph = new PDAGraph(false);
    const ctrl = new Controller(pdaGraph);
    expect(convertNFAtoDFA(ctrl)).toBeNull();
  });

  it("returns null when no initial state", () => {
    const nfa = new FAGraph(false);
    nfa.addNode("q0", { final: true });
    expect(convertNFAtoDFA(controllerFrom(nfa))).toBeNull();
  });
});

describe("regexToNFA", () => {
  it("builds NFA for single character", () => {
    const ctrl = regexToNFA("a");
    expect(ctrl).not.toBeNull();
    const g = ctrl!.graph as FAGraph;
    assertAccepts(g, ["a"]);
    assertRejects(g, ["", "b", "aa", "ab"]);
  });

  it("builds NFA for concatenation", () => {
    const ctrl = regexToNFA("ab");
    expect(ctrl).not.toBeNull();
    const g = ctrl!.graph as FAGraph;
    assertAccepts(g, ["ab"]);
    assertRejects(g, ["", "a", "b", "ba", "abc"]);
  });

  it("builds NFA for union (alternation)", () => {
    const ctrl = regexToNFA("a|b");
    expect(ctrl).not.toBeNull();
    const g = ctrl!.graph as FAGraph;
    assertAccepts(g, ["a", "b"]);
    assertRejects(g, ["", "ab", "c", "aa"]);
  });

  it("builds NFA for Kleene star", () => {
    const ctrl = regexToNFA("a*");
    expect(ctrl).not.toBeNull();
    const g = ctrl!.graph as FAGraph;
    assertAccepts(g, ["", "a", "aa", "aaa"]);
    assertRejects(g, ["b", "ab"]);
  });

  it("builds NFA for Kleene plus", () => {
    const ctrl = regexToNFA("a+");
    expect(ctrl).not.toBeNull();
    const g = ctrl!.graph as FAGraph;
    assertAccepts(g, ["a", "aa", "aaa"]);
    assertRejects(g, ["", "b"]);
  });

  it("builds NFA for grouped expression", () => {
    const ctrl = regexToNFA("(ab)*");
    expect(ctrl).not.toBeNull();
    const g = ctrl!.graph as FAGraph;
    assertAccepts(g, ["", "ab", "abab", "ababab"]);
    assertRejects(g, ["a", "b", "ba", "aba"]);
  });

  it("builds NFA for complex expression (a|b)*c", () => {
    const ctrl = regexToNFA("(a|b)*c");
    expect(ctrl).not.toBeNull();
    const g = ctrl!.graph as FAGraph;
    assertAccepts(g, ["c", "ac", "bc", "abc", "bac", "aabc"]);
    assertRejects(g, ["", "a", "b", "ab", "ca"]);
  });

  it("returns null for empty expression", () => {
    expect(regexToNFA("")).toBeNull();
  });
});
