import type { Edge } from "../model/edge";
import type { IGraph } from "../model/graphs/abstract-graph";
import { invokeSubAutomatonWithResolver } from "../model/machines/execution-engine";
import { MachineTypeRegistry } from "../model/machines/registry";
import type { IMachineState, IMachineType, SubAutomatonResolver, SimulationConfiguration, CallTraceEntry } from "../model/machines/types";
import { MachineError } from "../model/machines/types";
import type { Node } from "../model/node";

/* ─── Types ─── */

export enum SimulationStatus {
  /** No simulation running */
  IDLE = "idle",
  /** Simulation in progress, more steps possible */
  RUNNING = "running",
  /** Input accepted — reached a final state */
  ACCEPTED = "accepted",
  /** Input rejected — no more configurations to explore */
  REJECTED = "rejected",
  /** Simulation hit an error (e.g., max steps exceeded) */
  ERROR = "error",
  /**
   * Currently inside a sub-automaton call ("step into" mode).
   * The parent simulation is suspended on the call stack, and the
   * step controls are operating on the child sub-automaton.
   * This status is only visible on the parent — the child has its
   * own status (RUNNING, ACCEPTED, etc.).
   */
  INSIDE_CALL = "inside_call",
}

/**
 * Represents a single frame on the RSM call stack during "step into" mode.
 *
 * When the user chooses to "step into" a call state, the current simulation
 * state is pushed onto this stack, and a new child StepSimulator is created
 * for the sub-automaton. When the child finishes, the stack is popped and
 * the parent resumes.
 *
 * This directly mirrors the RSM call stack from the theoretical formalism
 * (Alur & Yannakakis, 2001) — each frame represents a suspended component
 * machine waiting for its callee to return.
 */
export interface CallStackFrame {
  /** The graph of the caller (for canvas switching) */
  readonly callerGraph: IGraph;
  /** The automaton ID of the caller */
  readonly callerAutomatonId: string | null;
  /** The call state node that initiated this call */
  readonly callNode: Node;
  /** Human-readable name of the caller automaton */
  readonly callerName: string;
  /** The remaining input at the point of the call */
  readonly inputAtCall: string;
}

/**
 * A single step in the simulation history.
 * Contains all active configurations at that point in time,
 * plus the edges that were traversed to reach them.
 */
export interface SimulationStep {
  /** The step number (0 = initial state) */
  readonly stepNumber: number;
  /** All active configurations at this step */
  readonly configurations: SimulationConfiguration[];
  /** The set of nodes that are active at this step */
  readonly activeNodes: ReadonlySet<Node>;
  /** The edges that were traversed to reach this step (empty for step 0) */
  readonly traversedEdges: ReadonlySet<Edge>;
  /** The status after this step */
  readonly status: SimulationStatus;
}

/* ─── Step Simulator ─── */

/**
 * A step-by-step simulation engine for all automaton types (FA, TM, PDA,
 * and any future types registered in the {@link MachineTypeRegistry}).
 *
 * This is the generic replacement for the previous type-tripled implementation.
 * The simulator is parameterized by an {@link IMachineType} strategy, which
 * encapsulates all type-specific behavior (state creation, successor computation,
 * acceptance conditions, display formatting). The BFS stepping logic is
 * implemented once, generically.
 *
 * **Design pattern**: Strategy (Gamma et al., 1994) — the machine type strategy
 * provides type-specific behavior, while this class provides the generic
 * step-by-step BFS exploration with history, call stack, and UI integration.
 *
 * **RSM support**: Full support for Recursive State Machines (Alur & Yannakakis,
 * 2001), including:
 * - **Step over**: Call states are processed as macro steps using
 *   {@link ExecutionEngine.collectAcceptingConfigurations}
 * - **Step into**: The user can enter a sub-automaton step-by-step via
 *   a child StepSimulator
 * - **Call trace**: Each configuration tracks which sub-automata were
 *   invoked along its computation path
 *
 * Usage:
 * ```ts
 * const sim = new StepSimulator(graph, "abc");
 * while (sim.status === SimulationStatus.RUNNING) {
 *   sim.step();
 *   console.log(sim.currentStep);
 * }
 * ```
 *
 * @see IMachineType for the strategy interface
 * @see ExecutionEngine for the batch (non-step) execution engine
 * @see MachineTypeRegistry for runtime type lookup
 */
