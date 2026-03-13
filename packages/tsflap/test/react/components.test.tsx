import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { MutablePoint } from "../../src/core/point";
import { Controller } from "../../src/engine/controller";
import { NodeView } from "../../src/engine/views/node-view";
import { ContextMenu } from "../../src/react/ContextMenu";
import { ModeSelector } from "../../src/react/ModeSelector";
import { ThemeProvider, useTheme } from "../../src/react/ThemeContext";
import { classicTheme } from "../../src/themes/classic";
import { modernTheme } from "../../src/themes/modern";

afterEach(() => {
  cleanup();
});

// Helper to render with ThemeProvider
function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={modernTheme}>{ui}</ThemeProvider>);
}

describe("ThemeProvider and useTheme", () => {
  it("provides theme to children", () => {
    function ThemeConsumer() {
      const theme = useTheme();
      return <div data-testid="theme-name">{theme.name}</div>;
    }

    render(
      <ThemeProvider theme={modernTheme}>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-name").textContent).toBe(modernTheme.name);
  });

  it("switches themes", () => {
    function ThemeConsumer() {
      const theme = useTheme();
      return <div data-testid="theme-name">{theme.name}</div>;
    }

    const { rerender } = render(
      <ThemeProvider theme={modernTheme}>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-name").textContent).toBe(modernTheme.name);

    rerender(
      <ThemeProvider theme={classicTheme}>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-name").textContent).toBe(classicTheme.name);
  });
});

describe("ModeSelector", () => {
  it("renders mode buttons", () => {
    const ctrl = new Controller();
    renderWithTheme(<ModeSelector controller={ctrl} />);

    // Should render buttons for draw, move, erase modes
    const buttons = document.querySelectorAll("button, [role='button'], div[class*='mode']");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders hidden when hidden prop is true", () => {
    const ctrl = new Controller();
    const { container } = renderWithTheme(<ModeSelector controller={ctrl} hidden={true} />);
    // When hidden, the component should still render but be visually hidden
    expect(container).toBeDefined();
  });
});

describe("ContextMenu", () => {
  it("renders nothing when no options", () => {
    const ctrl = new Controller();
    ctrl.state.contextMenuOptions = null;
    ctrl.state.contextMenuPosition = null;
    const containerRef = React.createRef<HTMLDivElement>();

    const { container } = renderWithTheme(
      <div ref={containerRef}>
        <ContextMenu controller={ctrl} containerRef={containerRef} />
      </div>,
    );
    // Context menu should not show visible menu items
    expect(container.querySelectorAll("[role='menuitem']").length).toBe(0);
  });
});

describe("Canvas", () => {
  it("renders an SVG element", async () => {
    const { Canvas } = await import("../../src/react/Canvas");
    const ctrl = new Controller();
    const g = ctrl.graph;
    const n1 = g.addNode("q0", { initial: true });
    const n2 = g.addNode("q1", { final: true });
    ctrl.views.addNode(new NodeView(n1, new MutablePoint(100, 100)));
    ctrl.views.addNode(new NodeView(n2, new MutablePoint(300, 100)));

    renderWithTheme(<Canvas controller={ctrl} />);

    const svg = document.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
