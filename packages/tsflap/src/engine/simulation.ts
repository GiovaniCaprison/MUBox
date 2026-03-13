/* eslint-disable @typescript-eslint/no-non-null-assertion -- We shift from a queue alot during BFS - it's not null per our validation but eslint isn't happy we don't wrap in an additional conditional meh */
import { Controller } from "./controller";
import type { IGraph } from "../model/graphs/abstract-graph";
import { FAGraph } from "../model/graphs/fa-graph";
import { MachineTypeRegistry } from "../model/machines/registry";
import type { GraphType } from "../react";

/**
 * Represents a named automaton within a simulation workspace.
 *
 * Each entry is a **component machine** in the Recursive State Machine (RSM)
 * formalism (Alur & Yannakakis, 2001). Components can reference each other
 * through call states (box nodes), enabling hierarchical composition.
 */
export interface SimulationEntry {
  /** Unique identifier for this automaton within the simulation */
  readonly id: string;
  /** Human-readable name */
  name: string;
  /** The controller managing this automaton */
  controller: Controller;
  /** The graph type (FA, PDA, TM) — fixed at creation time */
  readonly graphType: GraphType;
}

/**
 * A Simulation is a workspace that manages multiple automata — the top-level
 * container that corresponds to a **Recursive State Machine** (RSM) system.
 *
 * In the RSM formalism (Alur & Yannakakis, 1998, 2001), an RSM is a tuple
 * of component machines A = (A₁, A₂, ..., Aₖ). Each component can contain
 * **box nodes** (call states) that reference other components. The Simulation
 * class is the concrete realization of this tuple: each `SimulationEntry` is
 * a component Aᵢ, and the Simulation provides the **resolver** that maps
 * call state references (automaton IDs) to their target components.
 *
 * The Simulation enables:
 *
 * 1. **Modular automaton design**: Users can decompose complex automata into
 *    smaller, reusable components — exactly like subroutines in programming
 *    or sub-circuits in circuit design (cf. CircuitVerse).
 *
 * 2. **Cross-type composition**: An FA can call a PDA, a PDA can call a TM,
 *    etc. All combinations across the Chomsky hierarchy are supported.
 *    The resulting computational power is determined by the most powerful
 *    component (see CallStateConfig documentation for the full power table).
 *
 * 3. **Recursive composition**: Components can call themselves (directly or
 *    mutually). This is the mechanism that gives RSMs over finite automata
 *    the power of pushdown automata — the implicit call stack acts as a
 *    pushdown stack (Alur & Yannakakis, 2001, Theorem 1).
 *
 * 4. **Multi-automata operations**: Cross product, equivalence testing,
 *    union via ε-transitions — standard closure property demonstrations.
 *
 * The Simulation also provides **dependency analysis**: detecting which
 * automata reference which others, identifying cycles (recursive calls),
 * and validating referential integrity.
 *
 * @see CallStateConfig for the theoretical basis of sub-automaton calls
 * @see Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
 *      ACM Transactions on Programming Languages and Systems, 23(6), 731-782.
 */
export class Simulation {
  private entries = new Map<string, SimulationEntry>();
  private _activeId: string | null = null;
  private nextId = 0;

  /** The name of this simulation/workspace */
  public name: string;

  /** Called whenever the simulation's entry list or active entry changes */
  public onChangeCallback: (() => void) | null = null;

  constructor(name = "Untitled Simulation") {
    this.name = name;
  }

