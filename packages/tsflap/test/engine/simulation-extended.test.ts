import { describe, expect, it } from "vitest";

import { Simulation } from "../../src/engine/simulation";
import { FAGraph } from "../../src/model/graphs/fa-graph";
import { ExecutionEngine } from "../../src/model/machines/execution-engine";
import { FAMachineType } from "../../src/model/machines/fa-type";
import { EPSILON } from "../../src/model/symbols";
import { CharacterTransition } from "../../src/model/transitions/character-transition";

describe("Simulation.getComputationalPowerClassForEntry", () => {
  it("returns Regular for FA-only workspace without calls", () => {
    const sim = new Simulation();
    const entry = sim.addAutomaton("FA 1", undefined, "FA");
    const result = sim.getComputationalPowerClassForEntry(entry.id);
    expect(result.className).toBe("Regular");
    expect(result.chomskyType).toBe(3);
  });

  it("returns Regular for FA with non-recursive calls (inlinable)", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("Caller", undefined, "FA");
    const b = sim.addAutomaton("Callee", undefined, "FA");

    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: b.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    b.controller.graph.addNode("q0", { initial: true });
    b.controller.graph.addNode("q1", { final: true });

    // Non-recursive FA calls can be inlined to produce a single FA,
    // so the system remains Regular (Type 3).
    const result = sim.getComputationalPowerClassForEntry(a.id);
    expect(result.className).toBe("Regular");
    expect(result.chomskyType).toBe(3);
  });

  it("returns Context-Free for FA with recursive calls", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("Recursive FA", undefined, "FA");

    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: a.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    const result = sim.getComputationalPowerClassForEntry(a.id);
    expect(result.className).toBe("Context-Free");
    expect(result.chomskyType).toBe(2);
    expect(result.description).toContain("Alur");
  });

  it("returns Context-Free for PDA without recursion", () => {
    const sim = new Simulation();
    const entry = sim.addAutomaton("PDA 1", undefined, "PDA");
    const result = sim.getComputationalPowerClassForEntry(entry.id);
    expect(result.className).toBe("Context-Free");
    expect(result.chomskyType).toBe(2);
  });

  it("returns Recursively Enumerable for PDA with recursive calls", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("Recursive PDA", undefined, "PDA");

    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: a.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    const result = sim.getComputationalPowerClassForEntry(a.id);
    expect(result.className).toBe("Recursively Enumerable");
    expect(result.chomskyType).toBe(0);
    expect(result.description).toContain("Hopcroft");
  });

  it("returns Context-Free for recursive FA chain when scoped from FA (PDA isolated)", () => {
    const sim = new Simulation();
    // Two FAs in a recursive cycle (FA₁ ↔ FA₂)
    const fa1 = sim.addAutomaton("FA1", undefined, "FA");
    const fa2 = sim.addAutomaton("FA2", undefined, "FA");
    // Standalone PDA with no call involvement
    const pda = sim.addAutomaton("Standalone PDA", undefined, "PDA");

    fa1.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: fa2.id, callMode: "accept-reject" },
    });
    fa1.controller.graph.addNode("q1", { final: true });

    fa2.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: fa1.id, callMode: "accept-reject" },
    });
    fa2.controller.graph.addNode("q1", { final: true });

    // Scoped from FA1: only FA1 and FA2 are reachable (recursive FAs → Context-Free)
    const resultFromFA = sim.getComputationalPowerClassForEntry(fa1.id);
    expect(resultFromFA.className).toBe("Context-Free");
    expect(resultFromFA.chomskyType).toBe(2);

    // Scoped from standalone PDA: only the PDA itself is reachable → Context-Free
    const resultFromPDA = sim.getComputationalPowerClassForEntry(pda.id);
    expect(resultFromPDA.className).toBe("Context-Free");
    expect(resultFromPDA.chomskyType).toBe(2);
  });

  it("returns Recursively Enumerable when recursive FA chain reaches a PDA", () => {
    const sim = new Simulation();
    // FA₁ ↔ FA₂ (recursive cycle), and FA₂ → PDA₁ (non-recursive call)
    const fa1 = sim.addAutomaton("FA1", undefined, "FA");
    const fa2 = sim.addAutomaton("FA2", undefined, "FA");
    const pda1 = sim.addAutomaton("PDA1", undefined, "PDA");

    fa1.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: fa2.id, callMode: "accept-reject" },
    });
    fa1.controller.graph.addNode("q1", { final: true });

    // FA₂ calls FA₁ (creating the cycle) AND calls PDA₁
    fa2.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: fa1.id, callMode: "accept-reject" },
    });
    fa2.controller.graph.addNode("q1", {
      callConfig: { targetAutomatonId: pda1.id, callMode: "accept-reject" },
    });
    fa2.controller.graph.addNode("q2", { final: true });

    pda1.controller.graph.addNode("q0", { initial: true });
    pda1.controller.graph.addNode("q1", { final: true });

    // PDA is reachable from the recursive chain → multiple independent stacks → Type 0
    const result = sim.getComputationalPowerClassForEntry(fa1.id);
    expect(result.className).toBe("Recursively Enumerable");
    expect(result.chomskyType).toBe(0);
  });

  it("returns Recursively Enumerable for TM", () => {
    const sim = new Simulation();
    const entry = sim.addAutomaton("TM 1", undefined, "TM");
    const result = sim.getComputationalPowerClassForEntry(entry.id);
    expect(result.className).toBe("Recursively Enumerable");
    expect(result.chomskyType).toBe(0);
  });

  it("returns Empty for non-existent entry ID", () => {
    const sim = new Simulation();
    const result = sim.getComputationalPowerClassForEntry("non-existent-id");
    expect(result.className).toBe("Empty");
    expect(result.chomskyType).toBe(-1);
  });

  it("scopes correctly — FA tab shows Regular even when TM exists in another tab", () => {
    const sim = new Simulation();
    const fa = sim.addAutomaton("My FA", undefined, "FA");
    const tm = sim.addAutomaton("My TM", undefined, "TM");

    // FA has no call states → only itself is reachable → Regular
    const resultFA = sim.getComputationalPowerClassForEntry(fa.id);
    expect(resultFA.className).toBe("Regular");
    expect(resultFA.chomskyType).toBe(3);

    // TM tab → Recursively Enumerable
    const resultTM = sim.getComputationalPowerClassForEntry(tm.id);
    expect(resultTM.className).toBe("Recursively Enumerable");
    expect(resultTM.chomskyType).toBe(0);
  });
});

