import { useTheme } from "./ThemeContext";
import type { NodeView } from "../engine/views/node-view";

interface FinalCircleProps {
  nodeView: NodeView;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function FinalCircle({ nodeView }: FinalCircleProps) {
  const theme = useTheme();

  return (
    <circle
      cx={nodeView.position.x}
      cy={nodeView.position.y}
      r={nodeView.radius - 3}
      fill="none"
      stroke={theme.finalCircleStroke}
      strokeWidth={theme.finalCircleStrokeWidth}
      style={{ transition: "fill .3s, stroke .3s" }}
    />
  );
}
