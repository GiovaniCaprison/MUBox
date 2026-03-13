import { describe, expect, it } from "vitest";

import { Simulation } from "../../src/engine/simulation";

describe("Simulation", () => {
  it("starts empty with a name", () => {
    const sim = new Simulation("Test");
    expect(sim.name).toBe("Test");
    expect(sim.size).toBe(0);
    expect(sim.getActive()).toBeNull();
  });

  it("adds automata and sets first as active", () => {
    const sim = new Simulation();
    const entry1 = sim.addAutomaton("FA 1");
    sim.addAutomaton("FA 2");

    expect(sim.size).toBe(2);
    expect(sim.activeId).toBe(entry1.id);
    expect(sim.getActive()).toBe(entry1);
  });

  it("setActive switches the active automaton", () => {
    const sim = new Simulation();
    sim.addAutomaton("A");
    const e2 = sim.addAutomaton("B");

    sim.setActive(e2.id);
    expect(sim.activeId).toBe(e2.id);
    expect(sim.getActive()).toBe(e2);
  });

  it("setActive returns false for unknown id", () => {
    const sim = new Simulation();
    expect(sim.setActive("nonexistent")).toBe(false);
  });

  it("removeAutomaton removes and switches active", () => {
    const sim = new Simulation();
    const e1 = sim.addAutomaton("A");
    const e2 = sim.addAutomaton("B");

    sim.removeAutomaton(e1.id);
    expect(sim.size).toBe(1);
    expect(sim.activeId).toBe(e2.id);
  });

  it("removeAutomaton returns false for unknown id", () => {
    const sim = new Simulation();
    expect(sim.removeAutomaton("nonexistent")).toBe(false);
  });

  it("rename changes the entry name", () => {
    const sim = new Simulation();
    const e = sim.addAutomaton("Original");
    sim.rename(e.id, "Renamed");
    expect(sim.getEntry(e.id)?.name).toBe("Renamed");
  });

  it("getEntries returns all entries in order", () => {
    const sim = new Simulation();
    sim.addAutomaton("A");
    sim.addAutomaton("B");
    sim.addAutomaton("C");

    const entries = sim.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].name).toBe("A");
    expect(entries[1].name).toBe("B");
    expect(entries[2].name).toBe("C");
  });

  it("createGraphResolver resolves existing automata", () => {
    const sim = new Simulation();
    const e = sim.addAutomaton("Test FA");
    const resolver = sim.createGraphResolver();

    expect(resolver(e.id)).toBe(e.controller.graph);
    expect(resolver("nonexistent")).toBeNull();
  });

  it("resolveAutomaton returns entry or null", () => {
    const sim = new Simulation();
    const e = sim.addAutomaton("Test");

    expect(sim.resolveAutomaton(e.id)).toBe(e);
    expect(sim.resolveAutomaton("nonexistent")).toBeNull();
  });

  it("validateAllCallStates reports broken references", () => {
    const sim = new Simulation();
    const e = sim.addAutomaton("Caller");

    // Add a call state referencing a non-existent automaton
    e.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: "nonexistent", callMode: "accept-reject" },
    });
    e.controller.graph.addNode("q1", { final: true });

    const errors = sim.validateAllCallStates();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("nonexistent");
  });

  it("validateAllCallStates returns empty for valid references", () => {
    const sim = new Simulation();
    const callee = sim.addAutomaton("Callee");
    const caller = sim.addAutomaton("Caller");

    // Callee must be valid (has initial + final states)
    callee.controller.graph.addNode("s0", { initial: true });
    callee.controller.graph.addNode("s1", { final: true });

    // Caller call state must have outgoing transitions
    const q0 = caller.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: callee.id, callMode: "accept-reject" },
    });
    const q1 = caller.controller.graph.addNode("q1", { final: true });
    caller.controller.graph.addEdge(q0, q1, caller.controller.graph.createTransitionFromString("a", false));

    const errors = sim.validateAllCallStates();
    expect(errors).toHaveLength(0);
  });

  it("buildDependencyGraph maps call state references", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("A");
    const b = sim.addAutomaton("B");

    // A calls B
    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: b.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    const depGraph = sim.buildDependencyGraph();
    expect(depGraph.get(a.id)?.has(b.id)).toBe(true);
    expect(depGraph.get(b.id)?.size).toBe(0);
  });

  it("getDependents finds reverse dependencies", () => {
    const sim = new Simulation();
    const a = sim.addAutomaton("A");
    const b = sim.addAutomaton("B");

    a.controller.graph.addNode("q0", {
      initial: true,
      callConfig: { targetAutomatonId: b.id, callMode: "accept-reject" },
    });
    a.controller.graph.addNode("q1", { final: true });

    const dependents = sim.getDependents(b.id);
    expect(dependents).toHaveLength(1);
    expect(dependents[0].id).toBe(a.id);
  });

  it("onChangeCallback is invoked on mutations", () => {
    const sim = new Simulation();
    let callCount = 0;
    sim.onChangeCallback = () => callCount++;

    sim.addAutomaton("A"); // +1
    sim.addAutomaton("B"); // +1
    const entries = sim.getEntries();
    sim.setActive(entries[1].id); // +1
    sim.rename(entries[0].id, "X"); // +1
    sim.removeAutomaton(entries[0].id); // +1

    expect(callCount).toBe(5);
  });

  it("supports different graph types", () => {
    const sim = new Simulation();
    const fa = sim.addAutomaton("FA", undefined, "FA");
    const pda = sim.addAutomaton("PDA", undefined, "PDA");
    const tm = sim.addAutomaton("TM", undefined, "TM");

    expect(fa.graphType).toBe("FA");
    expect(pda.graphType).toBe("PDA");
    expect(tm.graphType).toBe("TM");
    expect(fa.controller.graph.shortName).toBe("FA");
    expect(pda.controller.graph.shortName).toBe("PDA");
    expect(tm.controller.graph.shortName).toBe("TM");
  });
});