describe("Simulation.toRSMString (scoped)", () => {
  it("only includes reachable components from the given entry", () => {
    const sim = new Simulation();
    const fa = sim.addAutomaton("My FA", undefined, "FA");
    const tm = sim.addAutomaton("My TM", undefined, "TM");

    // FA has no call states, so toRSMString scoped from FA should only include FA
    const rsmFromFA = sim.toRSMString(fa.id);
    expect(rsmFromFA).toContain("My FA");
    expect(rsmFromFA).not.toContain("My TM");

    // TM scoped should only include TM
    const rsmFromTM = sim.toRSMString(tm.id);
    expect(rsmFromTM).toContain("My TM");
    expect(rsmFromTM).not.toContain("My FA");
  });

  it("includes connected components via call states", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("Caller", undefined, "FA");
    const b = sim.addAutomaton("Callee", undefined, "FA");
    sim.addAutomaton("Unrelated", undefined, "FA");

    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: b.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    const rsmFromA = sim.toRSMString(a.id);
    expect(rsmFromA).toContain("Caller");
    expect(rsmFromA).toContain("Callee");
    expect(rsmFromA).not.toContain("Unrelated");
  });
});

describe("Simulation.validateAllCallStates (enhanced)", () => {
  it("warns about call states with no outgoing transitions", () => {
    const sim = new Simulation();
    const caller = sim.addAutomaton("Caller", undefined, "FA");
    const callee = sim.addAutomaton("Callee", undefined, "FA");

    // Call state with NO outgoing transitions
    caller.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: callee.id, callMode: "accept-reject" },
    });
    caller.controller.graph.addNode("q1", { final: true });
    // Note: no edge from q0 to q1

    callee.controller.graph.addNode("q0", { initial: true });
    callee.controller.graph.addNode("q1", { final: true });

    const errors = sim.validateAllCallStates();
    expect(errors.some((e) => e.includes("no outgoing transitions"))).toBe(true);
  });

  it("warns about invalid target automata", () => {
    const sim = new Simulation();
    const caller = sim.addAutomaton("Caller", undefined, "FA");
    const callee = sim.addAutomaton("Callee", undefined, "FA");
    // Callee has no initial or final state — invalid

    caller.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: callee.id, callMode: "accept-reject" },
    });
    caller.controller.graph.addNode("q1", { final: true });

    const errors = sim.validateAllCallStates();
    expect(errors.some((e) => e.includes("not a valid automaton"))).toBe(true);
  });
});

