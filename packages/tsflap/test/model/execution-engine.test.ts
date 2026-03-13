import { describe, it, expect } from "vitest";

import { FAGraph } from "../../src/model/graphs/fa-graph";
import { PDAGraph } from "../../src/model/graphs/pda-graph";
import { TMGraph } from "../../src/model/graphs/tm-graph";
import { ExecutionEngine } from "../../src/model/machines/execution-engine";
import { FAMachineType } from "../../src/model/machines/fa-type";
import { PDAMachineType } from "../../src/model/machines/pda-type";
import { MachineTypeRegistry } from "../../src/model/machines/registry";
import { TMMachineType } from "../../src/model/machines/tm-type";
import { EPSILON, BLANK, INITIAL_STACK } from "../../src/model/symbols";
import { CharacterTransition } from "../../src/model/transitions/character-transition";
import { PushdownTransition } from "../../src/model/transitions/pushdown-transition";
import { TuringTransition, TuringTransitionDirection } from "../../src/model/transitions/turing-transition";

// ─── Helper: build a simple DFA that accepts strings ending in 'b' ───
function buildDFAEndingInB(): FAGraph {
  const g = new FAGraph(true);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1", { final: true });
  g.addEdge(q0, q0, new CharacterTransition("a"));
  g.addEdge(q0, q1, new CharacterTransition("b"));
  g.addEdge(q1, q0, new CharacterTransition("a"));
  g.addEdge(q1, q1, new CharacterTransition("b"));
  return g;
}

// ─── Helper: build NFA that accepts strings containing "ab" ───
function buildNFAContainingAB(): FAGraph {
  const g = new FAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1");
  const q2 = g.addNode("q2", { final: true });
  // Self-loop on q0 for any character
  g.addEdge(q0, q0, new CharacterTransition("a"));
  g.addEdge(q0, q0, new CharacterTransition("b"));
  // Transition on 'a' to q1
  g.addEdge(q0, q1, new CharacterTransition("a"));
  // Transition on 'b' to q2 (accepting)
  g.addEdge(q1, q2, new CharacterTransition("b"));
  // Self-loop on q2 for any character
  g.addEdge(q2, q2, new CharacterTransition("a"));
  g.addEdge(q2, q2, new CharacterTransition("b"));
  return g;
}

// ─── Helper: build NFA with epsilon transitions accepting "a" or "" ───
function buildNFAWithEpsilon(): FAGraph {
  const g = new FAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1", { final: true });
  // Epsilon transition: accepts empty string
  g.addEdge(q0, q1, new CharacterTransition(EPSILON));
  // Also accepts "a"
  g.addEdge(q0, q1, new CharacterTransition("a"));
  return g;
}

// ─── Helper: build PDA for { a^n b^n | n >= 0 } ───
function buildPDAAnBn(): PDAGraph {
  const g = new PDAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1");
  const q2 = g.addNode("q2", { final: true });

  // Push 'A' for each 'a'
  g.addEdge(q0, q0, new PushdownTransition("a", EPSILON, "A"));
  // Switch to popping mode
  g.addEdge(q0, q1, new PushdownTransition("b", "A", EPSILON));
  // Pop 'A' for each 'b'
  g.addEdge(q1, q1, new PushdownTransition("b", "A", EPSILON));
  // Accept when stack has only $
  g.addEdge(q1, q2, new PushdownTransition(EPSILON, INITIAL_STACK, INITIAL_STACK));
  // Also accept empty string directly
  g.addEdge(q0, q2, new PushdownTransition(EPSILON, INITIAL_STACK, INITIAL_STACK));

  return g;
}

// ─── Helper: build TM that accepts { w | w contains at least one 'a' } ───
function buildTMContainsA(): TMGraph {
  const g = new TMGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const qAccept = g.addNode("qA", { final: true });
  const qReject = g.addNode("qR");

  // Scan right, skip 'b'
  g.addEdge(q0, q0, new TuringTransition("b", "b", TuringTransitionDirection.RIGHT));
  // Found 'a' → accept
  g.addEdge(q0, qAccept, new TuringTransition("a", "a", TuringTransitionDirection.RIGHT));
  // Hit blank without finding 'a' → reject (halt in non-final state)
  g.addEdge(q0, qReject, new TuringTransition(BLANK, BLANK, TuringTransitionDirection.RIGHT));

  return g;
}