export class StepSimulator {
  private readonly graph: IGraph;
  private readonly input: string;

  /** The machine type strategy, looked up from the registry at construction time. */
  private readonly machineType: IMachineType<IMachineState>;

  /**
   * Optional resolver for sub-automaton calls (RSM extension).
   *
   * When set, the step simulator can handle call states (box nodes) by
   * invoking the referenced automaton. Call states are treated as "macro steps":
   * the sub-automaton runs to completion in a single step, and the results
   * are used to create new configurations for the caller.
   *
   * This is the "step over" approach — the sub-automaton execution is not
   * shown step-by-step, but its result (accept/reject + remaining input)
   * is reflected in the caller's configurations.
   */
  public resolver: SubAutomatonResolver | null = null;

  /** Full history of all steps taken */
  private _history: SimulationStep[] = [];

  /** Current step index into _history */
  private _currentStepIndex = -1;

  // ─── Generic Frontier ──────────────────────────────────────────────

  /** The current frontier of machine states (all active configurations). */
  private frontier: IMachineState[] = [];

  /**
   * Visited state tracking. Maps configuration string → visit count.
   * For FA/PDA (maxVisitCount=1), this acts as a simple Set.
   * For TM (maxVisitCount=100), this allows revisiting states.
   */
  private visited = new Map<string, number>();

  /** Global step counter (used for TM's maxConfigurations limit). */
  private stepCount = 0;

  /** Call trace per frontier state (maps state → accumulated trace entries). */
  private callTraces = new Map<IMachineState, CallTraceEntry[]>();

  /** Error message if status is ERROR */
  private _errorMessage = "";

  // ─── Call State Pause Mechanism ────────────────────────────────────

  /**
   * Whether the current frontier is paused on call states.
   *
   * When true, the frontier contains call states that haven't been processed
   * yet. The user can choose:
   * - "Step Forward" → step over (process call states as macro steps)
   * - "Step Into" → enter the sub-automaton step-by-step
   *
   * This is the key UX mechanism: the simulation pauses at call states
   * to give the user a choice, rather than silently stepping over them.
   */
  private _pausedOnCallStates = false;

  // ─── Step-Into Call Stack (RSM "step into" mode) ───────────────────

  /**
   * The RSM call stack for "step into" mode.
   *
   * When the user steps into a call state, the current simulation context
   * is pushed onto this stack, and a child StepSimulator is created for
   * the sub-automaton. The UI reads this to display the call stack breadcrumb
   * and to know which graph to show on the canvas.
   */
  private _callStack: CallStackFrame[] = [];

  /**
   * The child StepSimulator when in "step into" mode.
   * null when not inside a sub-automaton call.
   */
  private _childSimulator: StepSimulator | null = null;

  /**
   * The automaton ID that this simulator's graph belongs to.
   * Used for call stack breadcrumb display. Set by the UI layer.
   */
  public automatonId: string | null = null;

  /**
   * Human-readable name of the automaton this simulator is running.
   * Used for call stack breadcrumb display. Set by the UI layer.
   */
  public automatonName = "";

  /**
   * Whether the current step has any configurations on call states
   * that can be "stepped into" (i.e., the user can choose to enter
   * the sub-automaton instead of stepping over it).
   *
   * This is true when:
   * 1. The simulation is RUNNING
   * 2. At least one configuration in the current frontier is on a call state
   * 3. A resolver is available to look up the target automaton
   */
  get canStepInto(): boolean {
    if (this._childSimulator) return false; // Already inside a call
    if (this.status !== SimulationStatus.RUNNING) return false;
    if (!this.resolver) return false;
    return this.frontier.some((s) => s.node.callConfig != null);
  }