  /**
   * Adds a new automaton to the simulation.
   * @param name - Display name for the automaton
   * @param controller - Optional pre-built controller. If omitted, creates a new FA controller.
   * @returns The created SimulationEntry
   */
  public addAutomaton(name?: string, controller?: Controller, graphType?: GraphType): SimulationEntry {
    const id = `automaton-${this.nextId++}`;
    const resolvedType: GraphType = graphType ?? (controller ? (controller.graph.shortName as GraphType) : "FA");

    // Use the MachineTypeRegistry to create the appropriate graph type.
    // This eliminates the triple switch and enables extensibility:
    // registering a new machine type automatically makes it available here.
    let resolvedController: Controller;
    if (controller) {
      resolvedController = controller;
    } else {
      const machineType = MachineTypeRegistry.get(resolvedType);
      const graph = machineType ? machineType.createGraph(false) : new FAGraph(false);
      resolvedController = new Controller(graph);
    }
    const entry: SimulationEntry = {
      id,
      name: name ?? `${resolvedType} ${this.entries.size + 1}`,
      controller: resolvedController,
      graphType: resolvedType,
    };
    this.entries.set(id, entry);

    // If this is the first entry, make it active
    this._activeId ??= id;

    this.notifyChange();
    return entry;
  }

  /**
   * Removes an automaton from the simulation by id.
   * If the removed automaton was active, switches to the first remaining one.
   */
  public removeAutomaton(id: string): boolean {
    if (!this.entries.has(id)) return false;
    this.entries.delete(id);

    if (this._activeId === id) {
      const firstKey = this.entries.keys().next().value;
      this._activeId = firstKey ?? null;
    }

    this.notifyChange();
    return true;
  }

  /**
   * Sets the active automaton by id.
   */
  public setActive(id: string): boolean {
    if (!this.entries.has(id)) return false;
    this._activeId = id;
    this.notifyChange();
    return true;
  }

  /**
   * Returns the currently active entry, or null if none.
   */
  public getActive(): SimulationEntry | null {
    if (this._activeId === null) return null;
    return this.entries.get(this._activeId) ?? null;
  }

  /**
   * Returns the currently active controller, or null if none.
   */
  public getActiveController(): Controller | null {
    return this.getActive()?.controller ?? null;
  }

  /**
   * Returns the id of the currently active automaton.
   */
  public get activeId(): string | null {
    return this._activeId;
  }

  /**
   * Returns all entries as an array (ordered by insertion).
   */
  public getEntries(): SimulationEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Returns an entry by id.
   */
  public getEntry(id: string): SimulationEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Returns the number of automata in the simulation.
   */
  public get size(): number {
    return this.entries.size;
  }

  /**
   * Renames an automaton.
   */
  public rename(id: string, newName: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    entry.name = newName;
    this.notifyChange();
    return true;
  }

  /**
   * Duplicates an automaton by serializing and deserializing its graph.
   * The duplicate gets a new name with " (copy)" appended.
   */
  public duplicate(id: string): SimulationEntry | null {
    const source = this.entries.get(id);
    if (!source) return null;

    // Create a new graph of the same type and deserialize the source into it
    const machineType = MachineTypeRegistry.get(source.graphType);
    // eslint-disable-next-line -- Not my proudest moment - haven't gotten the typing quite right for the IGraph interface yet - soon come
    const newGraph = machineType ? machineType.createGraph((source.controller.graph as any).deterministic ?? false) : new FAGraph(false);

    const graphStr = source.controller.graph.toString();
    const parsed = newGraph.fromString(graphStr);

    // If deserialization succeeded, use the populated graph; otherwise use the empty one
    const newController = new Controller(parsed ? newGraph : machineType ? machineType.createGraph(false) : new FAGraph(false));
    const newEntry = this.addAutomaton(`${source.name} (copy)`, newController, source.graphType);

    return newEntry;
  }

  // ─── Sub-Automata / RSM Resolution ─────────────────────────────────

  /**
   * Resolves an automaton ID to its entry.
   *
   * This is the core **resolver** function of the RSM system. When a machine
   * encounters a call state (box node) during execution, it uses this method
   * to look up the target automaton that should be invoked.
   *
   * In the RSM formalism, this corresponds to the mapping from box labels
   * to component machines: each box b ∈ Bᵢ is mapped to some component Aⱼ,
   * and this method performs that mapping at runtime.
   *
   * @param id - The automaton ID (from CallStateConfig.targetAutomatonId)
   * @returns The resolved entry with its graph and controller, or null if not found
   */
  public resolveAutomaton(id: string): SimulationEntry | null {
    return this.entries.get(id) ?? null;
  }

