/**
 * useSimulatorCommands — Builds the unified list of {@link CommandItem}s
 * that power both the command palette and the toolbar menus.
 *
 * This is the **single source of truth** for all executable actions in the
 * simulator.  The toolbar dropdowns and the ⌘K command palette both consume
 * the same array, eliminating the duplication that previously existed.
 *
 * Commands are grouped by category (Mode, Edit, Layout, View, Theme, Labels,
 * Export, New, Conversion, Multi-Automata, Help) and are filtered/disabled
 * based on the current graph type, determinism, and validity.
 */

import type { Controller, GraphType, ThemeConfig } from "@mubox/local-tsflap";
import {
  BoardMode,
  TransitionStyle,
  alignToGrid,
  circleLayout,
  classicTheme,
  convertNFAtoDFA,
  crossProduct,
  dfaToRegex,
  exportToDefinition,
  exportToLaTeX,
  exportToPNG,
  forceDirectedLayout,
  importFromDefinition,
  importFromLaTeX,
  modernTheme,
  regexToNFA,
  removeUnreachableStates,
  testEquivalence,
  treeLayout,
  unionViaEpsilon,
} from "@mubox/local-tsflap";
import { useMemo } from "react";

import type { CanvasDimensions } from "./use-canvas-dimensions";
import type { CommandItem } from "@/components/command-palette";

/* ─── Types ─── */

interface UseSimulatorCommandsOptions {
  readonly controller: Controller;
  readonly graphType: GraphType;
  readonly deterministic: boolean;
  readonly isValid: boolean;
  readonly canvasDimensions: CanvasDimensions;
  readonly theme: ThemeConfig;

  /** All workspace entries compatible with the active graph for multi-automata ops. */
  readonly compatibleEntries: readonly {
    readonly id: string;
    readonly name: string;
    readonly graphType: string;
    readonly controller: Controller;
  }[];
  readonly activeEntryName: string | undefined;

  /* Callbacks */
  readonly setTheme: (theme: ThemeConfig) => void;
  readonly toggleDeterministic: (checked: boolean) => void;
  readonly handleAddAutomaton: (type: GraphType) => void;
  readonly addResultAndSwitch: (name: string, ctrl: Controller) => void;
  readonly setShowFormalDef: (open: boolean) => void;
  readonly setShowPowerClass: (open: boolean) => void;
  readonly setCommandPaletteOpen: (open: boolean) => void;
  readonly setShowShortcuts: (open: boolean) => void;
  readonly showConfirm: (opts: {
    title: string;
    description: string;
    variant?: "danger" | "warning" | "info";
    confirmLabel?: string;
    onConfirm: () => void;
  }) => void;
  readonly showAlert: (opts: { title: string; description: string; variant?: "success" | "error" | "info" }) => void;
  readonly showRegexResult?: (regex: string) => void;
  readonly forceUpdate: () => void;

  /** Ref to the container element (used for PNG export to find the SVG). */
  readonly containerRef: React.RefObject<HTMLDivElement | null>;

  /** Callback to prompt the user for text input (used for regex, definition, LaTeX import). */
  readonly promptTextInput?: (opts: {
    title: string;
    placeholder: string;
    confirmLabel: string;
    onConfirm: (value: string) => void;
  }) => void;
}

