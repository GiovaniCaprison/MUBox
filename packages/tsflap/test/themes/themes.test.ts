import { describe, it, expect } from "vitest";

import { classicTheme } from "../../src/themes/classic";
import { modernTheme } from "../../src/themes/modern";
import type { ThemeConfig } from "../../src/themes/types";

function assertValidTheme(theme: ThemeConfig) {
  // All required properties should be defined and non-empty
  expect(theme.name).toBeTruthy();
  expect(theme.nodeFill).toBeTruthy();
  expect(theme.nodeStroke).toBeTruthy();
  expect(theme.nodeStrokeWidth).toBeGreaterThanOrEqual(0);
  expect(theme.nodeLabelColor).toBeTruthy();
  expect(theme.nodeLabelFontSize).toBeGreaterThan(0);
  expect(theme.nodeLabelFontFamily).toBeTruthy();
  expect(theme.finalCircleStroke).toBeTruthy();
  expect(theme.finalCircleStrokeWidth).toBeGreaterThan(0);
  expect(theme.initialArrowFill).toBeTruthy();
  expect(theme.edgeStroke).toBeTruthy();
  expect(theme.edgeStrokeWidth).toBeGreaterThan(0);
  expect(theme.transitionFill).toBeTruthy();
  expect(theme.transitionFontSize).toBeGreaterThan(0);
  expect(theme.controlPointFill).toBeTruthy();
  expect(theme.futureEdgeStroke).toBeTruthy();
  expect(theme.backgroundColor).toBeTruthy();
  expect(theme.cursorDraw).toBeTruthy();
  expect(theme.cursorMove).toBeTruthy();
  expect(theme.cursorErase).toBeTruthy();
}

describe("modernTheme", () => {
  it("has all required properties", () => {
    assertValidTheme(modernTheme);
  });

  it("has a distinct name", () => {
    expect(modernTheme.name).toBeTruthy();
    expect(modernTheme.name).not.toBe(classicTheme.name);
  });
});

describe("classicTheme", () => {
  it("has all required properties", () => {
    assertValidTheme(classicTheme);
  });

  it("has a distinct name", () => {
    expect(classicTheme.name).toBeTruthy();
  });
});

describe("Theme differences", () => {
  it("modern and classic themes have different visual properties", () => {
    // At least some visual properties should differ between themes
    const diffs = [
      modernTheme.nodeFill !== classicTheme.nodeFill,
      modernTheme.backgroundColor !== classicTheme.backgroundColor,
      modernTheme.edgeStroke !== classicTheme.edgeStroke,
      modernTheme.nodeStroke !== classicTheme.nodeStroke,
    ];
    expect(diffs.some(Boolean)).toBe(true);
  });
});