  /**
   * Whether we are currently inside a sub-automaton call ("step into" mode).
   */
  get isInsideCall(): boolean {
    return this._childSimulator !== null;
  }

  /**
   * The current call stack (for breadcrumb display).
   * Each frame represents a suspended caller waiting for its callee.
   */
  get callStack(): readonly CallStackFrame[] {
    return this._callStack;
  }

  /**
   * The active (deepest) simulator — either this one or a nested child.
   * The UI should use this to get the current step, status, etc.
   */
  get activeSimulator(): StepSimulator {
    if (this._childSimulator) {
      return this._childSimulator.activeSimulator;
    }
    return this;
  }

  /**
   * The graph that the active (deepest) simulator is running on.
   * The UI uses this to know which automaton to display on the canvas.
   */
  get activeGraph(): IGraph {
    return this.activeSimulator.graph;
  }

  /**
   * Steps into the first call state found in the current frontier.
   *
   * This creates a child StepSimulator for the sub-automaton and pushes
   * the current context onto the call stack. The UI should then switch
   * the canvas to display the sub-automaton's graph and use the child
   * simulator's step/stepBack/etc. methods.
   *
   * Returns the child simulator's initial step, or null if step-into
   * is not possible.
   */
  stepInto(): StepSimulator | null {
    if (!this.canStepInto || !this.resolver) return null;

    // Find the first call state in the current frontier
    const callState = this.frontier.find((s) => s.node.callConfig != null);
    if (!callState?.node.callConfig) return null;

    const inputForCall = this.machineType.getRemainingInput(callState);
    const targetGraph = this.resolver(callState.node.callConfig.targetAutomatonId);
    if (!targetGraph) return null;

    // Push current context onto call stack
    this._callStack.push({
      callerGraph: this.graph,
      callerAutomatonId: this.automatonId,
      callNode: callState.node,
      callerName: this.automatonName || this.machineType.shortName,
      inputAtCall: inputForCall,
    });

    // Create child simulator for the sub-automaton
    this._childSimulator = new StepSimulator(targetGraph, inputForCall);
    this._childSimulator.resolver = this.resolver;
    this._childSimulator._callStack = this._callStack; // Share the call stack
    this._childSimulator.automatonId = callState.node.callConfig.targetAutomatonId;

    return this._childSimulator;
  }

  /**
   * Returns from the current sub-automaton call back to the caller.
   *
   * This pops the call stack and resumes the parent simulation.
   * The sub-automaton's result (accepted/rejected) is used to determine
   * how the parent continues — same as the "step over" behavior, but
   * the user got to watch the sub-automaton execute step-by-step.
   *
   * Returns the parent simulator (this), or null if not inside a call.
   */
  returnToCaller(): this | null {
    if (!this._childSimulator) return null;

    // Pop the call stack
    this._callStack.pop();

    // The child's result determines what happens next in the parent.
    // We perform a normal "step over" using the child's final status.
    this._childSimulator = null;

    // Now do a normal step (which will step-over the call state)
    this.step();

    return this;
  }

  constructor(graph: IGraph, input: string) {
    this.graph = graph;
    this.input = input;
    this.machineType = MachineTypeRegistry.getOrThrow(graph.shortName);
    this.initialize();
  }

  /* ─── Public API ─── */

  /** The current simulation status */
  get status(): SimulationStatus {
    if (this._currentStepIndex < 0) return SimulationStatus.IDLE;
    return this._history[this._currentStepIndex].status;
  }

  /** The current step data */
  get currentStep(): SimulationStep | null {
    if (this._currentStepIndex < 0) return null;
    return this._history[this._currentStepIndex];
  }

  /** The current step number */
  get stepNumber(): number {
    return this._currentStepIndex;
  }

  /** Total number of steps taken so far */
  get totalSteps(): number {
    return this._history.length;
  }

