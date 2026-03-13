/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";

import { SimulationStatus, StepSimulator } from "../../src/engine/step-simulator";
import { FAGraph } from "../../src/model/graphs/fa-graph";
import { CharacterTransition } from "../../src/model/transitions/character-transition";

function buildSimpleDFA(): FAGraph {
  // Accepts "ab"
  const g = new FAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1");
  const q2 = g.addNode("q2", { final: true });
  g.addEdge(q0, q1, new CharacterTransition("a"));
  g.addEdge(q1, q2, new CharacterTransition("b"));
  return g;
}

function buildNFAWithBranching(): FAGraph {
  // NFA: q0 --a--> q1, q0 --a--> q2(final)
  // Accepts "a" (via q0→q2) but also has a dead branch (q0→q1)
  const g = new FAGraph(false);
  const q0 = g.addNode("q0", { initial: true });
  const q1 = g.addNode("q1");
  const q2 = g.addNode("q2", { final: true });
  g.addEdge(q0, q1, new CharacterTransition("a"));
  g.addEdge(q0, q2, new CharacterTransition("a"));
  return g;
}

describe("StepSimulator", () => {
  it("initializes with step 0 showing the initial state", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ab");

    expect(sim.status).toBe(SimulationStatus.RUNNING);
    expect(sim.stepNumber).toBe(0);
    expect(sim.currentStep).not.toBeNull();
    expect(sim.currentStep!.configurations).toHaveLength(1);
    expect(sim.currentStep!.activeNodes.size).toBe(1);
  });

  it("steps through a simple DFA accepting 'ab'", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ab");

    // Step 0: at q0
    expect(sim.currentStep!.configurations[0].node.label).toBe("q0");

    // Step 1: read 'a', move to q1
    sim.step();
    expect(sim.stepNumber).toBe(1);
    expect(sim.currentStep!.configurations[0].node.label).toBe("q1");
    expect(sim.status).toBe(SimulationStatus.RUNNING);

    // Step 2: read 'b', move to q2 (final)
    sim.step();
    expect(sim.stepNumber).toBe(2);
    expect(sim.status).toBe(SimulationStatus.ACCEPTED);
  });

  it("rejects input that doesn't match", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ba");

    // Step 1: no transition from q0 on 'b'
    sim.step();
    expect(sim.status).toBe(SimulationStatus.REJECTED);
  });

  it("step back returns to previous state", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ab");

    sim.step(); // step 1
    sim.step(); // step 2 (accepted)
    expect(sim.stepNumber).toBe(2);

    sim.stepBack();
    expect(sim.stepNumber).toBe(1);
    expect(sim.currentStep!.configurations[0].node.label).toBe("q1");

    sim.stepBack();
    expect(sim.stepNumber).toBe(0);
    expect(sim.currentStep!.configurations[0].node.label).toBe("q0");
  });

  it("canStepForward and canStepBack are correct", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ab");

    expect(sim.canStepForward).toBe(true);
    expect(sim.canStepBack).toBe(false);

    sim.step();
    expect(sim.canStepBack).toBe(true);
    expect(sim.canStepForward).toBe(true);

    sim.step(); // accepted
    expect(sim.canStepForward).toBe(false);
    expect(sim.canStepBack).toBe(true);
  });

  it("reset returns to initial state", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ab");

    sim.step();
    sim.step();
    expect(sim.status).toBe(SimulationStatus.ACCEPTED);

    sim.reset();
    expect(sim.stepNumber).toBe(0);
    expect(sim.status).toBe(SimulationStatus.RUNNING);
  });

  it("runToEnd completes the simulation", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ab");

    sim.runToEnd();
    expect(sim.status).toBe(SimulationStatus.ACCEPTED);
  });

  it("handles NFA branching — multiple configurations", () => {
    const g = buildNFAWithBranching();
    const sim = new StepSimulator(g, "a");

    // Step 0: at q0
    expect(sim.currentStep!.configurations).toHaveLength(1);

    // Step 1: branches to q1 and q2
    sim.step();
    expect(sim.status).toBe(SimulationStatus.ACCEPTED);
    // Should have found the accepting branch
  });

  it("reports ERROR for invalid graph", () => {
    const g = new FAGraph(false); // no initial or final state
    const sim = new StepSimulator(g, "a");
    expect(sim.status).toBe(SimulationStatus.ERROR);
    expect(sim.errorMessage).toBeTruthy();
  });

  it("jumpToStep navigates history", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ab");

    sim.step(); // 1
    sim.step(); // 2

    sim.jumpToStep(0);
    expect(sim.stepNumber).toBe(0);

    sim.jumpToStep(2);
    expect(sim.stepNumber).toBe(2);
  });

  it("history records all steps", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "ab");

    sim.step();
    sim.step();

    expect(sim.totalSteps).toBe(3); // step 0, 1, 2
    expect(sim.history).toHaveLength(3);
  });

  it("inputString returns the original input", () => {
    const g = buildSimpleDFA();
    const sim = new StepSimulator(g, "hello");
    expect(sim.inputString).toBe("hello");
  });
});
