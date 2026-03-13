// Controller
export { Controller } from "./controller";

// State
export { BoardMode, BoardState, TransitionStyle } from "./state";
export type { BoardSettings, ContextMenuOption, SelectionRect } from "./state";

// History (undo/redo)
export { History } from "./history";

// Managers (extracted from Controller for SRP)
export { SelectionManager } from "./managers/selection-manager";
export { ViewportManager } from "./managers/viewport-manager";

// Commands
export {
  AddEdgeFromNodeCommand,
  AddNodeAtPointCommand,
  BatchCommand,
  EditEdgeTransitionCommand,
  EraseEdgeCommand,
  EraseEdgeTransitionCommand,
  EraseNodeCommand,
  MarkFinalNodeCommand,
  MoveBoardCommand,
  MoveEdgeControlCommand,
  MoveNodeCommand,
  ReindexNodeLabelsCommand,
  RelabelNodeCommand,
  SetInitialNodeCommand,
  UnmarkFinalNodeCommand,
} from "./commands";
export type { ICommand } from "./commands";

// Export utilities
export { exportToDefinition, exportToLaTeX, exportToPNG } from "./tools/export";

// Layout tools
export { alignToGrid, circleLayout, forceDirectedLayout, treeLayout } from "./tools/layout-tools";

// Conversion tools
export { convertNFAtoDFA, regexToNFA, removeUnreachableStates } from "./tools/conversion-tools";

// Regex tools (DFA→regex, import from definition)
export { dfaToRegex, importFromDefinition, importFromLaTeX } from "./tools/regex-tools";

// Multi-automata tools
export { crossProduct, testEquivalence, unionViaEpsilon } from "./tools/multi-automata-tools";
export type { CrossProductOperation } from "./tools/multi-automata-tools";

// Simulation (workspace)
export { Simulation } from "./simulation";
export type { SimulationEntry } from "./simulation";

// Step Simulator (step-by-step execution)
export { SimulationStatus, StepSimulator } from "./step-simulator";
export type { CallStackFrame, SimulationStep } from "./step-simulator";

// Views
export { EdgeView, EdgeViewPathMode, FutureEdgeView, NodeView, ViewCollection } from "./views";
export type { NearestNode } from "./views";
