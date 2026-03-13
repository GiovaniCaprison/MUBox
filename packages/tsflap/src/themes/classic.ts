import type { ThemeConfig } from "./types";

/**
 * Classic theme — yellow nodes, black labels, JFLAP-style
 */
export const classicTheme: ThemeConfig = {
  name: "classic",

  // Node styling
  nodeFill: "rgb(255, 255, 150)",
  nodeInitialFill: "rgb(255, 255, 150)",
  nodeStroke: "#000",
  nodeStrokeWidth: 1,
  nodeLabelColor: "#000",
  nodeLabelFontSize: 18,
  nodeLabelFontFamily: "sans-serif",

  // Final state circle
  finalCircleStroke: "#000",
  finalCircleStrokeWidth: 1,

  // Initial state arrow
  initialArrowFill: "#fff",
  initialArrowStroke: "#000",

  // Edge styling
  edgeStroke: "#000",
  edgeStrokeWidth: 1,

  // Transition label styling
  transitionFill: "#000",
  transitionFontSize: 16,
  transitionFontFamily: "sans-serif",
  transitionStroke: "#fff",
  transitionStrokeWidth: 5,

  // Control point styling
  controlPointFill: "#fff",
  controlPointStroke: "#000",
  controlPointStrokeWidth: 1,

  // Future edge (drawing)
  futureEdgeStroke: "#666",
  futureEdgeStrokeWidth: 1,

  // Call state (RSM box) styling
  callStateFill: "#ffffcc",
  callStateStroke: "#000",
  callStateStrokeWidth: 1,
  callStateLabelColor: "#000",

  // Canvas
  gridColor: "#e0e0e0",
  backgroundColor: "#ffffff",

  // Cursors
  cursorDraw: "crosshair",
  cursorMove: "grab",
  cursorErase:
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%2710%27 fill=%27%23ff4444%27 opacity=%270.15%27/%3E%3Cline x1=%277%27 y1=%277%27 x2=%2717%27 y2=%2717%27 stroke=%27%23cc0000%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3Cline x1=%2717%27 y1=%277%27 x2=%277%27 y2=%2717%27 stroke=%27%23cc0000%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") 12 12, pointer',
};
