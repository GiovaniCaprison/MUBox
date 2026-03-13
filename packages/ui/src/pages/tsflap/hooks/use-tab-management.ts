/**
 * useTabManagement — Manages the multi-tab automaton workspace.
 *
 * Wraps the {@link Simulation} workspace object and exposes tab CRUD
 * operations (add, remove, switch, rename) plus derived state like the
 * entries list and active entry.  Also handles the inline tab-rename
 * editing state.
 *
 * When a tab is removed, the hook checks for RSM dependencies (other
 * automata that reference the deleted one via call states) and delegates
 * to a confirmation callback before proceeding.
 */

import type { Controller, GraphType, Simulation } from "@mubox/local-tsflap";
import { FAGraph } from "@mubox/local-tsflap";
import { useCallback, useState } from "react";

import type { CanvasDimensions } from "./use-canvas-dimensions";

/* ─── Types ─── */

/** The shape of the state that the page component needs from this hook. */
export interface UseTabManagementReturn {
  /* Derived workspace state */
  readonly entries: ReturnType<Simulation["getEntries"]>;
  readonly activeId: string | null;
  readonly activeEntry: ReturnType<Simulation["getActive"]>;
  readonly controller: Controller;

  /* Graph metadata (kept in sync with the active controller) */
  readonly graphType: GraphType;
  readonly deterministic: boolean;
  readonly graphString: string;
  readonly isValid: boolean;
  readonly nodeCount: number;
  readonly edgeCount: number;

  /* Tab operations */
  readonly handleAddAutomaton: (type: GraphType) => void;
  readonly addResultAndSwitch: (name: string, resultController: Controller) => void;
  readonly handleSwitchAutomaton: (id: string) => void;
  readonly handleRemoveAutomaton: (id: string) => void;
  readonly toggleDeterministic: (checked: boolean) => void;

  /* Inline rename */
  readonly editingTabId: string | null;
  readonly editingTabName: string;
  readonly startEditingTab: (id: string, currentName: string) => void;
  readonly finishEditingTab: () => void;
  readonly setEditingTabName: (name: string) => void;

  /**
   * Sync the React state from a controller.  Called after operations that
   * change the active controller (tab switch, add, remove).
   */
  readonly syncUIFromController: (ctrl: Controller) => void;

  /** Force a re-render (used by board-update listeners). */
  readonly forceUpdate: () => void;
}

/**
 * @param simulation - The workspace {@link Simulation} instance (stable across renders).
 * @param canvasDimensions - Current canvas pixel dimensions for viewport init.
 * @param showConfirm - Callback to open a confirmation modal before destructive actions.
 */