export function useSimulatorCommands(opts: UseSimulatorCommandsOptions): CommandItem[] {
  const {
    controller,
    graphType,
    deterministic,
    isValid,
    canvasDimensions,
    theme,
    compatibleEntries,
    activeEntryName,
    setTheme,
    toggleDeterministic,
    handleAddAutomaton,
    addResultAndSwitch,
    setShowFormalDef,
    setShowPowerClass,
    setCommandPaletteOpen,
    setShowShortcuts,
    showConfirm,
    showAlert,
    showRegexResult,
    forceUpdate,
    containerRef,
    promptTextInput,
  } = opts;

  return useMemo(() => {
    const cmds: CommandItem[] = [];

    /* ─── Mode ─── */
    cmds.push({
      id: "mode-draw",
      label: "Draw Mode",
      shortcut: "D",
      group: "Mode",
      action: () => {
        controller.setMode(BoardMode.DRAW);
        forceUpdate();
      },
    });
    cmds.push({
      id: "mode-move",
      label: "Move Mode",
      shortcut: "M",
      group: "Mode",
      action: () => {
        controller.setMode(BoardMode.MOVE);
        forceUpdate();
      },
    });
    cmds.push({
      id: "mode-erase",
      label: "Erase Mode",
      shortcut: "E",
      group: "Mode",
      action: () => {
        controller.setMode(BoardMode.ERASE);
        forceUpdate();
      },
    });

    /* ─── Edit ─── */
    cmds.push({
      id: "undo",
      label: "Undo",
      shortcut: "⌘Z",
      group: "Edit",
      action: () => {
        controller.history.undo();
        forceUpdate();
      },
    });
    cmds.push({
      id: "redo",
      label: "Redo",
      shortcut: "⌘⇧Z",
      group: "Edit",
      action: () => {
        controller.history.redo();
        forceUpdate();
      },
    });
    cmds.push({
      id: "toggle-deterministic",
      label: deterministic ? "Switch to Non-deterministic" : "Switch to Deterministic",
      group: "Edit",
      action: () => toggleDeterministic(!deterministic),
    });
    cmds.push({
      id: "reindex",
      label: "Re-index Node Labels",
      group: "Edit",
      action: () => controller.reindexNodeNames(),
    });

    /* ─── Layout ─── */
    cmds.push({
      id: "layout-circle",
      label: "Circle Layout",
      group: "Layout",
      action: () => circleLayout(controller, canvasDimensions.width, canvasDimensions.height),
    });
    cmds.push({
      id: "layout-tree",
      label: "Tree Layout",
      group: "Layout",
      action: () => treeLayout(controller),
    });
    cmds.push({
      id: "layout-force",
      label: "Force-Directed Layout",
      group: "Layout",
      action: () => forceDirectedLayout(controller, canvasDimensions.width, canvasDimensions.height),
    });
    cmds.push({
      id: "layout-grid",
      label: "Align to Grid",
      group: "Layout",
      action: () => alignToGrid(controller),
    });

    /* ─── View ─── */
    cmds.push({
      id: "zoom-fit",
      label: "Zoom to Fit",
      group: "View",
      action: () => controller.zoomToFit(canvasDimensions.width, canvasDimensions.height),
    });
    cmds.push({
      id: "reset-view",
      label: "Reset View",
      group: "View",
      action: () => controller.resetView(canvasDimensions.width, canvasDimensions.height),
    });
    cmds.push({
      id: "toggle-grid",
      label: `${controller.settings.grid ? "Hide" : "Show"} Grid`,
      group: "View",
      action: () => {
        controller.settings.grid = !controller.settings.grid;
        controller.views.update();
      },
    });
    cmds.push({
      id: "formal-def",
      label: "Show Formal Definition",
      group: "View",
      action: () => setShowFormalDef(true),
    });

    /* ─── Theme ─── */
    cmds.push({
      id: "theme-toggle",
      label: theme.name === "modern" ? "Use Classic Theme" : "Use Modern Theme",
      group: "Theme",
      action: () => {
        const next = theme.name === "modern" ? classicTheme : modernTheme;
        setTheme(next);
        forceUpdate();
      },
    });

    /* ─── Labels ─── */
    cmds.push({
      id: "style-upright",
      label: "Upright Labels",
      group: "Labels",
      action: () => {
        controller.settings.transitionStyle = TransitionStyle.UPRIGHT;
        controller.views.update();
      },
    });
    cmds.push({
      id: "style-perp",
      label: "Perpendicular Labels",
      group: "Labels",
      action: () => {
        controller.settings.transitionStyle = TransitionStyle.PERPENDICULAR;
        controller.views.update();
      },
    });

    /* ─── Export ─── */
    cmds.push({
      id: "export-def",
      label: "Export Formal Definition",
      group: "Export",
      action: () => exportToDefinition(controller),
    });
    cmds.push({
      id: "export-latex",
      label: "Export LaTeX (TikZ)",
      group: "Export",
      action: () => exportToLaTeX(controller),
    });
    cmds.push({
      id: "export-png",
      label: "Export PNG Image",
      group: "Export",
      action: () => {
        const svgEl = containerRef.current?.querySelector("svg");
        if (svgEl) exportToPNG(controller, svgEl);
      },
    });

    /* ─── New automaton ─── */
    cmds.push({ id: "new-fa", label: "New Finite Automaton", group: "New", action: () => handleAddAutomaton("FA") });
    cmds.push({ id: "new-pda", label: "New Pushdown Automaton", group: "New", action: () => handleAddAutomaton("PDA") });
    cmds.push({ id: "new-tm", label: "New Turing Machine", group: "New", action: () => handleAddAutomaton("TM") });

    /* ─── Conversion ─── */
    cmds.push({
      id: "remove-unreachable",
      label: "Remove Unreachable States",
      group: "Conversion",
      disabled: !isValid,
      action: () => {
        showConfirm({
          title: "Remove Unreachable States",
          description: "This will permanently delete all states not reachable from the initial state.",
          variant: "warning",
          confirmLabel: "Remove",
          onConfirm: () => {
            removeUnreachableStates(controller);
            forceUpdate();
          },
        });
      },
    });

    if (graphType === "FA" && !deterministic) {
      cmds.push({
        id: "nfa-to-dfa",
        label: "Convert NFA → DFA",
        group: "Conversion",
        disabled: !isValid,
        action: () => {
          const dfaCtrl = convertNFAtoDFA(controller);
          if (dfaCtrl) addResultAndSwitch(`DFA of ${activeEntryName}`, dfaCtrl);
        },
      });
    }

    /* ─── Multi-Automata operations ─── */
    if (graphType === "FA") {
      for (const other of compatibleEntries) {
        cmds.push({
          id: `union-${other.id}`,
          label: `Union with "${other.name}"`,
          group: "Multi-Automata",
          disabled: !isValid,
          action: () => {
            const r = crossProduct(controller, other.controller, "union");
            if (r) addResultAndSwitch(`${activeEntryName} ∪ ${other.name}`, r);
          },
        });
        cmds.push({
          id: `intersect-${other.id}`,
          label: `Intersection with "${other.name}"`,
          group: "Multi-Automata",
          disabled: !isValid,
          action: () => {
            const r = crossProduct(controller, other.controller, "intersection");
            if (r) addResultAndSwitch(`${activeEntryName} ∩ ${other.name}`, r);
          },
        });
        cmds.push({
          id: `diff-${other.id}`,
          label: `Difference with "${other.name}"`,
          group: "Multi-Automata",
          disabled: !isValid,
          action: () => {
            const r = crossProduct(controller, other.controller, "difference");
            if (r) addResultAndSwitch(`${activeEntryName} − ${other.name}`, r);
          },
        });
        cmds.push({
          id: `equiv-${other.id}`,
          label: `Test Equivalence with "${other.name}"`,
          group: "Multi-Automata",
          disabled: !isValid,
          action: () => {
            const res = testEquivalence(controller, other.controller);
            if (res === true)
              showAlert({
                title: "Equivalent",
                description: `"${activeEntryName}" and "${other.name}" are equivalent.`,
                variant: "success",
              });
            else if (res === false)
              showAlert({
                title: "Not Equivalent",
                description: `"${activeEntryName}" and "${other.name}" are NOT equivalent.`,
                variant: "error",
              });
          },
        });
      }
    }

    if (graphType === "PDA" || graphType === "TM") {
      for (const other of compatibleEntries) {
        cmds.push({
          id: `${graphType.toLowerCase()}-union-${other.id}`,
          label: `Union with "${other.name}"`,
          group: "Multi-Automata",
          disabled: !isValid,
          action: () => {
            const r = unionViaEpsilon(controller, other.controller);
            if (r) addResultAndSwitch(`${activeEntryName} ∪ ${other.name}`, r);
          },
        });
      }
    }

    /* ─── Regex / Import ─── */
    if (graphType === "FA") {
      cmds.push({
        id: "dfa-to-regex",
        label: "Show FA as Regex",
        group: "View",
        disabled: !isValid,
        action: () => {
          const regex = dfaToRegex(controller);
          if (regex) {
            if (showRegexResult) {
              showRegexResult(regex);
            } else {
              showAlert({ title: "Regular Expression", description: regex, variant: "info" });
            }
          } else {
            showAlert({
              title: "Export Failed",
              description: "Could not convert to regex. Ensure the graph is a valid FA.",
              variant: "error",
            });
          }
        },
      });

      cmds.push({
        id: "regex-to-nfa",
        label: "Import from Regex",
        group: "Import",
        action: () => {
          if (promptTextInput) {
            promptTextInput({
              title: "Regex to NFA",
              placeholder: "e.g. (a|b)*c",
              confirmLabel: "Convert",
              onConfirm: (value: string) => {
                const nfaCtrl = regexToNFA(value);
                if (nfaCtrl) {
                  addResultAndSwitch(`NFA of /${value}/`, nfaCtrl);
                } else {
                  showAlert({
                    title: "Invalid Regex",
                    description: `Could not parse "${value}" as a regular expression.`,
                    variant: "error",
                  });
                }
              },
            });
          }
        },
      });
    }

    cmds.push({
      id: "import-definition",
      label: "Import from Formal Definition",
      group: "Import",
      action: () => {
        if (promptTextInput) {
          promptTextInput({
            title: "Import from Formal Definition",
            placeholder: `e.g. NFA:({a}, {q0, q1}, {(q0, q1, a)}, q0, {q1})`,
            confirmLabel: "Import",
            onConfirm: (value: string) => {
              const ctrl = importFromDefinition(value, graphType as "FA" | "PDA" | "TM");
              if (ctrl) {
                addResultAndSwitch(`Imported ${graphType}`, ctrl);
              } else {
                showAlert({ title: "Import Failed", description: "Could not parse the formal definition string.", variant: "error" });
              }
            },
          });
        }
      },
    });

    cmds.push({
      id: "import-latex",
      label: "Import from LaTeX (TikZ)",
      group: "Import",
      action: () => {
        if (promptTextInput) {
          promptTextInput({
            title: "Import from LaTeX (TikZ)",
            placeholder: `\\node[state, initial] (q0) {$q_0$}; ...`,
            confirmLabel: "Import",
            onConfirm: (value: string) => {
              const ctrl = importFromLaTeX(value);
              if (ctrl) {
                addResultAndSwitch("Imported from LaTeX", ctrl);
              } else {
                showAlert({
                  title: "Import Failed",
                  description: "Could not parse the LaTeX/TikZ input. Ensure it uses standard TikZ automata notation.",
                  variant: "error",
                });
              }
            },
          });
        }
      },
    });

    /* ─── Workspace ─── */
    cmds.push({
      id: "duplicate-tab",
      label: "Duplicate Current Tab",
      group: "Workspace",
      action: () => {
        const defStr = controller.graph.toString();
        const ctrl = importFromDefinition(defStr, graphType as "FA" | "PDA" | "TM");
        if (ctrl) {
          addResultAndSwitch(`${activeEntryName} (copy)`, ctrl);
        }
      },
    });
    cmds.push({
      id: "power-class",
      label: "Show Power Class",
      group: "Workspace",
      action: () => setShowPowerClass(true),
    });

    /* ─── Help ─── */
    cmds.push({
      id: "open-commands",
      label: "Open Commands",
      shortcut: "⌘K",
      group: "Help",
      action: () => setCommandPaletteOpen(true),
    });
    cmds.push({
      id: "show-shortcuts",
      label: "Keyboard Shortcuts",
      shortcut: "?",
      group: "Help",
      action: () => setShowShortcuts(true),
    });

    return cmds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    controller,
    graphType,
    deterministic,
    isValid,
    canvasDimensions,
    theme,
    compatibleEntries,
    activeEntryName,
    handleAddAutomaton,
    addResultAndSwitch,
    showConfirm,
    showAlert,
    forceUpdate,
  ]);
}