describe("CallStateConfig exit-mapped mode", () => {
  it("supports exit-mapped call mode type", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("A", undefined, "FA");

    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: {
        targetAutomatonId: "some-id",
        callMode: "exit-mapped",
        exitMap: { qAccept: "a", qReject: "b" },
      },
    });
    a.controller.graph.addNode("q1", { final: true });

    const callStates = a.controller.graph.getCallStates();
    expect(callStates).toHaveLength(1);
    expect(callStates[0].callConfig?.callMode).toBe("exit-mapped");
    expect(callStates[0].callConfig?.exitMap).toEqual({ qAccept: "a", qReject: "b" });
  });
});

describe("Exit-mapped execution semantics", () => {
  it("routes caller based on callee exit node label", () => {
    // Sub-automaton with two exit nodes: qYes (accepts "a") and qNo (accepts "b")
    const subGraph = new FAGraph(false);
    const s0 = subGraph.addNode("s0", { initial: true });
    const sYes = subGraph.addNode("qYes", { final: true });
    const sNo = subGraph.addNode("qNo", { final: true });
    subGraph.addEdge(s0, sYes, new CharacterTransition("a"));
    subGraph.addEdge(s0, sNo, new CharacterTransition("b"));

    // Caller: q0 is a call state with exit-mapped mode
    // exitMap: qYes → "x" (follow 'x' transition), qNo → "y" (follow 'y' transition)
    const callerGraph = new FAGraph(false);
    const q0 = callerGraph.addNode("q0", { initial: true });
    const qCall = callerGraph.addNode("qCall", {
      callConfig: {
        targetAutomatonId: "sub",
        callMode: "exit-mapped",
        exitMap: { qYes: "x", qNo: "y" },
      },
    });
    const qAccept = callerGraph.addNode("qAccept", { final: true });
    const qReject = callerGraph.addNode("qReject");

    // q0 → qCall via epsilon
    callerGraph.addEdge(q0, qCall, new CharacterTransition(EPSILON));
    // qCall → qAccept via 'x' (when callee exits through qYes)
    callerGraph.addEdge(qCall, qAccept, new CharacterTransition("x"));
    // qCall → qReject via 'y' (when callee exits through qNo)
    callerGraph.addEdge(qCall, qReject, new CharacterTransition("y"));

    const resolver = (id: string) => (id === "sub" ? subGraph : null);

    const engine = new ExecutionEngine(new FAMachineType(), callerGraph);
    engine.resolver = resolver;

    // Input "a" → callee accepts via qYes → caller follows 'x' → qAccept ✓
    expect(engine.run("a")).toBe(true);

    // Input "b" → callee accepts via qNo → caller follows 'y' → qReject (not final) ✗
    expect(engine.run("b")).toBe(false);
  });
});
