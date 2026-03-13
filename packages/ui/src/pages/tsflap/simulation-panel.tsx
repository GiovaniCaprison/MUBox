import type { Controller, SimulationConfiguration, SubAutomatonResolver, Node } from "@mubox/local-tsflap";
import { StepSimulator, SimulationStatus, BLANK } from "@mubox/local-tsflap";
import type { FunctionComponent } from "react";
import { useState, useRef, useCallback, useEffect } from "react";

import { FloatingPanel, PanelSection, PanelRow, PanelDivider, PanelBadge, PanelButton, PanelInput } from "@/components/floating-panel";

/* ─── Highlight Colors ─── */

const ACTIVE_NODE_COLOR = "#16a34a"; // green-600 — currently active states
const ACCEPTING_NODE_COLOR = "#facc15"; // yellow-400 — accepting/final states reached
const REJECTED_NODE_COLOR = "#dc2626"; // red-600 — states where machine got stuck
const TRAVERSED_EDGE_COLOR = "#2563eb"; // blue-600 — edges just traversed
const ERROR_NODE_COLOR = "#ea580c"; // orange-600 — error states

/* ─── Inline SVG Icons ─── */

const ResetIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 1v4h4M11 11V7H7" />
    <path d="M9.5 4.5A4.5 4.5 0 0 0 2.1 2.1L1 5M2.5 7.5A4.5 4.5 0 0 0 9.9 9.9L11 7" />
  </svg>
);

const StepBackIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 10L4 6l4-4" />
    <line x1="3" y1="2" x2="3" y2="10" />
  </svg>
);

const StepForwardIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 2l4 4-4 4" />
    <line x1="9" y1="2" x2="9" y2="10" />
  </svg>
);

const FastForwardIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 2l4 4-4 4" />
    <path d="M7 2l4 4-4 4" />
  </svg>
);

const StepIntoIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 1v7" />
    <path d="M3 5l3 3 3-3" />
    <line x1="2" y1="11" x2="10" y2="11" />
  </svg>
);

const StepOutIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 8V1" />
    <path d="M3 4l3-3 3 3" />
    <line x1="2" y1="11" x2="10" y2="11" />
  </svg>
);

const PlayIcon: FunctionComponent = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 1.5l7 4.5-7 4.5z" />
  </svg>
);

const PauseIcon: FunctionComponent = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="2" x2="4" y2="10" />
    <line x1="8" y1="2" x2="8" y2="10" />
  </svg>
);

/* ─── Props ─── */

interface SimulationPanelProps {
  readonly controller: Controller;
  readonly onUpdate: () => void;
  /** Optional resolver for sub-automaton calls (RSM extension) */
  readonly resolver?: SubAutomatonResolver | null;
  /** Callback to get the name of an automaton by ID */
  readonly getAutomatonName?: (automatonId: string) => string | undefined;
}

/* ─── Component ─── */

/** Per-controller simulation state that persists across tab switches */
interface PerControllerState {
  simulator: StepSimulator | null;
  inputValue: string;
}

