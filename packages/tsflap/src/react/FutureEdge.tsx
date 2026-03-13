import { useTheme } from "./ThemeContext";
import type { FutureEdgeView } from "../engine/views/future-edge-view";

interface FutureEdgeProps {
  futureEdge: FutureEdgeView;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function FutureEdge({ futureEdge }: FutureEdgeProps) {
  const theme = useTheme();

  return (
    <line
      x1={futureEdge.start.x}
      y1={futureEdge.start.y}
      x2={futureEdge.end.x}
      y2={futureEdge.end.y}
      stroke={theme.futureEdgeStroke}
      strokeWidth={theme.futureEdgeStrokeWidth}
      strokeDasharray="5,5"
      style={{ pointerEvents: "none" }}
    />
  );
}