describe("ExecutionEngine — Finite Automata", () => {
  const faType = new FAMachineType();

  it("DFA accepts strings ending in 'b'", () => {
    const g = buildDFAEndingInB();
    const engine = new ExecutionEngine(faType, g);

    expect(engine.run("b")).toBe(true);
    expect(engine.run("ab")).toBe(true);
    expect(engine.run("aab")).toBe(true);
    expect(engine.run("abb")).toBe(true);
    expect(engine.run("bbb")).toBe(true);
  });

  it("DFA rejects strings not ending in 'b'", () => {
    const g = buildDFAEndingInB();
    const engine = new ExecutionEngine(faType, g);

    expect(engine.run("a")).toBe(false);
    expect(engine.run("ba")).toBe(false);
    expect(engine.run("")).toBe(false);
    expect(engine.run("bba")).toBe(false);
  });

  it("NFA accepts strings containing 'ab'", () => {
    const g = buildNFAContainingAB();
    const engine = new ExecutionEngine(faType, g);

    expect(engine.run("ab")).toBe(true);
    expect(engine.run("aab")).toBe(true);
    expect(engine.run("bab")).toBe(true);
    expect(engine.run("aba")).toBe(true);
    expect(engine.run("aabb")).toBe(true);
  });

  it("NFA rejects strings not containing 'ab'", () => {
    const g = buildNFAContainingAB();
    const engine = new ExecutionEngine(faType, g);

    expect(engine.run("")).toBe(false);
    expect(engine.run("a")).toBe(false);
    expect(engine.run("b")).toBe(false);
    expect(engine.run("ba")).toBe(false);
    expect(engine.run("bba")).toBe(false);
    expect(engine.run("aaa")).toBe(false);
  });

  it("NFA with epsilon transitions accepts empty string and 'a'", () => {
    const g = buildNFAWithEpsilon();
    const engine = new ExecutionEngine(faType, g);

    expect(engine.run("")).toBe(true);
    expect(engine.run("a")).toBe(true);
    expect(engine.run("b")).toBe(false);
    expect(engine.run("aa")).toBe(false);
  });

  it("throws on invalid graph", () => {
    const g = new FAGraph(false); // no initial state
    const engine = new ExecutionEngine(faType, g);
    expect(() => engine.run("a")).toThrow();
  });
});

describe("ExecutionEngine — Pushdown Automata", () => {
  const pdaType = new PDAMachineType();

  it("PDA accepts a^n b^n for valid inputs", () => {
    const g = buildPDAAnBn();
    const engine = new ExecutionEngine(pdaType, g);

    expect(engine.run("")).toBe(true); // n=0
    expect(engine.run("ab")).toBe(true); // n=1
    expect(engine.run("aabb")).toBe(true); // n=2
    expect(engine.run("aaabbb")).toBe(true); // n=3
  });

  it("PDA rejects strings not in a^n b^n", () => {
    const g = buildPDAAnBn();
    const engine = new ExecutionEngine(pdaType, g);

    expect(engine.run("a")).toBe(false);
    expect(engine.run("b")).toBe(false);
    expect(engine.run("aab")).toBe(false); // more a's than b's
    expect(engine.run("abb")).toBe(false); // more b's than a's
    expect(engine.run("ba")).toBe(false); // wrong order
    expect(engine.run("abab")).toBe(false); // interleaved
  });
});

describe("ExecutionEngine — Turing Machines", () => {
  const tmType = new TMMachineType();

  it("TM accepts strings containing 'a'", () => {
    const g = buildTMContainsA();
    const engine = new ExecutionEngine(tmType, g);

    expect(engine.run("a")).toBe(true);
    expect(engine.run("ba")).toBe(true);
    expect(engine.run("bba")).toBe(true);
    expect(engine.run("ab")).toBe(true);
  });

  it("TM rejects strings without 'a'", () => {
    const g = buildTMContainsA();
    const engine = new ExecutionEngine(tmType, g);

    expect(engine.run("")).toBe(false);
    expect(engine.run("b")).toBe(false);
    expect(engine.run("bbb")).toBe(false);
  });
});

describe("ExecutionEngine — RSM sub-automaton calls", () => {
  const faType = new FAMachineType();

  it("FA with call state invokes sub-automaton correctly", () => {
    // Build a sub-automaton that accepts "ab"
    const subGraph = new FAGraph(false);
    const s0 = subGraph.addNode("s0", { initial: true });
    const s1 = subGraph.addNode("s1");
    const s2 = subGraph.addNode("s2", { final: true });
    subGraph.addEdge(s0, s1, new CharacterTransition("a"));
    subGraph.addEdge(s1, s2, new CharacterTransition("b"));

    // Build a caller automaton: q0 --[call]--> q1(call state) --c--> q2(final)
    const callerGraph = new FAGraph(false);
    const q0 = callerGraph.addNode("q0", { initial: true });
    const q1 = callerGraph.addNode("q1", {
      callConfig: { targetAutomatonId: "sub", callMode: "accept-reject" },
    });
    const q2 = callerGraph.addNode("q2", { final: true });
    // Epsilon transition to the call state
    callerGraph.addEdge(q0, q1, new CharacterTransition(EPSILON));
    // After call returns, read 'c' to accept
    callerGraph.addEdge(q1, q2, new CharacterTransition("c"));

    // Set up resolver
    const resolver = (id: string) => (id === "sub" ? subGraph : null);

    const engine = new ExecutionEngine(faType, callerGraph);
    engine.resolver = resolver;

    // "abc" = sub-automaton consumes "ab", then caller reads "c"
    expect(engine.run("abc")).toBe(true);
    // "ab" = sub-automaton consumes "ab", but no 'c' follows
    expect(engine.run("ab")).toBe(false);
    // "ac" = sub-automaton can't accept "a" alone (needs "ab")
    expect(engine.run("ac")).toBe(false);
  });
});

describe("MachineTypeRegistry", () => {
  it("has FA, TM, PDA registered by default", () => {
    expect(MachineTypeRegistry.has("FA")).toBe(true);
    expect(MachineTypeRegistry.has("TM")).toBe(true);
    expect(MachineTypeRegistry.has("PDA")).toBe(true);
  });

  it("getOrThrow throws for unknown types", () => {
    expect(() => MachineTypeRegistry.getOrThrow("UNKNOWN")).toThrow();
  });

  it("getRegisteredTypes returns all type names", () => {
    const types = MachineTypeRegistry.getRegisteredTypes();
    expect(types).toContain("FA");
    expect(types).toContain("TM");
    expect(types).toContain("PDA");
  });
});
