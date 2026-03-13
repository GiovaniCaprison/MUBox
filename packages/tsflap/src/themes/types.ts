/**
 * Theme configuration for the automata designer
 */
export interface ThemeConfig {
  name: string;

  // Node styling
  nodeFill: string;
  nodeInitialFill: string;
  nodeStroke: string;
  nodeStrokeWidth: number;
  nodeLabelColor: string;
  nodeLabelFontSize: number;
  nodeLabelFontFamily: string;

  // Final state circle
  finalCircleStroke: string;
  finalCircleStrokeWidth: number;

  // Initial state arrow
  initialArrowFill: string;
  initialArrowStroke: string;

  // Edge styling
  edgeStroke: string;
  edgeStrokeWidth: number;

  // Transition label styling
  transitionFill: string;
  transitionFontSize: number;
  transitionFontFamily: string;
  transitionStroke: string;
  transitionStrokeWidth: number;

  // Control point styling
  controlPointFill: string;
  controlPointStroke: string;
  controlPointStrokeWidth: number;

  // Future edge (drawing)
  futureEdgeStroke: string;
  futureEdgeStrokeWidth: number;

  // Call state (RSM box) styling
  callStateFill: string;
  callStateStroke: string;
  callStateStrokeWidth: number;
  callStateLabelColor: string;

  // Canvas
  gridColor: string;
  backgroundColor: string;

  // Cursors (data URIs or CSS cursor values)
  cursorDraw: string;
  cursorMove: string;
  cursorErase: string;
}
