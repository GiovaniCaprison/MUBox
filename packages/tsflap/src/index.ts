// ============================================================
// TSFlap — Public API
// ============================================================

// React components (primary consumer API)
export { Canvas, ContextMenu, ModeSelector, ThemeProvider, useTheme } from "./react";
export type { GraphType } from "./react";
export type {
  CanvasComponentOverrides,
  NodeRendererProps,
  EdgeRendererProps,
  TransitionLabelProps,
  ControlPointRendererProps,
  FinalCircleRendererProps,
  InitialArrowRendererProps,
  FutureEdgeRendererProps,
  ContextMenuRendererProps,
} from "./react";

// Themes
export { modernTheme, classicTheme } from "./themes";
export type { ThemeConfig } from "./themes";

// Engine (for headless / advanced usage)
export { Controller, BoardState, BoardMode, TransitionStyle, History } from "./engine";
export { exportToPNG, exportToLaTeX, exportToDefinition } from "./engine";
export { circleLayout, treeLayout, forceDirectedLayout, alignToGrid } from "./engine";
export { removeUnreachableStates, convertNFAtoDFA, regexToNFA, dfaToRegex, importFromDefinition, importFromLaTeX } from "./engine";
export { crossProduct, testEquivalence, unionViaEpsilon, Simulation } from "./engine";
export { StepSimulator, SimulationStatus } from "./engine";
export { BatchCommand } from "./engine";
export type { BoardSettings, ICommand, SelectionRect, CrossProductOperation, SimulationEntry } from "./engine";
export type { SimulationStep } from "./engine";

// Views
export { NodeView, EdgeView, EdgeViewPathMode, FutureEdgeView, ViewCollection } from "./engine";

// Model (for advanced consumers)
export { FAGraph, TMGraph, PDAGraph, Node, Edge, NodeList, EdgeList } from "./model";
export { CharacterTransition, TuringTransition, TuringTransitionDirection, PushdownTransition } from "./model";
export { EPSILON, BLANK, INITIAL_STACK } from "./model";
export type { IGraph, Transition, NodeOptions } from "./model";

// Machine execution (Strategy pattern architecture)
export { ExecutionEngine, MachineTypeRegistry, MachineError } from "./model";
export { FAMachineType, TMMachineType, PDAMachineType } from "./model";
export type {
  IMachineType,
  SubAutomatonResolver,
  SimulationConfiguration,
  FASimulationConfig,
  TMSimulationConfig,
  PDASimulationConfig,
  CallTraceEntry,
} from "./model";

// Core (collections + geometry)
export { OrderedMap } from "./core";
export type { Hashable } from "./core";
export { MutablePoint, ImmutablePoint } from "./core";
export type { IPoint } from "./core";
