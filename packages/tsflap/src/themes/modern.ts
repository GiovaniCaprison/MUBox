import type { ThemeConfig } from "./types";

/**
 * Modern theme — clean blue nodes, white labels, dark edges
 * Matches the original JSFlap "modern" theme
 */
export const modernTheme: ThemeConfig = {
  name: "modern",

  // Node styling
  nodeFill: "#008cba",
  nodeInitialFill: "#008cba",
  nodeStroke: "none",
  nodeStrokeWidth: 0,
  nodeLabelColor: "#fff",
  nodeLabelFontSize: 18,
  nodeLabelFontFamily: "sans-serif",

  // Final state circle
  finalCircleStroke: "#fff",
  finalCircleStrokeWidth: 2,

  // Initial state arrow
  initialArrowFill: "#333",
  initialArrowStroke: "#333",

  // Edge styling
  edgeStroke: "#333",
  edgeStrokeWidth: 1,

  // Transition label styling
  transitionFill: "#333",
  transitionFontSize: 16,
  transitionFontFamily: "sans-serif",
  transitionStroke: "#fff",
  transitionStrokeWidth: 5,

  // Control point styling
  controlPointFill: "#aaa",
  controlPointStroke: "none",
  controlPointStrokeWidth: 0,

  // Future edge (drawing)
  futureEdgeStroke: "#888",
  futureEdgeStrokeWidth: 2,

  // Call state (RSM box) styling
  callStateFill: "#e8f4fd",
  callStateStroke: "#2196F3",
  callStateStrokeWidth: 2,
  callStateLabelColor: "#1565C0",

  // Canvas
  gridColor: "#e0e0e0",
  backgroundColor: "#ffffff",

  // Cursors — custom data URI cursors from original JSFlap
  cursorDraw:
    'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAACRUlEQVRIS73Wv6vaUBQH8K9RXKyL0FUlBafHW+o/IFWoOIiTKF0cOzjoosmiOEgRRPAHYiQOljcIdWjRQWxxyChdfJ0c+heIqFAUQS1X8JGY5Gn0PTPfez4559ycGx1u/Ohu7OGlQBOADwDeABgB+KOWyEuAdovFUs3n8x8dDgcajQZ4nncD+KWEXgvaaZr+Xq/X710uF3Q6HWazGVKpFIrFoiJ6DSjDDhnN53Nks1nkcjkZeiloB/DN6/W+r1arsNlssuqpoZeA+8xqtdr9ZrNBpVJBqVRSRKfTKRiG+ctx3LvDG2kFJWUkQfr9PsrlsiK6XC6RTqdJaZ8cLaAEWywWGI/HcDqdiuhut8NwOEQymXwYDAaftGYow3q9Hnw+39ZkMlEkuDhTq9WK0WiEaDT6QxCEMIB/WkAJRg5Dp9NBIBDYY4dAYjQSiaBQKMgwsvZUSc/CDuh2u0Wr1UI4HP4K4LM4s3My1ISRDNXKKP5m1DJ8FUytpK+GKYGy09jtduH3+yUHRHxQzimjWknf0jT98zCIV6sV9Ho9KIqCwWCQja5ze3a8UdzDu0wm85hIJDCZTMCyLDweD0Kh0I6iKEmvL8WOS/oECoIAt9v922w274ezGL0GUwVJ0PV6jWazSYYvOI5DMBjcke9Wa89OlpRhmK3BYNhPEJ7n0W63QbJ8blxp+S+S9VAMXnMaz/mnuWNZ9jEej8NoNErWk1shFospzkYt2R33kNzicZUAcwBflGbjNaDWvRetP3VbXBT0uU03B/8DMSOQLB+pco4AAAAASUVORK5CYII=") 2 24, crosshair',
  cursorMove: "grab",
  cursorErase:
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%2710%27 fill=%27%23ff4444%27 opacity=%270.15%27/%3E%3Cline x1=%277%27 y1=%277%27 x2=%2717%27 y2=%2717%27 stroke=%27%23cc0000%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3Cline x1=%2717%27 y1=%277%27 x2=%277%27 y2=%2717%27 stroke=%27%23cc0000%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") 12 12, pointer',
};
