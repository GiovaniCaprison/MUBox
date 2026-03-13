import { useTheme } from "./ThemeContext";
import { TransitionLabel } from "./TransitionLabel";
import type { Controller } from "../engine/controller";
import type { EdgeView as EdgeViewModel } from "../engine/views/edge-view";

interface EdgeViewProps {
  edgeView: EdgeViewModel;
  controller: Controller;
  onHoverChange: (hovering: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function EdgeViewComponent({ edgeView, controller, onHoverChange }: EdgeViewProps) {
  const theme = useTheme();
  const path = edgeView.getPath();

  // Check if any edge model in this view is highlighted
  let edgeHighlightColor: string | null = null;
  for (const edgeModel of edgeView.models.items) {
    const color = controller.state.highlightedEdges.get(edgeModel);
    if (color) {
      edgeHighlightColor = color;
      break;
    }
  }

  return (
    <g>
      {/* Highlight glow behind the edge */}
      {edgeHighlightColor && (
        <path
          d={path}
          stroke={edgeHighlightColor}
          strokeWidth={theme.edgeStrokeWidth + 4}
          fill="none"
          opacity={0.4}
          style={{ pointerEvents: "none", filter: `drop-shadow(0 0 4px ${edgeHighlightColor})` }}
        />
      )}
      <path
        d={path}
        stroke={edgeHighlightColor ?? theme.edgeStroke}
        strokeWidth={edgeHighlightColor ? theme.edgeStrokeWidth + 1 : theme.edgeStrokeWidth}
        fill="none"
        markerEnd={edgeHighlightColor ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
        style={{ cursor: "pointer", transition: "fill .3s, stroke .3s" }}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
      />
      {edgeView.models.items.map((edge) => (
        <TransitionLabel key={edge.hashCode()} edge={edge} edgeView={edgeView} controller={controller} />
      ))}
    </g>
  );
}