  /** The full simulation history */
  get history(): readonly SimulationStep[] {
    return this._history;
  }

  /** Error message (only meaningful when status === ERROR) */
  get errorMessage(): string {
    return this._errorMessage;
  }

  /** The original input string */
  get inputString(): string {
    return this.input;
  }

  /**
   * Whether the simulation is currently paused on call states.
   * The UI uses this to show explanatory text.
   */
  get isPausedOnCallStates(): boolean {
    return this._pausedOnCallStates;
  }

  /**
   * Advance the simulation by one step (one BFS level).
   * Returns the new step, or null if the simulation is already finished.
   *
   * **Call state handling**: When the frontier reaches call states, the
   * simulation pauses there (showing the call states as active). The user
   * can then choose "Step Forward" (step over) or "Step Into". On the
   * next call to step(), the call states are processed as macro steps.
   */
  step(): SimulationStep | null {
    // If we've stepped back and are re-stepping forward, just advance the index
    if (this._currentStepIndex < this._history.length - 1) {
      this._currentStepIndex++;
      return this._history[this._currentStepIndex];
    }

    const currentStatus = this.status;
    if (currentStatus !== SimulationStatus.RUNNING) return null;

    try {
      return this.stepGeneric();
    } catch (err: unknown) {
      const msg = err instanceof MachineError ? err.message : err instanceof Error ? err.message : "Unknown error";
      this._errorMessage = msg;
      const errorStep = this.createStep([], new Set(), new Set(), SimulationStatus.ERROR);
      return errorStep;
    }
  }

  /**
   * Step back one step in the history.
   * Returns the previous step, or null if already at the beginning.
   */
  stepBack(): SimulationStep | null {
    if (this._currentStepIndex <= 0) return null;
    this._currentStepIndex--;
    return this._history[this._currentStepIndex];
  }

  /**
   * Jump to a specific step in the history.
   */
  jumpToStep(stepNumber: number): SimulationStep | null {
    if (stepNumber < 0 || stepNumber >= this._history.length) return null;
    this._currentStepIndex = stepNumber;
    return this._history[this._currentStepIndex];
  }

  /**
   * Reset the simulation to the initial state (step 0).
   */
  reset(): void {
    this._history = [];
    this._currentStepIndex = -1;
    this._errorMessage = "";
    this.initialize();
  }

  /**
   * Run the simulation to completion (or until max steps).
   * Returns the final step.
   */
  runToEnd(maxSteps = 500): SimulationStep | null {
    let steps = 0;
    while (this.status === SimulationStatus.RUNNING && steps < maxSteps) {
      this.step();
      steps++;
    }
    return this.currentStep;
  }

  /**
   * Check if we can step forward (either more history or more computation).
   */
  get canStepForward(): boolean {
    if (this._currentStepIndex < this._history.length - 1) return true;
    return this.status === SimulationStatus.RUNNING;
  }

  /**
   * Check if we can step backward.
   */
  get canStepBack(): boolean {
    return this._currentStepIndex > 0;
  }

  /* ─── Initialization ─── */

  private initialize(): void {
    if (!this.graph.isValid()) {
      this._errorMessage = "Invalid graph: Ensure an initial state and at least one final state exists";
      this.createStep([], new Set(), new Set(), SimulationStatus.ERROR);
      return;
    }

    const initialNode = this.graph.getInitialNode();
    if (!initialNode) {
      this._errorMessage = "No initial state found";
      this.createStep([], new Set(), new Set(), SimulationStatus.ERROR);
      return;
    }

    const initialState = this.machineType.createInitialState(this.input, initialNode);
    this.frontier = [initialState];
    this.visited = new Map([[initialState.toString(), 1]]);
    this.stepCount = 0;
    this.callTraces = new Map();

    const config = this.machineType.createSimulationConfig(initialState);
    const status = initialState.isFinal() ? SimulationStatus.ACCEPTED : SimulationStatus.RUNNING;
    this.createStep([config], new Set([initialNode]), new Set(), status);
  }

