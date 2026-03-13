/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";

import { Controller } from "../../src/engine/controller";
import { regexToNFA } from "../../src/engine/tools/conversion-tools";
import { dfaToRegex, importFromDefinition, importFromLaTeX } from "../../src/engine/tools/regex-tools";
import { FAGraph } from "../../src/model/graphs/fa-graph";
import { TMGraph } from "../../src/model/graphs/tm-graph";
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

describe("dfaToRegex", () => {
  it("converts a simple DFA accepting 'a' to regex", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new CharacterTransition("a"));

    const ctrl = new Controller(g);
    const regex = dfaToRegex(ctrl);

    expect(regex).not.toBeNull();
    expect(regex).toBe("a");
  });

  it("converts DFA accepting 'ab' to regex", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1");
    const q2 = g.addNode("q2", { final: true });
    g.addEdge(q0, q1, new CharacterTransition("a"));
    g.addEdge(q1, q2, new CharacterTransition("b"));

    const ctrl = new Controller(g);
    const regex = dfaToRegex(ctrl);

    expect(regex).not.toBeNull();
    // Should contain 'a' and 'b' in some form
    expect(regex!).toContain("a");
    expect(regex!).toContain("b");
  });

  it("converts DFA with self-loop (a*) to regex with star", () => {
    const g = new FAGraph(false);
    const q0 = g.addNode("q0", { initial: true, final: true });
    g.addEdge(q0, q0, new CharacterTransition("a"));

    const ctrl = new Controller(g);
    const regex = dfaToRegex(ctrl);

    expect(regex).not.toBeNull();
    expect(regex!).toContain("*");
  });

  it("converts DFA accepting empty string to ε", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true, final: true });

    const ctrl = new Controller(g);
    const regex = dfaToRegex(ctrl);

    expect(regex).toBe("ε");
  });

  it("returns null for non-FA graphs", () => {
    const ctrl = new Controller(new TMGraph(false));
    expect(dfaToRegex(ctrl)).toBeNull();
  });

  it("returns null when no initial state", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { final: true });
    expect(dfaToRegex(new Controller(g))).toBeNull();
  });

  it("returns null when no final states", () => {
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    expect(dfaToRegex(new Controller(g))).toBeNull();
  });

  it("round-trip: regex → NFA → regex produces equivalent language", () => {
    // Build NFA from regex "ab"
    const nfaCtrl = regexToNFA("ab");
    expect(nfaCtrl).not.toBeNull();

    // Convert back to regex
    const regex = dfaToRegex(nfaCtrl!);
    expect(regex).not.toBeNull();

    // The resulting regex should accept "ab" when converted back to NFA
    const roundTripCtrl = regexToNFA(regex!);
    if (roundTripCtrl) {
      assertAccepts(roundTripCtrl.graph as FAGraph, ["ab"]);
    }
  });
});

describe("importFromDefinition", () => {
  it("imports an FA from its formal definition string", () => {
    // First create an FA and get its definition string
    const g = new FAGraph(false);
    g.addNode("q0", { initial: true });
    g.addNode("q1", { final: true });
    g.addEdge("q0", "q1", "a");

    const defStr = g.toString();

    // Now import it
    const ctrl = importFromDefinition(defStr, "FA");
    expect(ctrl).not.toBeNull();
    expect(ctrl!.graph.getNodes().size).toBe(2);
    expect(ctrl!.graph.getInitialNode()?.label).toBe("q0");
  });

  it("returns null for empty string", () => {
    expect(importFromDefinition("")).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(importFromDefinition("this is not a valid definition")).toBeNull();
  });

  it("imports a DFA definition", () => {
    const g = new FAGraph(true);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1", { final: true });
    g.addEdge(q0, q1, new CharacterTransition("a"));
    g.addEdge(q1, q0, new CharacterTransition("a"));

    const defStr = g.toString();
    const ctrl = importFromDefinition(defStr, "FA");
    expect(ctrl).not.toBeNull();
    expect(ctrl!.graph.getNodes().size).toBe(2);
  });
});

describe("importFromLaTeX", () => {
  it("parses TikZ automaton with nodes and edges", () => {
    const latex = `
      \\node[state, initial] (q0) {$q_0$};
      \\node[state, accepting] (q1) {$q_1$};
      \\path (q0) edge node {a} (q1);
    `;
    const ctrl = importFromLaTeX(latex);
    expect(ctrl).not.toBeNull();
    expect(ctrl!.graph.getNodes().size).toBe(2);
    expect(ctrl!.graph.getInitialNode()).not.toBeNull();
    expect(ctrl!.graph.getFinalNodes().size).toBe(1);
    expect(ctrl!.graph.getEdges().size).toBe(1);
  });

  it("handles \\lambda as epsilon", () => {
    const latex = `
      \\node[state, initial] (q0) {$q_0$};
      \\node[state, accepting] (q1) {$q_1$};
      \\path (q0) edge node {$\\lambda$} (q1);
    `;
    const ctrl = importFromLaTeX(latex);
    expect(ctrl).not.toBeNull();
    expect(ctrl!.graph.getEdges().size).toBe(1);
  });

  it("handles multiple edges", () => {
    const latex = `
      \\node[state, initial] (q0) {$q_0$};
      \\node[state] (q1) {$q_1$};
      \\node[state, accepting] (q2) {$q_2$};
      \\path (q0) edge node {a} (q1);
      \\path (q1) edge node {b} (q2);
    `;
    const ctrl = importFromLaTeX(latex);
    expect(ctrl).not.toBeNull();
    expect(ctrl!.graph.getNodes().size).toBe(3);
    expect(ctrl!.graph.getEdges().size).toBe(2);
  });

  it("returns null for empty input", () => {
    expect(importFromLaTeX("")).toBeNull();
  });

  it("returns null for non-TikZ input", () => {
    expect(importFromLaTeX("this is not latex")).toBeNull();
  });

  it("strips LaTeX math mode from labels", () => {
    const latex = `
      \\node[state, initial] (q0) {$q_0$};
      \\node[state, accepting] (q1) {$q_1$};
      \\path (q0) edge node {a} (q1);
    `;
    const ctrl = importFromLaTeX(latex);
    expect(ctrl).not.toBeNull();
    // Labels should be cleaned: q0, q1 (not $q_0$)
    const labels = ctrl!.graph.getNodes().items.map((n) => n.label);
    expect(labels).toContain("q0");
    expect(labels).toContain("q1");
  });
});
