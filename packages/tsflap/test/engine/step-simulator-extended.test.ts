/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";

import { SimulationStatus, StepSimulator } from "../../src/engine/step-simulator";
import { PDAGraph } from "../../src/model/graphs/pda-graph";
import { TMGraph } from "../../src/model/graphs/tm-graph";
import { BLANK, EPSILON, INITIAL_STACK } from "../../src/model/symbols";
import { PushdownTransition } from "../../src/model/transitions/pushdown-transition";
import { TuringTransition, TuringTransitionDirection } from "../../src/model/transitions/turing-transition";

describe("StepSimulator — PDA", () => {
  function buildPDAAnBn(): PDAGraph {
    const g = new PDAGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const q1 = g.addNode("q1");
    const q2 = g.addNode("q2", { final: true });
    g.addEdge(q0, q0, new PushdownTransition("a", EPSILON, "A"));
    g.addEdge(q0, q1, new PushdownTransition("b", "A", EPSILON));
    g.addEdge(q1, q1, new PushdownTransition("b", "A", EPSILON));
    g.addEdge(q1, q2, new PushdownTransition(EPSILON, INITIAL_STACK, INITIAL_STACK));
    g.addEdge(q0, q2, new PushdownTransition(EPSILON, INITIAL_STACK, INITIAL_STACK));
    return g;
  }

  it("accepts a^n b^n via step simulation", () => {
    const sim = new StepSimulator(buildPDAAnBn(), "aabb");
    sim.runToEnd();
    expect(sim.status).toBe(SimulationStatus.ACCEPTED);
  });

  it("rejects unbalanced input via step simulation", () => {
    const sim = new StepSimulator(buildPDAAnBn(), "aab");
    sim.runToEnd();
    expect(sim.status).toBe(SimulationStatus.REJECTED);
  });

  it("accepts empty string (n=0)", () => {
    const sim = new StepSimulator(buildPDAAnBn(), "");
    // Initial state should already be accepted (epsilon to q2)
    sim.runToEnd();
    expect(sim.status).toBe(SimulationStatus.ACCEPTED);
  });

  it("PDA configurations show stack contents", () => {
    const sim = new StepSimulator(buildPDAAnBn(), "ab");
    // Step 0: initial
    expect(sim.currentStep!.configurations.length).toBeGreaterThan(0);

    sim.step(); // process 'a'
    // Should have configurations with stack info in description
    const configs = sim.currentStep!.configurations;
    const hasStackInfo = configs.some((c) => c.description.includes("stack"));
    expect(hasStackInfo).toBe(true);
  });
});

describe("StepSimulator — TM", () => {
  function buildTMFlipBits(): TMGraph {
    // TM that flips 'a' to 'b' and vice versa, then accepts
    const g = new TMGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const qAccept = g.addNode("qA", { final: true });
    g.addEdge(q0, q0, new TuringTransition("a", "b", TuringTransitionDirection.RIGHT));
    g.addEdge(q0, q0, new TuringTransition("b", "a", TuringTransitionDirection.RIGHT));
    g.addEdge(q0, qAccept, new TuringTransition(BLANK, BLANK, TuringTransitionDirection.RIGHT));
    return g;
  }

  it("accepts and shows tape state at each step", () => {
    const sim = new StepSimulator(buildTMFlipBits(), "ab");
    expect(sim.status).toBe(SimulationStatus.RUNNING);

    sim.step(); // flip 'a' to 'b', move right
    expect(sim.status).toBe(SimulationStatus.RUNNING);
    const desc1 = sim.currentStep!.configurations[0].description;
    expect(desc1).toContain("tape");

    sim.step(); // flip 'b' to 'a', move right
    expect(sim.status).toBe(SimulationStatus.RUNNING);

    sim.step(); // read blank, accept
    expect(sim.status).toBe(SimulationStatus.ACCEPTED);
  });

  it("runToEnd completes TM simulation", () => {
    const sim = new StepSimulator(buildTMFlipBits(), "aabb");
    sim.runToEnd();
    expect(sim.status).toBe(SimulationStatus.ACCEPTED);
  });

  it("rejects when TM halts in non-final state", () => {
    const g = new TMGraph(false);
    const q0 = g.addNode("q0", { initial: true });
    const qReject = g.addNode("qR");
    const qAccept = g.addNode("qA", { final: true });
    // Only accept 'a', reject on 'b'
    g.addEdge(q0, qAccept, new TuringTransition("a", "a", TuringTransitionDirection.RIGHT));
    g.addEdge(q0, qReject, new TuringTransition("b", "b", TuringTransitionDirection.RIGHT));

    const sim = new StepSimulator(g, "b");
    sim.runToEnd();
    expect(sim.status).toBe(SimulationStatus.REJECTED);
  });
});