  /* ─── Generic Stepping ─── */

  /**
   * Performs one BFS step across all configurations in the frontier.
   *
   * This is the unified stepping logic that replaces the previous
   * `stepFA()`, `stepTM()`, and `stepPDA()` methods. All type-specific
   * behavior is delegated to the {@link IMachineType} strategy.
   *
   * **Call state handling**: When the frontier contains call states and
   * a resolver is available, the simulation pauses to let the user choose
   * between "step over" and "step into". On the next call, call states
   * are processed as macro steps using {@link ExecutionEngine}.
   */
  private stepGeneric(): SimulationStep | null {
    const { stepConfig } = this.machineType;

    this.stepCount++;
    if (isFinite(stepConfig.maxConfigurations) && this.stepCount >= stepConfig.maxConfigurations) {
      throw new MachineError(`Reached max steps (${stepConfig.maxConfigurations})`);
    }

    // Also check total visited size for types with maxVisitCount=1 (FA/PDA)
    if (stepConfig.maxVisitCount === 1 && isFinite(stepConfig.maxConfigurations) && this.visited.size > stepConfig.maxConfigurations) {
      throw new MachineError(`Reached max configurations (${stepConfig.maxConfigurations})`);
    }

    const nextStates: IMachineState[] = [];
    const nextTraces = new Map<IMachineState, CallTraceEntry[]>();
    const traversedEdges = new Set<Edge>();
    let foundAccepting = false;

    // Track whether we were paused on call states from the previous step
    const wasOnCallStates = this._pausedOnCallStates;
    this._pausedOnCallStates = false;

    for (const state of this.frontier) {
      const parentTrace = this.callTraces.get(state) ?? [];

      // ─── Handle accepting states ───
      if (stepConfig.skipAcceptingSuccessors && state.isFinal()) {
        foundAccepting = true;
        if (stepConfig.retainAcceptingInFrontier) {
          nextStates.push(state);
          if (parentTrace.length > 0) nextTraces.set(state, parentTrace);
        }
        continue;
      }

      // ─── RSM Extension: Call state handling ───
      if (state.node.isCallState && this.resolver && state.node.callConfig) {
        if (!wasOnCallStates) {
          // We just ARRIVED at this call state. Keep it in the frontier
          // without processing — the simulation pauses here so the user
          // can choose step-into vs step-over.
          nextStates.push(state);
          if (parentTrace.length > 0) nextTraces.set(state, parentTrace);
          continue;
        }

        // We WERE paused on call states and the user chose step-over.
        // Now process the call state as a macro step using ExecutionEngine.
        const subResults = this.runSubAutomaton(state.node, this.machineType.getRemainingInput(state));

        for (const remainingInput of subResults) {
          const traceEntry: CallTraceEntry = {
            callNodeLabel: state.node.label,
            targetAutomatonId: state.node.callConfig.targetAutomatonId,
            inputBefore: this.machineType.getRemainingInput(state),
            inputAfter: remainingInput,
          };
          const trace = [...parentTrace, traceEntry];

          // Create a post-call state at the call node with advanced input,
          // then follow outgoing transitions
          const postCallState = this.machineType.createInitialState(remainingInput, state.node);
          const successors = this.machineType.getSuccessors(postCallState);

          for (const { state: next, edge } of successors) {
            if (this.tryAddToVisited(next)) {
              nextStates.push(next);
              nextTraces.set(next, trace);
              traversedEdges.add(edge);
              if (next.isFinal()) foundAccepting = true;
            }
          }

          // Check if the call state itself is final and input is consumed
          if (remainingInput.length === 0 && state.node.final) {
            foundAccepting = true;
          }
        }
        continue;
      }

      // ─── Normal (non-call-state) transitions ───
      if (wasOnCallStates) {
        // If we were paused on call states, non-call-state configs in the
        // frontier have already been processed. Keep them as-is.
        nextStates.push(state);
        if (parentTrace.length > 0) nextTraces.set(state, parentTrace);
        continue;
      }

      const successors = this.machineType.getSuccessors(state);
      for (const { state: next, edge } of successors) {
        if (this.tryAddToVisited(next)) {
          nextStates.push(next);
          if (parentTrace.length > 0) nextTraces.set(next, parentTrace);
          traversedEdges.add(edge);
          if (next.isFinal()) foundAccepting = true;
        } else if (stepConfig.maxVisitCount > 1) {
          // For TM: if we exceeded the max visit count, throw
          throw new MachineError(`Reached max state repeat (${stepConfig.maxVisitCount})`);
        }
      }
    }

    // Check if the new frontier contains any call states that need pausing
    const hasCallStatesInFrontier = this.resolver != null && nextStates.some((s) => s.node.isCallState && s.node.callConfig != null);
    if (hasCallStatesInFrontier) {
      this._pausedOnCallStates = true;
    }

    // Deduplicate frontier for TM (which can have duplicate states from retained accepting + new)
    const uniqueNextStates = stepConfig.retainAcceptingInFrontier ? this.deduplicateStates(nextStates) : nextStates;

    this.frontier = uniqueNextStates;
    this.callTraces = nextTraces;

    if (uniqueNextStates.length === 0 && !foundAccepting) {
      return this.createStep([], new Set(), traversedEdges, SimulationStatus.REJECTED);
    }

    const configs: SimulationConfiguration[] = uniqueNextStates.map((s) => {
      const trace = nextTraces.get(s);
      return this.machineType.createSimulationConfig(s, trace && trace.length > 0 ? trace : undefined);
    });

    const activeNodes = new Set(uniqueNextStates.map((s) => s.node));
    const status = foundAccepting ? SimulationStatus.ACCEPTED : SimulationStatus.RUNNING;

    return this.createStep(configs, activeNodes, traversedEdges, status);
  }