export const SimulationPanel: FunctionComponent<SimulationPanelProps> = ({ controller, onUpdate, resolver, getAutomatonName }) => {
  const [inputValue, setInputValue] = useState("");
  const [simulator, setSimulator] = useState<StepSimulator | null>(null);
  const [, forceRender] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms between steps
  const [isExpanded, setIsExpanded] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulatorRef = useRef<StepSimulator | null>(null);

  /** Map from controller → saved simulation state (persists across tab switches) */
  const perControllerStateRef = useRef<Map<Controller, PerControllerState>>(new Map());

  // Keep ref in sync
  simulatorRef.current = simulator;

  // Track controller changes (tab switching) — save/restore simulation per controller
  const prevControllerRef = useRef<Controller>(controller);
  useEffect(() => {
    if (prevControllerRef.current !== controller) {
      const oldController = prevControllerRef.current;

      // Save current simulation state for the old controller
      perControllerStateRef.current.set(oldController, {
        simulator: simulatorRef.current,
        inputValue,
      });

      // Clear highlights on the old controller's canvas
      oldController.state.highlightedNodes.clear();
      oldController.state.highlightedEdges.clear();
      oldController.state.simulationActive = false;
      oldController.views.update();

      // Stop auto-play
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
      setIsAutoPlaying(false);

      // Restore saved state for the new controller (if any)
      const saved = perControllerStateRef.current.get(controller);
      if (saved?.simulator) {
        setSimulator(saved.simulator);
        simulatorRef.current = saved.simulator;
        setInputValue(saved.inputValue);
        // Re-apply highlights on the restored controller after a tick
        // (need to wait for React state to settle)
        setTimeout(() => {
          if (saved.simulator?.currentStep) {
            // Re-apply highlights for the restored simulation
            controller.state.simulationActive = true;
            const restoredStep = saved.simulator.currentStep;
            for (const node of restoredStep.activeNodes) {
              const isAccepting = restoredStep.configurations.some((c: SimulationConfiguration) => c.node === node && c.isFinal);
              const color =
                restoredStep.status === SimulationStatus.ERROR
                  ? ERROR_NODE_COLOR
                  : restoredStep.status === SimulationStatus.REJECTED
                    ? REJECTED_NODE_COLOR
                    : isAccepting
                      ? ACCEPTING_NODE_COLOR
                      : ACTIVE_NODE_COLOR;
              controller.state.highlightedNodes.set(node, color);
            }
            for (const edge of restoredStep.traversedEdges) {
              controller.state.highlightedEdges.set(edge, TRAVERSED_EDGE_COLOR);
            }
            controller.views.update();
          }
        }, 0);
      } else {
        setSimulator(null);
        simulatorRef.current = null;
        setInputValue(saved?.inputValue ?? "");
      }

      prevControllerRef.current = controller;
    }
  }, [controller, inputValue]);

  const rerender = useCallback(() => {
    forceRender((n) => n + 1);
    onUpdate();
  }, [onUpdate]);

  /** Apply highlights from the current simulation step to the controller state */
  const applyHighlights = useCallback(
    (sim: StepSimulator | null) => {
      controller.state.highlightedNodes.clear();
      controller.state.highlightedEdges.clear();

      if (!sim?.currentStep) {
        controller.state.simulationActive = false;
        controller.views.update();
        return;
      }

      controller.state.simulationActive = true;
      const step = sim.currentStep;

      // For rejected/error states with no active nodes, show the previous step's nodes in red
      if (
        (step.status === SimulationStatus.REJECTED || step.status === SimulationStatus.ERROR) &&
        step.activeNodes.size === 0 &&
        step.stepNumber > 0
      ) {
        const prevStep = sim.history[step.stepNumber - 1];
        const failColor = step.status === SimulationStatus.ERROR ? ERROR_NODE_COLOR : REJECTED_NODE_COLOR;
        for (const node of prevStep.activeNodes) {
          controller.state.highlightedNodes.set(node, failColor);
        }
      } else {
        // Highlight active nodes
        for (const node of step.activeNodes) {
          const isAccepting = step.configurations.some((c) => c.node === node && c.isFinal);
          let color: string;
          if (step.status === SimulationStatus.ERROR) {
            color = ERROR_NODE_COLOR;
          } else if (step.status === SimulationStatus.REJECTED) {
            color = REJECTED_NODE_COLOR;
          } else if (isAccepting) {
            color = ACCEPTING_NODE_COLOR;
          } else {
            color = ACTIVE_NODE_COLOR;
          }
          controller.state.highlightedNodes.set(node, color);
        }
      }

      // Highlight traversed edges
      for (const edge of step.traversedEdges) {
        controller.state.highlightedEdges.set(edge, TRAVERSED_EDGE_COLOR);
      }

      controller.views.update();
    },
    [controller],
  );

  /** Auto-play control */
  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    setIsAutoPlaying(false);
  }, []);

  /** Start a new simulation */
  const startSimulation = useCallback(() => {
    stopAutoPlay();
    const sim = new StepSimulator(controller.graph, inputValue);
    // Wire up the sub-automaton resolver for RSM call state support.
    // When the graph has call states, the step simulator needs the resolver
    // to look up referenced automata during step-by-step execution.
    if (resolver && controller.graph.hasCallStates()) {
      sim.resolver = resolver;
    }
    setSimulator(sim);
    simulatorRef.current = sim;
    applyHighlights(sim);
    rerender();
  }, [controller.graph, inputValue, resolver, applyHighlights, rerender, stopAutoPlay]);

  /** Step forward */
  const handleStep = useCallback(() => {
    if (!simulatorRef.current) return;
    simulatorRef.current.step();
    applyHighlights(simulatorRef.current);
    rerender();
  }, [applyHighlights, rerender]);

  /** Step back */
  const handleStepBack = useCallback(() => {
    if (!simulatorRef.current) return;
    simulatorRef.current.stepBack();
    applyHighlights(simulatorRef.current);
    rerender();
  }, [applyHighlights, rerender]);

  /** Reset */
  const handleReset = useCallback(() => {
    stopAutoPlay();
    if (!simulatorRef.current) return;
    simulatorRef.current.reset();
    applyHighlights(simulatorRef.current);
    rerender();
  }, [applyHighlights, rerender, stopAutoPlay]);

  /** Run to end */
  const handleRunToEnd = useCallback(() => {
    stopAutoPlay();
    if (!simulatorRef.current) return;
    simulatorRef.current.runToEnd();
    applyHighlights(simulatorRef.current);
    rerender();
  }, [applyHighlights, rerender, stopAutoPlay]);

  /** Clear simulation */
  const handleClear = useCallback(() => {
    stopAutoPlay();
    setSimulator(null);
    simulatorRef.current = null;
    controller.state.highlightedNodes.clear();
    controller.state.highlightedEdges.clear();
    controller.state.simulationActive = false;
    controller.views.update();
    rerender();
  }, [controller, rerender, stopAutoPlay]);

  const toggleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      stopAutoPlay();
      return;
    }
    if (!simulatorRef.current?.canStepForward) return;

    setIsAutoPlaying(true);
    autoPlayRef.current = setInterval(() => {
      const sim = simulatorRef.current;
      if (!sim?.canStepForward) {
        stopAutoPlay();
        return;
      }
      sim.step();
      applyHighlights(sim);
      rerender();
    }, speed);
  }, [isAutoPlaying, speed, applyHighlights, rerender, stopAutoPlay]);

  // Clean up auto-play on unmount
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, []);

  // Update auto-play interval when speed changes
  useEffect(() => {
    if (isAutoPlaying && autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = setInterval(() => {
        const sim = simulatorRef.current;
        if (!sim?.canStepForward) {
          stopAutoPlay();
          return;
        }
        sim.step();
        applyHighlights(sim);
        rerender();
      }, speed);
    }
  }, [speed, isAutoPlaying, applyHighlights, rerender, stopAutoPlay]);

  /** Jump to a specific step in history */
  const handleJumpToStep = useCallback(
    (stepNum: number) => {
      if (!simulatorRef.current) return;
      simulatorRef.current.jumpToStep(stepNum);
      applyHighlights(simulatorRef.current);
      rerender();
    },
    [applyHighlights, rerender],
  );

  const step = simulator?.currentStep ?? null;
  const status = simulator?.status ?? SimulationStatus.IDLE;
  const graphType = controller.graph.shortName;

  return (
    <FloatingPanel
      title="Step Simulation"
      defaultPosition={{ x: 16, y: 68 }}
      defaultExpanded={false}
      width={340}
      minWidth={280}
      maxWidth={500}
      onExpandedChange={setIsExpanded}
      headerExtra={simulator && !isExpanded ? <StatusBadge status={status} /> : undefined}
    >
      {/* ─── Input ─── */}
      <PanelSection label="Input String">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <PanelInput
              value={inputValue}
              onChange={setInputValue}
              placeholder="e.g. abc"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  startSimulation();
                }
              }}
            />
          </div>
          {!simulator ? (
            <PanelButton onClick={startSimulation} variant="primary" size="md">
              Run
            </PanelButton>
          ) : (
            <PanelButton onClick={handleClear} variant="primary" size="md">
              Reset
            </PanelButton>
          )}
        </div>
      </PanelSection>

      {/* ─── Transport Controls ─── */}
      {simulator && (
        <>
          <PanelDivider />
          <PanelSection label="Controls">
            <PanelRow align="center">
              <PanelButton onClick={handleReset} title="Reset" disabled={!simulator.canStepBack}>
                <ResetIcon />
              </PanelButton>
              <PanelButton onClick={handleStepBack} title="Step Back" disabled={!simulator.canStepBack}>
                <StepBackIcon />
              </PanelButton>
              <PanelButton
                onClick={toggleAutoPlay}
                title={isAutoPlaying ? "Pause" : "Auto-play"}
                variant={isAutoPlaying ? "primary" : "default"}
                disabled={!simulator.canStepForward && !isAutoPlaying}
              >
                {isAutoPlaying ? <PauseIcon /> : <PlayIcon />}
              </PanelButton>
              <PanelButton onClick={handleStep} title="Step Forward" disabled={!simulator.canStepForward}>
                <StepForwardIcon />
              </PanelButton>
              <PanelButton onClick={handleRunToEnd} title="Run to End" disabled={!simulator.canStepForward}>
                <FastForwardIcon />
              </PanelButton>
            </PanelRow>

            {/* Speed slider */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] text-zinc-600 dark:text-zinc-300">Fast</span>
              <input
                type="range"
                min={50}
                max={1500}
                step={50}
                value={1550 - speed}
                onChange={(e) => setSpeed(1550 - Number(e.target.value))}
                className="h-1 min-w-0 flex-1 cursor-pointer accent-zinc-600 dark:accent-zinc-300"
              />
              <span className="text-[10px] text-zinc-600 dark:text-zinc-300">Slow</span>
            </div>
          </PanelSection>

          {/* ─── Sub-Automata Info (RSM) ───
               Shows call state context, step-into/step-out controls, and
               the RSM call stack breadcrumb. This is the primary UX for
               understanding hierarchical automaton execution. */}
          {(() => {
            const currentConfigs = step?.configurations ?? [];
            const callStateConfigs = currentConfigs.filter((c) => c.node.isCallState);
            const hasCallStatesInGraph = controller.graph.hasCallStates();
            const canStepInto = simulator.canStepInto;
            const isInsideCall = simulator.isInsideCall;
            const callStack = simulator.callStack;

            if (!hasCallStatesInGraph && !isInsideCall && callStack.length === 0) return null;

            return (
              <>
                <PanelDivider />
                <PanelSection label="Sub-Automata (RSM)">
                  {/* ─── Call Stack Breadcrumb ───
                       Shows the current position in the RSM call hierarchy.
                       Each frame is a suspended caller waiting for its callee.
                       This mirrors a debugger's call stack display. */}
                  {callStack.length > 0 && (
                    <div className="mb-2 rounded-md border border-violet-200 bg-violet-50/30 px-2 py-1.5 dark:border-violet-700/40 dark:bg-violet-900/10">
                      <div className="mb-1 text-[9px] font-bold tracking-wider text-violet-500 uppercase dark:text-violet-400">
                        Call Stack
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-[10px]">
                        {callStack.map((frame, i) => {
                          const name = frame.callerName || "caller";
                          return (
                            <span key={i} className="inline-flex items-center gap-0.5">
                              {i > 0 && <span className="text-violet-400 dark:text-violet-500">→</span>}
                              <span className="rounded bg-violet-100 px-1 py-0.5 font-medium text-violet-700 dark:bg-violet-800/30 dark:text-violet-300">
                                {name}
                              </span>
                              <span className="text-violet-400 dark:text-violet-500">@</span>
                              <span className="font-semibold text-violet-600 dark:text-violet-300">{frame.callNode.label}</span>
                            </span>
                          );
                        })}
                        <span className="text-violet-400 dark:text-violet-500">→</span>
                        <span className="rounded bg-violet-200 px-1 py-0.5 font-bold text-violet-800 dark:bg-violet-700/40 dark:text-violet-200">
                          {simulator.automatonName || graphType}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ─── Paused on Call State Banner ───
                       When the simulation reaches a call state, it pauses to let
                       the user choose how to proceed. This banner explains the choice. */}
                  {canStepInto && simulator.isPausedOnCallStates && (
                    <div className="mb-2 rounded-md border border-amber-200 bg-amber-50/50 px-2.5 py-2 dark:border-amber-700/40 dark:bg-amber-900/10">
                      <div className="mb-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">⏸ Paused at call state</div>
                      <div className="mb-2 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
                        The simulation reached a call state (□ box). Choose how to proceed:
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (!simulatorRef.current) return;
                            const child = simulatorRef.current.stepInto();
                            if (child) {
                              applyHighlights(child);
                              rerender();
                            }
                          }}
                          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-800/30"
                          title="Enter the sub-automaton and watch it execute step-by-step"
                        >
                          <StepIntoIcon />
                          Step Into
                        </button>
                        <button
                          onClick={handleStep}
                          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          title="Run the sub-automaton instantly and continue (step over)"
                        >
                          <StepForwardIcon />
                          Step Over
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─── Step Into (not paused — frontier has call states but hasn't paused yet) ─── */}
                  {canStepInto && !simulator.isPausedOnCallStates && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (!simulatorRef.current) return;
                          const child = simulatorRef.current.stepInto();
                          if (child) {
                            applyHighlights(child);
                            rerender();
                          }
                        }}
                        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-800/30"
                        title="Step into the sub-automaton to watch it execute step-by-step"
                      >
                        <StepIntoIcon />
                        Step Into
                      </button>
                    </div>
                  )}

                  {/* ─── Step Out (inside a sub-automaton call) ─── */}
                  {isInsideCall && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (!simulatorRef.current) return;
                          const parent = simulatorRef.current.returnToCaller();
                          if (parent) {
                            applyHighlights(parent);
                            rerender();
                          }
                        }}
                        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        title="Return to the caller automaton"
                      >
                        <StepOutIcon />
                        Step Out
                      </button>
                    </div>
                  )}

                  {/* ─── Call State Configurations ─── */}
                  {callStateConfigs.length > 0 ? (
                    <div className="space-y-1.5">
                      {(() => {
                        const grouped = new Map<string, { node: Node; targetName: string; inputs: string[] }>();
                        for (const config of callStateConfigs) {
                          const nodeLabel = config.node.label;
                          const targetId = config.node.callConfig?.targetAutomatonId;
                          const targetName = targetId && getAutomatonName ? (getAutomatonName(targetId) ?? targetId) : "unknown";
                          const faConfig = config as { remainingInput?: string };
                          const input = faConfig.remainingInput ?? "";
                          if (!grouped.has(nodeLabel)) {
                            grouped.set(nodeLabel, { node: config.node, targetName, inputs: [] });
                          }
                          grouped.get(nodeLabel)?.inputs.push(input);
                        }
                        return Array.from(grouped.values()).map((group, i) => (
                          <div
                            key={i}
                            className="rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5 text-[11px] dark:border-violet-700/50 dark:bg-violet-900/10"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-violet-700 dark:text-violet-300">{group.node.label}</span>
                              <span className="text-violet-500">→</span>
                              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-800/30 dark:text-violet-300">
                                ⟨{group.targetName}⟩
                              </span>
                              {group.inputs.length > 1 && (
                                <span className="ml-auto text-[9px] text-violet-400">{group.inputs.length} branches</span>
                              )}
                            </div>
                            {group.inputs.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {group.inputs.map((inp, j) => (
                                  <span
                                    key={j}
                                    className="rounded bg-violet-100/50 px-1 py-0.5 font-mono text-[9px] text-violet-600 dark:bg-violet-800/20 dark:text-violet-400"
                                  >
                                    {inp.length > 0 ? `"${inp.length > 12 ? inp.slice(0, 12) + "…" : inp}"` : "ε"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  ) : !isInsideCall && callStack.length === 0 ? (
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      This automaton has call states (□ boxes). When the simulation reaches one, the sub-automaton executes automatically.
                      Use <strong>Step Into</strong> to watch the sub-automaton step-by-step, or let it run as a single macro step.
                    </div>
                  ) : null}
                </PanelSection>
              </>
            );
          })()}

          {/* ─── Instantaneous Descriptions (FA only — TM/PDA use tape/stack visualizations) ─── */}
          {graphType === "FA" &&
            (() => {
              const displayStep =
                step?.configurations.length === 0 && step.stepNumber > 0 ? (simulator.history[step.stepNumber - 1] ?? step) : step;
              const configs = displayStep?.configurations ?? [];
              const isStale = displayStep !== step;
              if (configs.length === 0) return null;
              return (
                <>
                  <PanelDivider />
                  <PanelSection
                    label={`Instantaneous Description${configs.length > 1 ? "s" : ""} (${configs.length})${isStale ? " — at failure" : ""}`}
                  >
                    <div className="max-h-[150px] space-y-1 overflow-y-auto">
                      {configs.map((config, i) => (
                        <ConfigurationRow key={i} config={config} graphType={graphType} getAutomatonName={getAutomatonName} />
                      ))}
                    </div>
                  </PanelSection>
                </>
              );
            })()}

          {/* ─── TM Tape Visualization ─── */}
          {graphType === "TM" &&
            (() => {
              const displayStep =
                step?.configurations.length === 0 && step.stepNumber > 0 ? (simulator.history[step.stepNumber - 1] ?? step) : step;
              if (!displayStep || displayStep.configurations.length === 0) return null;
              return (
                <>
                  <PanelDivider />
                  <PanelSection label="Tape">
                    {displayStep.configurations.map((config, i) => {
                      const tmConfig = config as { tape?: readonly (string | null)[]; headPosition?: number };
                      if (!tmConfig.tape) return null;
                      return <TapeVisualization key={i} tape={tmConfig.tape} headPosition={tmConfig.headPosition ?? 0} />;
                    })}
                  </PanelSection>
                </>
              );
            })()}

          {/* ─── PDA: Instantaneous Descriptions (q, w, γ) ─── */}
          {graphType === "PDA" &&
            (() => {
              const displayStep =
                step?.configurations.length === 0 && step.stepNumber > 0 ? (simulator.history[step.stepNumber - 1] ?? step) : step;
              if (!displayStep || displayStep.configurations.length === 0) return null;
              const isStale = displayStep !== step;
              const count = displayStep.configurations.length;
              return (
                <>
                  <PanelDivider />
                  <PanelSection label={`Instantaneous Description${count > 1 ? "s" : ""} (${count})${isStale ? " — at failure" : ""}`}>
                    <div className="max-h-[200px] space-y-2 overflow-y-auto">
                      {displayStep.configurations.map((config, i) => {
                        const pdaConfig = config as { stack?: string; remainingInput?: string };
                        return (
                          <div key={i} className="space-y-1 rounded-md bg-zinc-100 p-2 dark:bg-zinc-800">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="font-semibold text-zinc-600 dark:text-zinc-300">{config.node.label}</span>
                              {pdaConfig.remainingInput !== undefined && (
                                <span className="font-mono text-zinc-600 dark:text-zinc-300">
                                  input: {pdaConfig.remainingInput.length > 0 ? `"${pdaConfig.remainingInput}"` : "ε"}
                                </span>
                              )}
                              {config.isFinal && <span className="ml-auto text-emerald-600 dark:text-emerald-400">✓</span>}
                            </div>
                            {pdaConfig.stack && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">stack:</span>
                                <StackVisualization stack={pdaConfig.stack} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </PanelSection>
                </>
              );
            })()}

          {/* ─── Step History Timeline ─── */}
          {simulator.totalSteps > 1 && (
            <>
              <PanelDivider />
              <PanelSection label="History">
                <div className="flex flex-wrap gap-1">
                  {simulator.history.map((histStep) => (
                    <button
                      key={histStep.stepNumber}
                      onClick={() => handleJumpToStep(histStep.stepNumber)}
                      className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[10px] font-medium transition-colors ${
                        histStep.stepNumber === simulator.stepNumber
                          ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                          : histStep.status === SimulationStatus.ACCEPTED
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-800/30 dark:text-emerald-300"
                            : histStep.status === SimulationStatus.REJECTED
                              ? "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-300"
                              : histStep.status === SimulationStatus.ERROR
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-600"
                      }`}
                      title={`Step ${histStep.stepNumber}`}
                    >
                      {histStep.stepNumber}
                    </button>
                  ))}
                </div>
              </PanelSection>
            </>
          )}

          {/* ─── Status ─── */}
          <PanelDivider />
          <PanelRow align="between">
            <StatusBadge status={status} />
            <span className="px-1 text-[11px] text-zinc-600 dark:text-zinc-300">
              Step {simulator.stepNumber} / {simulator.totalSteps - 1}
            </span>
          </PanelRow>

          {/* ─── Error Message ─── */}
          {status === SimulationStatus.ERROR && simulator.errorMessage && (
            <div className="rounded-md bg-red-50 px-1 text-[11px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {simulator.errorMessage}
            </div>
          )}
        </>
      )}
    </FloatingPanel>
  );
};

/* ─── Sub-components ─── */

const StatusBadge: FunctionComponent<{ status: SimulationStatus }> = ({ status }) => {
  const variant =
    status === SimulationStatus.ACCEPTED
      ? "success"
      : status === SimulationStatus.REJECTED
        ? "error"
        : status === SimulationStatus.ERROR
          ? "error"
          : status === SimulationStatus.RUNNING
            ? "info"
            : "neutral";

  const label =
    status === SimulationStatus.ACCEPTED
      ? "Accepted"
      : status === SimulationStatus.REJECTED
        ? "Rejected"
        : status === SimulationStatus.ERROR
          ? "Error"
          : status === SimulationStatus.RUNNING
            ? "Running"
            : "Idle";

  const dotColor =
    status === SimulationStatus.ACCEPTED
      ? "#16a34a"
      : status === SimulationStatus.REJECTED
        ? "#dc2626"
        : status === SimulationStatus.ERROR
          ? "#ea580c"
          : status === SimulationStatus.RUNNING
            ? "#2563eb"
            : "#9ca3af";

  return (
    <PanelBadge variant={variant}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      {label}
    </PanelBadge>
  );
};

const ConfigurationRow: FunctionComponent<{
  config: SimulationConfiguration;
  graphType: string;
  getAutomatonName?: (id: string) => string | undefined;
}> = ({ config, graphType, getAutomatonName: getName }) => {
  const faConfig = config as { remainingInput?: string };
  const pdaConfig = config as { stack?: string; remainingInput?: string };
  const isCallState = config.node.isCallState;
  const trace = config.callTrace;
  const hasTrace = trace && trace.length > 0;
  // Check if trace has any non-ε consumption
  const hasNonEpsilonTrace = hasTrace && trace.some((e) => e.inputBefore.length !== e.inputAfter.length);

  // When there's a meaningful call trace, show the full computation path inline
  if (hasNonEpsilonTrace) {
    return (
      <div
        className={`rounded-md px-2 py-1.5 text-[11px] ${
          config.isFinal
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        {/* Full computation path: q1⟨name: "consumed"⟩ → q2⟨name: "consumed"⟩ → q3 */}
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {trace.map((entry, i) => {
            const name = getName ? (getName(entry.targetAutomatonId) ?? entry.targetAutomatonId) : entry.targetAutomatonId;
            const consumed = entry.inputBefore.slice(0, entry.inputBefore.length - entry.inputAfter.length);
            const consumedStr = consumed.length > 0 ? (consumed.length > 6 ? consumed.slice(0, 5) + "…" : consumed) : "ε";
            return (
              <span key={i} className="inline-flex items-center gap-px">
                {i > 0 && <span className="mx-0.5 text-zinc-400 dark:text-zinc-500">→</span>}
                <span className="font-semibold text-violet-600 dark:text-violet-400">{entry.callNodeLabel}</span>
                <span className="text-violet-400 dark:text-violet-500">⟨</span>
                <span className="text-violet-600 dark:text-violet-300">{name}</span>
                <span className="text-violet-400 dark:text-violet-500">:</span>
                <span className="font-mono text-violet-700 dark:text-violet-300">{consumed.length > 0 ? `"${consumedStr}"` : "ε"}</span>
                <span className="text-violet-400 dark:text-violet-500">⟩</span>
              </span>
            );
          })}
          <span className="mx-0.5 text-zinc-400 dark:text-zinc-500">→</span>
          <span className="font-semibold">{config.node.label}</span>
          {/* Remaining input after the full path */}
          {graphType === "FA" && faConfig.remainingInput !== undefined && (
            <span className="ml-1 font-mono">{faConfig.remainingInput.length > 0 ? `"${faConfig.remainingInput}"` : "ε"}</span>
          )}
          {graphType === "PDA" && pdaConfig.remainingInput !== undefined && (
            <span className="ml-1 font-mono">{pdaConfig.remainingInput.length > 0 ? `"${pdaConfig.remainingInput}"` : "ε"}</span>
          )}
          {config.isFinal && <span className="ml-auto text-emerald-600 dark:text-emerald-400">✓</span>}
        </div>
        {/* PDA stack shown below the path */}
        {graphType === "PDA" && pdaConfig.stack && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">stack:</span>
            <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300">[{pdaConfig.stack}]</span>
          </div>
        )}
      </div>
    );
  }

  // Standard display (no call trace or all-ε trace)
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] ${
        config.isFinal
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
          : isCallState
            ? "bg-violet-50 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      <span className="font-semibold">{config.node.label}</span>
      {isCallState && (
        <span className="inline-flex items-center rounded bg-violet-100 px-1 py-0.5 text-[9px] font-bold text-violet-600 dark:bg-violet-800/30 dark:text-violet-300">
          ⟨call⟩
        </span>
      )}
      {graphType === "FA" && faConfig.remainingInput !== undefined && (
        <span className="font-mono">{faConfig.remainingInput.length > 0 ? `"${faConfig.remainingInput}"` : "ε"}</span>
      )}
      {graphType === "PDA" && pdaConfig.remainingInput !== undefined && (
        <>
          <span className="font-mono">{pdaConfig.remainingInput.length > 0 ? `"${pdaConfig.remainingInput}"` : "ε"}</span>
          {pdaConfig.stack && <span className="ml-auto font-mono text-[10px] text-zinc-600 dark:text-zinc-300">[{pdaConfig.stack}]</span>}
        </>
      )}
      {config.isFinal && <span className="ml-auto text-emerald-600 dark:text-emerald-400">✓</span>}
    </div>
  );
};

const TapeVisualization: FunctionComponent<{ tape: readonly (string | null)[]; headPosition: number }> = ({ tape, headPosition }) => (
  <div className="flex items-center gap-px overflow-x-auto py-1">
    {tape.map((cell, i) => (
      <div
        key={i}
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center border font-mono text-xs font-bold ${
          i === headPosition
            ? "border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
            : "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        {cell ?? BLANK}
      </div>
    ))}
  </div>
);

const StackVisualization: FunctionComponent<{ stack: string }> = ({ stack }) => (
  <div className="flex items-center gap-px">
    {stack.split("").map((ch, i) => (
      <div
        key={i}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border font-mono text-[10px] font-bold ${
          i === 0
            ? "border-violet-600 bg-violet-50 text-violet-800 dark:border-violet-400 dark:bg-violet-900/30 dark:text-violet-300"
            : "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        {ch}
      </div>
    ))}
  </div>
);