  /**
   * Creates a resolver function suitable for passing to IGraph.validateCallStates().
   *
   * Returns a function that maps automaton IDs to their graphs. This is used
   * during validation to check that all call state references are resolvable.
   */
  public createGraphResolver(): (id: string) => IGraph | null {
    return (id: string) => {
      const entry = this.entries.get(id);
      return entry ? entry.controller.graph : null;
    };
  }

  /**
   * Returns all automata that contain call states referencing the given automaton.
   *
   * This is the **reverse dependency** query: given an automaton A, find all
   * automata B such that B contains a call state targeting A. This is useful for:
   * - Warning users before deleting an automaton that is referenced by others
   * - Visualizing the dependency graph of the RSM system
   * - Understanding the hierarchical structure of the composition
   *
   * @param id - The automaton ID to find dependents of
   * @returns Array of entries that reference the given automaton
   */
  public getDependents(id: string): SimulationEntry[] {
    const dependents: SimulationEntry[] = [];
    for (const entry of this.entries.values()) {
      const callStates = entry.controller.graph.getCallStates();
      for (const node of callStates) {
        if (node.callConfig?.targetAutomatonId === id) {
          dependents.push(entry);
          break; // Only add each entry once
        }
      }
    }
    return dependents;
  }

  /**
   * Detects cycles in the call graph (recursive call chains).
   *
   * In the RSM formalism, cycles correspond to **recursive calls** — a component
   * that (directly or transitively) calls itself. This is not an error; it is
   * the fundamental mechanism that gives RSMs their additional computational power:
   *
   * - **Recursive FA calls**: The implicit call stack acts as a pushdown stack,
   *   making the system equivalent to a PDA. This is the central result of
   *   Alur & Yannakakis (2001): RSMs over finite automata recognize exactly
   *   the context-free languages.
   *
   * - **Recursive PDA calls**: Each PDA invocation gets its own stack. With
   *   recursion, the system has access to unboundedly many stacks. Two-stack
   *   PDAs are Turing-complete (Hopcroft & Ullman, 1979), so recursive PDA
   *   calls can simulate any Turing machine.
   *
   * - **Recursive TM calls**: TMs are already Turing-complete, so recursion
   *   doesn't add computational power, but it does enable modular design.
   *
   * This method returns all cycles as arrays of automaton IDs. Each cycle is
   * a path [A₁, A₂, ..., Aₙ] where A₁ calls A₂, A₂ calls A₃, ..., Aₙ calls A₁.
   *
   * @returns Array of cycles, where each cycle is an array of automaton IDs
   */
  public detectCycles(): string[][] {
    // Build adjacency list from call states
    const adjacency = new Map<string, Set<string>>();
    for (const entry of this.entries.values()) {
      const targets = new Set<string>();
      const callStates = entry.controller.graph.getCallStates();
      for (const node of callStates) {
        if (node.callConfig) {
          targets.add(node.callConfig.targetAutomatonId);
        }
      }
      adjacency.set(entry.id, targets);
    }

    // DFS-based cycle detection (Tarjan-style)
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string) => {
      if (inStack.has(nodeId)) {
        // Found a cycle — extract it from the path
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      inStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacency.get(nodeId);
      if (neighbors) {
        for (const neighbor of neighbors) {
          dfs(neighbor);
        }
      }

      path.pop();
      inStack.delete(nodeId);
    };

    for (const id of adjacency.keys()) {
      dfs(id);
    }

    return cycles;
  }

