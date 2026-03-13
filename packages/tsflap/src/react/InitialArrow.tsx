import { useTheme } from "./ThemeContext";
import type { NodeView } from "../engine/views/node-view";

interface InitialArrowProps {
  nodeView: NodeView;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function InitialArrow({ nodeView }: InitialArrowProps) {
  const theme = useTheme();
  const x = nodeView.position.x - nodeView.radius;
  const y = nodeView.position.y;
  const path = `M${x},${y} l-20,-20 l0,40 Z`;

  return (
    <path
      d={path}
      fill={theme.initialArrowFill}
      stroke={theme.initialArrowStroke}
      strokeWidth={1}
      style={{ transition: "fill .3s, stroke .3s" }}
    />
  );
}
