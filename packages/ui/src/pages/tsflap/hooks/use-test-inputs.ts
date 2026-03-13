/**
 * useTestInputs — Manages the "Quick Testing" panel state.
 *
 * Encapsulates the list of test input strings, their execution results,
 * focus management for the input refs, and CRUD operations (add, update,
 * remove, clear).  The hook also runs the test suite automatically whenever
 * the inputs or the graph change.
 *
 * Test execution uses the {@link ExecutionEngine} from the tsflap engine
 * package, which supports all graph types (FA, PDA, TM) and the RSM
 * sub-automaton resolver for call states.
 */

import type { Controller, SubAutomatonResolver } from "@mubox/local-tsflap";
import { ExecutionEngine, MachineError, MachineTypeRegistry } from "@mubox/local-tsflap";
import { useCallback, useEffect, useRef, useState } from "react";

import type { TestResult } from "../test-input-row";

export interface UseTestInputsReturn {
  /** The current list of input strings. */
  readonly testInputs: string[];
  /** Parallel array of execution results (may lag behind inputs briefly). */
  readonly testResults: TestResult[];
  /** Ref callback array — attach each to the corresponding `<input>`. */
  readonly testInputRefs: React.RefObject<(HTMLInputElement | null)[]>;
  /** Append a new empty input and focus it. */
  readonly addTestInput: () => void;
  /** Insert a new empty input after the given index and focus it. */
  readonly addTestInputAfter: (index: number) => void;
  /** Update the value of the input at the given index. */
  readonly updateTestInput: (index: number, value: string) => void;
  /** Remove the input at the given index and focus the previous one. */
  readonly removeTestInput: (index: number) => void;
  /** Remove all inputs and results. */
  readonly clearAllTests: () => void;
  /** Derived counts for the header badge. */
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly errorCount: number;
}

/**
 * @param controller - The active automaton controller (provides the graph).
 * @param createResolver - Factory that builds a {@link SubAutomatonResolver}
 *   for RSM call-state support during test execution.
 */
export function useTestInputs(controller: Controller, createResolver: () => SubAutomatonResolver): UseTestInputsReturn {
  const [testInputs, setTestInputs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const testInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Keep a ref to the latest inputs so the runner callback never goes stale. */
  const testInputsRef = useRef(testInputs);
  testInputsRef.current = testInputs;

  /* ─── Test runner ─── */

  const runTests = useCallback(() => {
    const inputs = testInputsRef.current;
    if (inputs.length === 0) {
      setTestResults([]);
      return;
    }

    const graphName = controller.graph.shortName;
    const machineType = MachineTypeRegistry.getOrThrow(graphName);
    const engine = new ExecutionEngine(machineType, controller.graph);

    /*
     * Wire up the sub-automaton resolver so call states work during testing.
     * This connects the RSM system: the engine can now resolve call-state
     * references to other automata in the workspace.
     */
    if (controller.graph.hasCallStates()) {
      engine.resolver = createResolver();
    }

    const results: TestResult[] = inputs.map((input) => {
      try {
        const accepted = engine.run(input);
        return { accepted, error: "", output: "" };
      } catch (err: unknown) {
        const msg = err instanceof MachineError ? err.message : err instanceof Error ? err.message : "Error";
        return { accepted: null, error: msg, output: "" };
      }
    });

    setTestResults(results);
  }, [controller, createResolver]);

  /* Re-run tests whenever the inputs change. */
  useEffect(() => {
    runTests();
  }, [testInputs, runTests]);

  /* ─── CRUD operations ─── */

  const addTestInput = useCallback(() => {
    setTestInputs((prev) => [...prev, ""]);
    setTimeout(() => {
      testInputRefs.current[testInputRefs.current.length - 1]?.focus();
    }, 20);
  }, []);

  const addTestInputAfter = useCallback((index: number) => {
    setTestInputs((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, "");
      return next;
    });
    setTimeout(() => {
      testInputRefs.current[index + 1]?.focus();
    }, 20);
  }, []);

  const updateTestInput = useCallback((i: number, v: string) => {
    setTestInputs((prev) => prev.map((x, j) => (j === i ? v : x)));
  }, []);

  const removeTestInput = useCallback((i: number) => {
    setTestInputs((prev) => prev.filter((item, j) => j !== i));
    setTimeout(() => {
      testInputRefs.current[Math.max(0, i - 1)]?.focus();
    }, 20);
  }, []);

  const clearAllTests = useCallback(() => {
    setTestInputs([]);
    setTestResults([]);
  }, []);

  /* ─── Derived counts ─── */

  const acceptedCount = testResults.filter((r) => r.accepted === true).length;
  const rejectedCount = testResults.filter((r) => r.accepted === false).length;
  const errorCount = testResults.filter((r) => r.accepted === null && r.error).length;

  return {
    testInputs,
    testResults,
    testInputRefs,
    addTestInput,
    addTestInputAfter,
    updateTestInput,
    removeTestInput,
    clearAllTests,
    acceptedCount,
    rejectedCount,
    errorCount,
  };
}