  /**
   * Attempts to add a state to the visited set, respecting the maxVisitCount.
   * Returns true if the state was added (or its count incremented), false if
   * the state has already been visited the maximum number of times.
   */
  private tryAddToVisited(state: IMachineState): boolean {
    const key = state.toString();
    const count = this.visited.get(key) ?? 0;
    if (count < this.machineType.stepConfig.maxVisitCount) {
      this.visited.set(key, count + 1);
      return true;
    }
    return false;
  }

  /**
   * Deduplicates states by their string representation.
   * Used for TM where accepting states are retained and may duplicate.
   */
  private deduplicateStates(states: IMachineState[]): IMachineState[] {
    const seen = new Set<string>();
    return states.filter((s) => {
      const key = s.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Runs a sub-automaton to completion for a call state (step-over mode).
   *
   * Uses the {@link ExecutionEngine} to perform the sub-automaton invocation,
   * which handles cross-type composition (FA→PDA, PDA→TM, etc.) and
   * nested call states automatically.
   *
   * For FA and PDA targets, returns all possible remaining input strings
   * after acceptance (preserving non-determinism).
   * For TM targets, uses oracle semantics (accept/reject, input unchanged).
   *
   * @param callNode - The call state node containing the sub-automaton reference
   * @param input - The remaining input to pass to the sub-automaton
   * @returns Array of remaining input strings (one per accepting configuration)
   */
  private runSubAutomaton(callNode: Node, input: string): string[] {
    return invokeSubAutomatonWithResolver(callNode, input, this.resolver).map((result) => result.remainingInput);
  }

  /* ─── Helpers ─── */

  private createStep(
    configurations: SimulationConfiguration[],
    activeNodes: Set<Node>,
    traversedEdges: Set<Edge>,
    status: SimulationStatus,
  ): SimulationStep {
    const step: SimulationStep = {
      stepNumber: this._history.length,
      configurations,
      activeNodes,
      traversedEdges,
      status,
    };
    this._history.push(step);
    this._currentStepIndex = this._history.length - 1;
    return step;
  }
}