  /**
   * Builds the complete dependency graph of the RSM system.
   *
   * Returns a map from each automaton ID to the set of automaton IDs it
   * references through call states. This represents the **call graph** of
   * the RSM system — the directed graph where an edge from A to B means
   * "A contains a call state that invokes B."
   *
   * This is useful for:
   * - Visualizing the hierarchical structure of the composition
   * - Topological sorting for non-recursive systems
   * - Determining the computational power class of the overall system
   *
   * @returns Map from automaton ID to set of referenced automaton IDs
   */
  public buildDependencyGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    for (const entry of this.entries.values()) {
      const targets = new Set<string>();
      const callStates = entry.controller.graph.getCallStates();
      for (const node of callStates) {
        if (node.callConfig) {
          targets.add(node.callConfig.targetAutomatonId);
        }
      }
      graph.set(entry.id, targets);
    }
    return graph;
  }

  /**
   * Validates all call state references across the entire RSM system.
   *
   * Checks that every call state in every component references an automaton
   * that actually exists in the workspace. Returns an array of error descriptions
   * for any broken references.
   *
   * Note: This does NOT flag cycles as errors, because recursive calls are
   * a legitimate and powerful feature of the RSM formalism.
   *
   * @returns Array of error messages (empty if all references are valid)
   */
  public validateAllCallStates(): string[] {
    const errors: string[] = [];

    for (const entry of this.entries.values()) {
      const callStates = entry.controller.graph.getCallStates();
      for (const node of callStates) {
        if (!node.callConfig) continue;
        const targetId = node.callConfig.targetAutomatonId;
        const target = this.entries.get(targetId);
        if (!target) {
          errors.push(`"${entry.name}" (${entry.id}): Call state "${node.label}" references ` + `unknown automaton ID "${targetId}".`);
          continue;
        }

        // RSM-specific: warn if call state has no outgoing transitions
        if (node.toEdges.size === 0) {
          errors.push(
            `"${entry.name}" (${entry.id}): Call state "${node.label}" has no outgoing transitions. ` +
              `After the sub-automaton returns, the caller cannot continue.`,
          );
        }

        // RSM-specific: warn if the target automaton has no accepting paths
        const targetGraph = target.controller.graph;
        if (!targetGraph.isValid()) {
          errors.push(
            `"${entry.name}" (${entry.id}): Call state "${node.label}" references "${target.name}" ` +
              `which is not a valid automaton (missing initial or final states).`,
          );
        }
      }
    }

    return errors;
  }

  /**
   * Serializes the entire RSM system to a formal definition string.
   *
   * Produces the formal RSM tuple notation from Alur & Yannakakis (2001):
   * `RSM = (A₁, A₂, ..., Aₖ)` where each component is shown with its
   * standard automaton definition plus its box (call state) mappings.
   *
   * For each component Aᵢ, the output includes:
   * - The standard automaton definition (from `graph.toString()`)
   * - Box nodes: which states are call states and what they reference
   * - Call mode: accept-reject or exit-mapped (with exit map if applicable)
   *
   * **Limitation — single entry node**: The full RSM formalism (Alur &
   * Yannakakis, 2001, Definition 1) defines each component with explicit
   * entry nodes Enᵢ and exit nodes Exᵢ, allowing boxes to specify which
   * entry node to start the callee from. This implementation uses a
   * **single entry node** model: callees always start from their initial
   * state (q₀). This is equivalent to having Enᵢ = {q₀} for all components.
   * The single-entry simplification does not reduce the computational power
   * of the RSM system — any multi-entry RSM can be converted to a
   * single-entry RSM by adding ε-transitions from a single initial state
   * to each original entry node.
   *
   * @see Alur, R., & Yannakakis, M. (2001). "Analysis of recursive state machines."
   *      ACM TOPLAS, 23(6), 731-782. Definition 1.
   */
  public toRSMString(entryId?: string): string {
    // Determine the root entry: explicit param > active > first
    const rootId = entryId ?? this._activeId ?? this.entries.keys().next().value;
    if (!rootId || !this.entries.has(rootId)) return "RSM = (∅)";

    // BFS to find all reachable entries from the root
    const reachableIds = new Set<string>([rootId]);
    const bfsQueue = [rootId];
    while (bfsQueue.length > 0) {
      const currentId = bfsQueue.shift()!;
      const current = this.entries.get(currentId);
      if (!current) continue;
      const callStates = current.controller.graph.getCallStates();
      for (const node of callStates) {
        if (node.callConfig) {
          const targetId = node.callConfig.targetAutomatonId;
          if (!reachableIds.has(targetId) && this.entries.has(targetId)) {
            reachableIds.add(targetId);
            bfsQueue.push(targetId);
          }
        }
      }
    }

    const reachableEntries: SimulationEntry[] = [];
    for (const id of reachableIds) {
      const entry = this.entries.get(id);
      if (entry) reachableEntries.push(entry);
    }

    if (reachableEntries.length === 0) return "RSM = (∅)";

    const powerClass = this.getComputationalPowerClassForEntry(rootId);
    const cycles = this.detectCycles();
    // Filter cycles to only those involving reachable entries
    const relevantCycles = cycles.filter((c) => c.some((id) => reachableIds.has(id)));

    let result = `RSM = (${reachableEntries.map((e) => e.name).join(", ")})\n`;
    result += `Power class: ${powerClass.className} (Chomsky Type ${powerClass.chomskyType})\n`;
    if (relevantCycles.length > 0) {
      result += `Recursive calls detected: ${relevantCycles.map((c) => c.map((id) => this.getEntry(id)?.name ?? id).join(" → ")).join("; ")}\n`;
    }
    result += "\n";

    for (const entry of reachableEntries) {
      result += `── Component: ${entry.name} (${entry.graphType}) ──\n`;
      result += entry.controller.graph.toString() + "\n";

      const callStates = entry.controller.graph.getCallStates();
      if (callStates.length > 0) {
        result += "Box nodes:\n";
        for (const node of callStates) {
          if (!node.callConfig) continue;
          const targetName = this.getEntry(node.callConfig.targetAutomatonId)?.name ?? node.callConfig.targetAutomatonId;
          result += `  ${node.label} → ${targetName} [${node.callConfig.callMode}]`;
          if (node.callConfig.callMode === "exit-mapped" && node.callConfig.exitMap) {
            const mapStr = Object.entries(node.callConfig.exitMap)
              .map(([exit, trans]) => `${exit}↦${trans}`)
              .join(", ");
            result += ` exitMap: {${mapStr}}`;
          }
          result += "\n";
        }
      }
      result += "\n";
    }

    return result.trimEnd();
  }

  /**
   * Determines the computational power class scoped to a specific entry and
   * only the components reachable from it via call states.
   *
   * This method starts from the given entry and walks the call graph
   * transitively to find only the components that are actually connected.
   * An FA tab with no call states will report "Regular" even if a TM exists
   * in another unconnected tab.
   *
   * Per the RSM formalism (Alur & Yannakakis, 2001):
   * - **FA only (no calls)**: Regular languages (Type 3)
   * - **FA with recursive calls**: Context-free languages (Type 2)
   * - **PDA (no calls)**: Context-free languages (Type 2)
   * - **PDA with recursive calls**: Recursively enumerable (Type 0)
   * - **TM (any)**: Recursively enumerable (Type 0)
   * - **Cross-type (FA calling TM, etc.)**: Determined by the most powerful reachable component
   *
   * @param entryId - The automaton ID to scope the power class computation to
   * @returns An object with the power class name and a human-readable description
   */
  public getComputationalPowerClassForEntry(entryId: string): { className: string; chomskyType: number; description: string } {
    const rootEntry = this.entries.get(entryId);
    if (!rootEntry) {
      return {
        className: "Empty",
        chomskyType: -1,
        description: "No automata in the workspace. Add at least one automaton to determine the computational power class.",
      };
    }

    // BFS to find all reachable entries from the root
    const reachableIds = new Set<string>([entryId]);
    const queue = [entryId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = this.entries.get(currentId);
      if (!current) continue;
      const callStates = current.controller.graph.getCallStates();
      for (const node of callStates) {
        if (node.callConfig) {
          const targetId = node.callConfig.targetAutomatonId;
          if (!reachableIds.has(targetId) && this.entries.has(targetId)) {
            reachableIds.add(targetId);
            queue.push(targetId);
          }
        }
      }
    }

    // Collect reachable entries
    const reachableEntries: SimulationEntry[] = [];
    for (const id of reachableIds) {
      const entry = this.entries.get(id);
      if (entry) reachableEntries.push(entry);
    }

    if (reachableEntries.length === 0) {
      return {
        className: "Empty",
        chomskyType: -1,
        description: "No automata reachable. Add at least one automaton to determine the computational power class.",
      };
    }

    // Detect cycles only within the reachable subgraph
    const adjacency = new Map<string, Set<string>>();
    for (const entry of reachableEntries) {
      const targets = new Set<string>();
      const callStates = entry.controller.graph.getCallStates();
      for (const node of callStates) {
        if (node.callConfig && reachableIds.has(node.callConfig.targetAutomatonId)) {
          targets.add(node.callConfig.targetAutomatonId);
        }
      }
      adjacency.set(entry.id, targets);
    }

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string) => {
      if (inStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      inStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacency.get(nodeId);
      if (neighbors) {
        for (const neighbor of neighbors) {
          dfs(neighbor);
        }
      }

      path.pop();
      inStack.delete(nodeId);
    };

    for (const id of reachableIds) {
      dfs(id);
    }

    const types = new Set(reachableEntries.map((e) => e.graphType));
    const hasTM = types.has("TM");
    const hasPDA = types.has("PDA");
    const hasRecursion = cycles.length > 0;

    // ── Type 0: Turing Machine reachable ──
    if (hasTM) {
      return {
        className: "Recursively Enumerable",
        chomskyType: 0,
        description:
          "This component (and its reachable sub-automata) includes one or more Turing Machines (TMs), " +
          "placing it at the top of the Chomsky hierarchy (Type 0). A Turing Machine operates on an " +
          "infinite tape using a read/write head, and can recognise any recursively enumerable language — " +
          "the broadest class of languages for which a computational procedure exists. This means the " +
          "system can, in principle, compute anything that is computable, though it may not halt on all " +
          "inputs. Turing Machines are equivalent in power to any general-purpose computer " +
          "(Church–Turing thesis).\n\n" +
          "Reference: Turing, A. M. (1936). 'On Computable Numbers, with an Application to the " +
          "Entscheidungsproblem.' Proceedings of the London Mathematical Society, 2(42), 230–265.",
      };
    }

    // ── Type 0: PDA reachable from a recursive call chain ──
    if (hasPDA && hasRecursion) {
      // Check if any PDA is reachable from cycle-participating nodes within this subgraph
      const nodesInCycles = new Set<string>();
      for (const cycle of cycles) {
        for (const nodeId of cycle) {
          nodesInCycles.add(nodeId);
        }
      }
      // BFS from cycle nodes
      const reachableFromCycles = new Set<string>(nodesInCycles);
      const cycleQueue = [...nodesInCycles];
      while (cycleQueue.length > 0) {
        const current = cycleQueue.shift()!;
        const neighbors = adjacency.get(current);
        if (neighbors) {
          for (const neighbor of neighbors) {
            if (!reachableFromCycles.has(neighbor)) {
              reachableFromCycles.add(neighbor);
              cycleQueue.push(neighbor);
            }
          }
        }
      }
      const pdaReachableFromRecursion = [...reachableFromCycles].some((id) => {
        const entry = this.entries.get(id);
        return entry?.graphType === "PDA";
      });

      if (pdaReachableFromRecursion) {
        return {
          className: "Recursively Enumerable",
          chomskyType: 0,
          description:
            "This component's reachable sub-automata include Pushdown Automata (PDAs) within recursive " +
            "call chains in the Recursive State Machine (RSM) composition. Each recursive invocation of a " +
            "component that calls a PDA creates a fresh, independent pushdown stack. The availability of " +
            "multiple independent stacks is sufficient to simulate a Turing Machine: a two-stack PDA can " +
            "simulate any Turing Machine by encoding the tape contents across the two stacks. Consequently, " +
            "this system recognises recursively enumerable languages (Chomsky Type 0) — the same class as " +
            "a Turing Machine.\n\n" +
            "Reference: Hopcroft, J. E. & Ullman, J. D. (1979). Introduction to Automata Theory, " +
            "Languages, and Computation, Theorem 8.13.",
        };
      }
    }

    // ── Type 2: PDA present (no recursion reaching a PDA) ──
    if (hasPDA) {
      const hasAnyCalls = reachableEntries.some((e) => e.controller.graph.hasCallStates());
      return {
        className: "Context-Free",
        chomskyType: 2,
        description: hasAnyCalls
          ? "This component (and its reachable sub-automata) includes one or more Pushdown Automata (PDAs) " +
            "with non-recursive sub-automaton calls. Each PDA augments a finite automaton with an auxiliary " +
            "stack, enabling recognition of context-free languages (Chomsky Type 2). Since the call graph " +
            "is acyclic (no recursion reaches a PDA), all sub-automaton calls can be inlined — each call " +
            "state is replaced by an embedded copy of the callee. The resulting system is equivalent to a " +
            "single PDA, and therefore recognises context-free languages.\n\n" +
            "Reference: Hopcroft, J. E., Motwani, R., & Ullman, J. D. (2006). Introduction to Automata " +
            "Theory, Languages, and Computation (3rd ed.), Chapter 6."
          : "This component (and its reachable sub-automata) includes one or more Pushdown Automata (PDAs), " +
            "which augment finite automata with an auxiliary stack memory. The stack enables the PDA to match " +
            "nested and recursive structures — such as balanced parentheses, palindromes, and nested markup " +
            "— that finite automata cannot handle. PDAs recognise exactly the context-free languages " +
            "(Chomsky Type 2), which are generated by context-free grammars (CFGs).\n\n" +
            "Reference: Hopcroft, J. E., Motwani, R., & Ullman, J. D. (2006). Introduction to Automata " +
            "Theory, Languages, and Computation (3rd ed.), Chapter 6.",
      };
    }

    // ── Type 2: FA with recursive calls (implicit call stack = pushdown stack) ──
    if (hasRecursion) {
      return {
        className: "Context-Free",
        chomskyType: 2,
        description:
          "This component consists of Finite Automata (FAs) composed via the Recursive State Machine (RSM) " +
          "formalism with recursive call chains. Although each individual FA has only finite memory, the " +
          "recursive call mechanism introduces an implicit call stack: each time a component invokes another " +
          "(or itself), the return address is pushed onto this stack, and popped when the callee completes. " +
          "This implicit stack is functionally equivalent to the explicit stack of a Pushdown Automaton " +
          "(PDA). Alur and Yannakakis (2001, Theorem 1) proved that RSMs over finite automata recognise " +
          "exactly the context-free languages (Chomsky Type 2) — no more, no less.\n\n" +
          "Reference: Alur, R. & Yannakakis, M. (2001). 'Analysis of Recursive State Machines.' ACM " +
          "Transactions on Programming Languages and Systems, 23(6), 731–782.",
      };
    }

    // ── Type 3: FA only (no recursion) ──
    return {
      className: "Regular",
      chomskyType: 3,
      description:
        "This component consists of one or more Finite Automata (FAs) without recursive sub-automaton " +
        "calls. A Finite Automaton has a fixed, finite number of states and no auxiliary memory — it " +
        "processes input symbols one at a time, transitioning between states according to its transition " +
        "function. FAs recognise exactly the regular languages (Chomsky Type 3), which can equivalently " +
        "be described by regular expressions or regular grammars. Regular languages are closed under " +
        "union, intersection, complement, concatenation, and Kleene star. Any non-recursive sub-automaton " +
        "calls between FAs can be 'inlined' (the callee's state machine is embedded directly into the " +
        "caller), producing a single equivalent FA.\n\n" +
        "Reference: Hopcroft, J. E., Motwani, R., & Ullman, J. D. (2006). Introduction to Automata " +
        "Theory, Languages, and Computation (3rd ed.), Chapters 2–4.",
    };
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }
}