export function useTabManagement(
  simulation: Simulation,
  canvasDimensions: CanvasDimensions,
  showConfirm: (opts: {
    title: string;
    description: string;
    variant?: "danger" | "warning" | "info";
    confirmLabel?: string;
    onConfirm: () => void;
  }) => void,
): UseTabManagementReturn {
  /* ─── Core graph metadata state ─── */
  const [graphType, setGraphType] = useState<GraphType>("FA");
  const [deterministic, setDeterministic] = useState(false);
  const [graphString, setGraphString] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [, setRenderTick] = useState(0);

  /* ─── Tab editing state ─── */
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");

  const forceUpdate = useCallback(() => setRenderTick((n) => n + 1), []);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const controller = simulation.getActiveController()!;

  /* ─── Sync helper ─── */

  const syncUIFromController = useCallback((ctrl: Controller) => {
    setGraphString(ctrl.graph.toString());
    setIsValid(ctrl.graph.isValid());
    setNodeCount(ctrl.views.nodes.length);
    setEdgeCount(ctrl.views.edges.length);
    setGraphType(ctrl.graph.shortName as GraphType);
    if (ctrl.graph instanceof FAGraph) {
      setDeterministic(ctrl.graph.deterministic);
    } else {
      setDeterministic(false);
    }
  }, []);

  /* ─── Tab operations ─── */

  const handleAddAutomaton = useCallback(
    (type: GraphType) => {
      const entry = simulation.addAutomaton(undefined, undefined, type);
      entry.controller.initViewport(canvasDimensions.width, canvasDimensions.height);
      simulation.setActive(entry.id);
      syncUIFromController(entry.controller);
      forceUpdate();
    },
    [simulation, canvasDimensions, syncUIFromController, forceUpdate],
  );

  const addResultAndSwitch = useCallback(
    (name: string, resultController: Controller) => {
      const entry = simulation.addAutomaton(name, resultController, undefined);
      entry.controller.initViewport(canvasDimensions.width, canvasDimensions.height);
      simulation.setActive(entry.id);
      syncUIFromController(entry.controller);
      forceUpdate();
    },
    [simulation, canvasDimensions, syncUIFromController, forceUpdate],
  );

  const handleSwitchAutomaton = useCallback(
    (id: string) => {
      simulation.setActive(id);
      const newCtrl = simulation.getActiveController();
      if (newCtrl) syncUIFromController(newCtrl);
      forceUpdate();
    },
    [simulation, syncUIFromController, forceUpdate],
  );

  const handleRemoveAutomaton = useCallback(
    (id: string) => {
      if (simulation.size <= 1) return;
      const entry = simulation.getEntry(id);
      if (!entry) return;

      /* Check for RSM dependencies — other automata referencing this one. */
      const dependents = simulation.getDependents(id);
      const dependentNames = dependents.map((d) => `"${d.name}"`).join(", ");

      const n = entry.controller.views.nodes.length;
      const e = entry.controller.views.edges.length;
      const hasContent = n > 0 || e > 0;
      const hasDependents = dependents.length > 0;

      if (hasContent || hasDependents) {
        const contentMsg = hasContent ? `This automaton has ${n} node${n !== 1 ? "s" : ""} and ${e} edge${e !== 1 ? "s" : ""}. ` : "";
        const dependentMsg = hasDependents
          ? `⚠ ${dependentNames} contain${dependents.length === 1 ? "s" : ""} call states referencing this automaton. ` +
            `Deleting it will break those references.`
          : "";

        showConfirm({
          title: `Close "${entry.name}"?`,
          description: `${contentMsg}${dependentMsg} This action cannot be undone.`,
          variant: "danger",
          confirmLabel: hasDependents ? "Close & Break References" : "Close Tab",
          onConfirm: () => {
            simulation.removeAutomaton(id);
            const newCtrl = simulation.getActiveController();
            if (newCtrl) syncUIFromController(newCtrl);
            forceUpdate();
          },
        });
        return;
      }

      /* No content and no dependents — remove immediately. */
      simulation.removeAutomaton(id);
      const newCtrl = simulation.getActiveController();
      if (newCtrl) syncUIFromController(newCtrl);
      forceUpdate();
    },
    [simulation, syncUIFromController, forceUpdate, showConfirm],
  );

  /* ─── Deterministic toggle ─── */

  const toggleDeterministic = useCallback(
    (checked: boolean) => {
      setDeterministic(checked);
      if (controller.graph instanceof FAGraph) {
        controller.graph.deterministic = checked;
        controller.views.update();
      }
    },
    [controller],
  );

  /* ─── Inline rename ─── */

  const startEditingTab = useCallback((id: string, currentName: string) => {
    setEditingTabId(id);
    setEditingTabName(currentName);
  }, []);

  const finishEditingTab = useCallback(() => {
    if (editingTabId && editingTabName.trim()) {
      simulation.rename(editingTabId, editingTabName.trim());
    }
    setEditingTabId(null);
    setEditingTabName("");
    forceUpdate();
  }, [editingTabId, editingTabName, simulation, forceUpdate]);

  return {
    entries: simulation.getEntries(),
    activeId: simulation.activeId,
    activeEntry: simulation.getActive(),
    controller,

    graphType,
    deterministic,
    graphString,
    isValid,
    nodeCount,
    edgeCount,

    handleAddAutomaton,
    addResultAndSwitch,
    handleSwitchAutomaton,
    handleRemoveAutomaton,
    toggleDeterministic,

    editingTabId,
    editingTabName,
    startEditingTab,
    finishEditingTab,
    setEditingTabName,

    syncUIFromController,
    forceUpdate,
  };
}
