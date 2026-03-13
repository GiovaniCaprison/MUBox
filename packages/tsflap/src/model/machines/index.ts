/**
 * Machine execution module — Strategy pattern for automaton types.
 *
 * This module provides the core abstraction for executing automata across
 * all types in the Chomsky hierarchy. The {@link IMachineType} strategy
 * interface encapsulates type-specific behavior, while the
 * {@link ExecutionEngine} provides the generic BFS exploration algorithm.
 *
 * **Architecture**:
 * - {@link IMachineType} — Strategy interface (what varies between FA/TM/PDA)
 * - {@link ExecutionEngine} — Generic BFS engine (what's common)
 * - {@link MachineTypeRegistry} — Registry for type lookup
 * - {@link FAMachineType}, {@link TMMachineType}, {@link PDAMachineType} — Concrete strategies
 *
 * **To add a new automaton type**: Implement {@link IMachineType} and register
 * it with {@link MachineTypeRegistry}. See the registry documentation for details.
 *
 * @module
 */

// Core types and interfaces
export type { IMachineState, IMachineType, SubAutomatonResolver } from "./types";
export type { StepSimulationConfig, CallTraceEntry, SimulationConfiguration } from "./types";
export type { FASimulationConfig, TMSimulationConfig, PDASimulationConfig } from "./types";
export { MachineError, MAX_CALL_DEPTH, MAX_CONFIGURATIONS } from "./types";

// Machine type strategies
export { FAMachineType, FAMachineState } from "./fa-type";
export { TMMachineType, TMachineState } from "./tm-type";
export { PDAMachineType, PDAMachineState } from "./pda-type";

// Generic execution engine
export { ExecutionEngine } from "./execution-engine";

// Registry
export { MachineTypeRegistry } from "./registry";
