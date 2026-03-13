/**
 * TSFlapSimulatorPage — The interactive automaton simulator.
 *
 * This is the top-level page component for the `/tsflap/simulator` route.
 * It orchestrates the simulator by composing:
 *
 * - **Custom hooks** for state management (tabs, test inputs, canvas
 *   dimensions, keyboard shortcuts, command palette commands).
 * - **Extracted modal components** (keyboard shortcuts, formal definition,
 *   sub-automaton picker, confirm/alert).
 * - **Toolbar & tab bar** for the menu system and workspace tabs.
 * - **Canvas** from the tsflap engine for the interactive graph editor.
 * - **Floating panels** for step simulation and quick testing.
 *
 * The previous version of this file was ~1,100 lines.  After extracting
 * hooks, modals, and sub-components it is now a slim orchestrator that
 * delegates all complex logic to focused modules.
 */

import type { NodeView, ThemeConfig } from "@mubox/local-tsflap";
import {
  BoardMode,
  Canvas,
  ContextMenu,
  ModeSelector,
  Simulation,
  ThemeProvider,
  TransitionStyle,
  alignToGrid,
  circleLayout,
  classicTheme,
  convertNFAtoDFA,
  exportToDefinition,
  exportToLaTeX,
  exportToPNG,
  forceDirectedLayout,
  modernTheme,
  removeUnreachableStates,
  treeLayout,
} from "@mubox/local-tsflap";
import type { FunctionComponent } from "react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { FormalDefinitionModal } from "./formal-definition-modal";
import { useCanvasDimensions } from "./hooks/use-canvas-dimensions";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useSimulatorCommands } from "./hooks/use-simulator-commands";
import { useTabManagement } from "./hooks/use-tab-management";
import { useTestInputs } from "./hooks/use-test-inputs";
import { PlusIcon } from "./icons";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { PowerClassModal } from "./power-class-modal";
import { SimulationPanel } from "./simulation-panel";
import {
  Icons,
  MenuBar,
  NewTabDropdown,
  ToolbarDropdown,
  ToolbarIconButton,
  ToolbarItem,
  ToolbarSection,
  ToolbarSeparator,
} from "./simulator-toolbar";
import type { PickerEntry } from "./sub-automaton-picker-modal";
import { SubAutomatonPickerModal } from "./sub-automaton-picker-modal";
import { TestInputRow } from "./test-input-row";
import { CommandPalette } from "@/components/command-palette";
import { AlertModal, ConfirmModal } from "@/components/confirm-modal";
import { FloatingPanel, PanelRow } from "@/components/floating-panel";
import { DarkModeContext } from "@/providers/theme-provider";

/* ─── Dark-mode theme overrides for the canvas ─── */

const DARK_MODE_OVERRIDES: Partial<ThemeConfig> = {
  backgroundColor: "var(--color-section-bg)",
  gridColor: "var(--color-zinc-600)",
  edgeStroke: "var(--color-zinc-300)",
  initialArrowFill: "var(--color-zinc-300)",
  initialArrowStroke: "var(--color-zinc-300)",
  transitionFill: "var(--color-zinc-300)",
  transitionStroke: "var(--color-section-bg)",
  futureEdgeStroke: "var(--color-gray-400)",
  controlPointFill: "var(--color-zinc-600)",
  finalCircleStroke: "var(--color-section-bg)",
};

/** Colour mapping for automaton-type badges in the tab bar. */
const TYPE_COLORS: Record<string, string> = {
  FA: "bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-600",
  PDA: "bg-violet-600/10 text-violet-600 dark:bg-violet-600/20 dark:text-violet-600",
  TM: "bg-teal-600/10 text-teal-600 dark:bg-teal-600/20 dark:text-teal-600",
};

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export const TSFlapSimulatorPage: FunctionComponent = () => {
  const { isDarkMode } = useContext(DarkModeContext);

  /* ─── Simulation workspace (stable singleton) ─── */
  const [simulation] = useState(() => {
    const sim = new Simulation();
    sim.addAutomaton("Main", undefined, "FA");
    return sim;
  });

  /* ─── Modal state ─── */
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "info";
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    variant: "danger",
    confirmLabel: "Confirm",
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- replaced when modal opens
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "success" | "error" | "info";
  }>({ open: false, title: "", description: "", variant: "info" });

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFormalDef, setShowFormalDef] = useState(false);
  const [showPowerClass, setShowPowerClass] = useState(false);
  const [regexResult, setRegexResult] = useState<{ open: boolean; regex: string }>({ open: false, regex: "" });
  const [theme, setTheme] = useState<ThemeConfig>(modernTheme);

  /* ─── Sub-automaton picker state ─── */
  const [callStatePickerOpen, setCallStatePickerOpen] = useState(false);
  const [callStateTargetNodeView, setCallStateTargetNodeView] = useState<NodeView | null>(null);

  /* ─── Text input prompt state (for regex, definition, LaTeX import) ─── */
  const [textPrompt, setTextPrompt] = useState<{
    open: boolean;
    title: string;
    placeholder: string;
    confirmLabel: string;
    value: string;
    onConfirm: (value: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- replaced when modal opens
  }>({ open: false, title: "", placeholder: "", confirmLabel: "OK", value: "", onConfirm: () => {} });

  const promptTextInput = useCallback(
    (opts: { title: string; placeholder: string; confirmLabel: string; onConfirm: (value: string) => void }) => {
      setTextPrompt({
        open: true,
        title: opts.title,
        placeholder: opts.placeholder,
        confirmLabel: opts.confirmLabel,
        value: "",
        onConfirm: opts.onConfirm,
      });
    },
    [],
  );

  /* ─── Confirm / alert helpers ─── */
  const showConfirm = useCallback(
    (opts: {
      title: string;
      description: string;
      variant?: "danger" | "warning" | "info";
      confirmLabel?: string;
      onConfirm: () => void;
    }) => {
      setConfirmModal({
        open: true,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? "danger",
        confirmLabel: opts.confirmLabel ?? "Confirm",
        onConfirm: opts.onConfirm,
      });
    },
    [],
  );

  const showAlert = useCallback((opts: { title: string; description: string; variant?: "success" | "error" | "info" }) => {
    setAlertModal({ open: true, title: opts.title, description: opts.description, variant: opts.variant ?? "info" });
  }, []);

  /*
   * Canvas dimensions need the active controller, and the tab management hook
   * needs canvas dimensions for viewport initialisation.  We break the
   * circular dependency by using a stable ref for the initial dimensions.
   */
  const dimsRef = useRef({ width: 800, height: 600 });

  /* ─── Tab management hook ─── */
  const tabs = useTabManagement(simulation, dimsRef.current, showConfirm);
  const { controller } = tabs;

  const [canvasDimensions, canvasContainerRef] = useCanvasDimensions(controller);
  dimsRef.current = canvasDimensions;

  const containerRef = useRef<HTMLDivElement>(null);

  /* ─── Sub-automaton resolver ─── */
  const createResolver = useCallback(() => simulation.createGraphResolver(), [simulation]);

  /* ─── Test inputs hook ─── */
  const testing = useTestInputs(controller, createResolver);

  /* ─── Keyboard shortcuts ─── */
  useKeyboardShortcuts({ commandPaletteOpen, setCommandPaletteOpen, setShowShortcuts });

  /* ─── Wire up sub-automaton call state request callback ─── */
  useEffect(() => {
    controller.onSetCallStateRequest = (nodeView: NodeView) => {
      setCallStateTargetNodeView(nodeView);
      setCallStatePickerOpen(true);
    };
    controller.getAutomatonName = (automatonId: string) => simulation.getEntry(automatonId)?.name;
  }, [controller, simulation]);

  /* ─── Board update listener ─── */
  useEffect(() => {
    const prev = controller.onBoardUpdateFn;
    controller.onBoardUpdateFn = () => {
      if (prev) prev();
      tabs.forceUpdate();
      tabs.syncUIFromController(controller);
    };
  }, [controller, tabs]);

  /* ─── Derived state ─── */
  const { entries, activeId, activeEntry, graphType, deterministic, graphString, isValid, nodeCount, edgeCount } = tabs;
  const isTM = graphType === "TM";
  const compatibleEntries = entries.filter((e) => e.id !== activeId && e.graphType === graphType && e.controller.graph.isValid());

  /* ─── Command palette commands ─── */
  const commands = useSimulatorCommands({
    controller,
    graphType,
    deterministic,
    isValid,
    canvasDimensions,
    theme,
    compatibleEntries,
    activeEntryName: activeEntry?.name,
    setTheme,
    toggleDeterministic: tabs.toggleDeterministic,
    handleAddAutomaton: tabs.handleAddAutomaton,
    addResultAndSwitch: tabs.addResultAndSwitch,
    setShowFormalDef,
    setShowPowerClass,
    setCommandPaletteOpen: (v: boolean) => setCommandPaletteOpen(v),
    setShowShortcuts: (v: boolean) => setShowShortcuts(v),
    showConfirm,
    showAlert,
    showRegexResult: (regex: string) => setRegexResult({ open: true, regex }),
    forceUpdate: tabs.forceUpdate,
    containerRef,
    promptTextInput,
  });

  /* ─── Sub-automaton picker entries ─── */
  const pickerEntries: PickerEntry[] = entries
    .filter((e) => e.id !== activeId)
    .map((e) => ({
      id: e.id,
      name: e.name,
      graphType: e.graphType,
      nodeCount: e.controller.views.nodes.length,
      edgeCount: e.controller.views.edges.length,
    }));

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div className="mt-[62px] flex h-[calc(100vh-62px)] flex-col">
      {/* ─── Modals ─── */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((m) => ({ ...m, open: false }));
        }}
        onCancel={() => setConfirmModal((m) => ({ ...m, open: false }))}
      />
      <AlertModal
        open={alertModal.open}
        title={alertModal.title}
        description={alertModal.description}
        variant={alertModal.variant}
        onClose={() => setAlertModal((m) => ({ ...m, open: false }))}
      />
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} commands={commands} />
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <FormalDefinitionModal
        open={showFormalDef}
        graphString={entries.some((e) => e.controller.graph.hasCallStates()) ? simulation.toRSMString(activeId ?? undefined) : graphString}
        onClose={() => setShowFormalDef(false)}
      />
      {(() => {
        const pc = activeId
          ? simulation.getComputationalPowerClassForEntry(activeId)
          : { className: "Empty", chomskyType: -1, description: "" };
        return (
          <PowerClassModal
            open={showPowerClass}
            className={pc.className}
            chomskyType={pc.chomskyType}
            description={pc.description}
            onClose={() => setShowPowerClass(false)}
          />
        );
      })()}
      <FormalDefinitionModal
        open={regexResult.open}
        title="Regular Expression"
        graphString={regexResult.regex}
        onClose={() => setRegexResult({ open: false, regex: "" })}
      />
      <SubAutomatonPickerModal
        open={callStatePickerOpen}
        targetNodeView={callStateTargetNodeView}
        entries={pickerEntries}
        onSelect={(entry, callMode) => {
          if (callStateTargetNodeView) {
            callStateTargetNodeView.model.callConfig = {
              targetAutomatonId: entry.id,
              callMode,
            };
            callStateTargetNodeView.updateEdgeVisualizationPaths();
            controller.views.update();
          }
          setCallStatePickerOpen(false);
          setCallStateTargetNodeView(null);
        }}
        onClose={() => setCallStatePickerOpen(false)}
      />

      {/* ─── Text Input Prompt Modal ─── */}
      {textPrompt.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setTextPrompt((p) => ({ ...p, open: false }))} />
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="relative mx-4 w-full max-w-lg animate-[fade-in_150ms_ease-out] rounded-xl border border-zinc-300 bg-zinc-50 p-6 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">{textPrompt.title}</h3>
            <textarea
              className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              rows={4}
              placeholder={textPrompt.placeholder}
              value={textPrompt.value}
              onChange={(e) => setTextPrompt((p) => ({ ...p, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  textPrompt.onConfirm(textPrompt.value);
                  setTextPrompt((p) => ({ ...p, open: false }));
                }
              }}
              ref={(el) => el?.focus()}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setTextPrompt((p) => ({ ...p, open: false }))}
                className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-300/60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  textPrompt.onConfirm(textPrompt.value);
                  setTextPrompt((p) => ({ ...p, open: false }));
                }}
                className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {textPrompt.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ROW 1: Action Toolbar ═══ */}
      <div className="bg-header-bg dark:border-primary flex items-center gap-1 border-b px-3 py-1.5">
        <MenuBar>
          <ToolbarDropdown label="File" width={220}>
            <ToolbarSection label="New Automaton" withBorder={false} />
            <ToolbarItem label="Finite Automaton (FA)" onClick={() => tabs.handleAddAutomaton("FA")} />
            <ToolbarItem label="Pushdown Automaton (PDA)" onClick={() => tabs.handleAddAutomaton("PDA")} />
            <ToolbarItem label="Turing Machine (TM)" onClick={() => tabs.handleAddAutomaton("TM")} />
            <ToolbarSection label="Export" />
            <ToolbarItem
              label="Export Formal Definition"
              onClick={() => {
                if (entries.some((e) => e.controller.graph.hasCallStates())) {
                  // RSM mode: download the full RSM tuple
                  const rsmStr = simulation.toRSMString(activeId ?? undefined);
                  // eslint-disable-next-line @typescript-eslint/no-deprecated
                  const dataUri = "data:text/plain;base64," + btoa(unescape(encodeURIComponent(rsmStr)));
                  const a = document.createElement("a");
                  a.download = "rsm-definition.txt";
                  a.href = dataUri;
                  a.click();
                } else {
                  exportToDefinition(controller);
                }
              }}
            />
            <ToolbarItem label="Export LaTeX (TikZ)" onClick={() => exportToLaTeX(controller)} />
            <ToolbarItem
              label="Export PNG Image"
              onClick={() => {
                const svgEl = containerRef.current?.querySelector("svg");
                if (svgEl) exportToPNG(controller, svgEl);
              }}
            />

            <ToolbarSection label="Import" />
            <ToolbarItem
              label="Import from Formal Definition"
              onClick={() => {
                const cmd = commands.find((c) => c.id === "import-definition");
                if (cmd) cmd.action();
              }}
            />
            <ToolbarItem
              label="Import from LaTeX"
              onClick={() => {
                const cmd = commands.find((c) => c.id === "import-latex");
                if (cmd) cmd.action();
              }}
            />
            {graphType === "FA" && (
              <ToolbarItem
                label="Import from Regex"
                onClick={() => {
                  const cmd = commands.find((c) => c.id === "regex-to-nfa");
                  if (cmd) cmd.action();
                }}
              />
            )}
          </ToolbarDropdown>

          <ToolbarDropdown label="Edit" width={240}>
            <ToolbarItem
              label="Undo"
              shortcut="⌘Z"
              onClick={() => {
                controller.history.undo();
                tabs.forceUpdate();
              }}
            />
            <ToolbarItem
              label="Redo"
              shortcut="⌘⇧Z"
              onClick={() => {
                controller.history.redo();
                tabs.forceUpdate();
              }}
            />
            <ToolbarSection label="Graph" />
            <ToolbarItem label="Re-index Node Labels" onClick={() => controller.reindexNodeNames()} />
            <ToolbarItem
              label="Remove Unreachable States"
              disabled={!isValid}
              onClick={() =>
                showConfirm({
                  title: "Remove Unreachable States",
                  description: "This will permanently delete all states not reachable from the initial state.",
                  variant: "warning",
                  confirmLabel: "Remove",
                  onConfirm: () => {
                    removeUnreachableStates(controller);
                    tabs.forceUpdate();
                  },
                })
              }
            />
            {graphType === "FA" && !deterministic && (
              <ToolbarItem
                label="Convert NFA → DFA"
                disabled={!isValid}
                onClick={() => {
                  const dfaCtrl = convertNFAtoDFA(controller);
                  if (dfaCtrl) tabs.addResultAndSwitch(`DFA of ${activeEntry?.name}`, dfaCtrl);
                }}
              />
            )}
          </ToolbarDropdown>

          <ToolbarDropdown label="View" width={200}>
            <ToolbarSection label="Mode" withBorder={false} />
            <ToolbarItem
              label="Draw"
              shortcut="D"
              active={controller.state.mode === BoardMode.DRAW}
              onClick={() => {
                controller.setMode(BoardMode.DRAW);
                tabs.forceUpdate();
              }}
            />
            <ToolbarItem
              label="Move"
              shortcut="M"
              active={controller.state.mode === BoardMode.MOVE}
              onClick={() => {
                controller.setMode(BoardMode.MOVE);
                tabs.forceUpdate();
              }}
            />
            <ToolbarItem
              label="Erase"
              shortcut="E"
              active={controller.state.mode === BoardMode.ERASE}
              onClick={() => {
                controller.setMode(BoardMode.ERASE);
                tabs.forceUpdate();
              }}
            />
            <ToolbarSection label="Canvas" />
            <ToolbarItem label="Zoom to Fit" onClick={() => controller.zoomToFit(canvasDimensions.width, canvasDimensions.height)} />
            <ToolbarItem label="Reset View" onClick={() => controller.resetView(canvasDimensions.width, canvasDimensions.height)} />
            <ToolbarItem
              label={controller.settings.grid ? "Hide Grid" : "Show Grid"}
              onClick={() => {
                controller.settings.grid = !controller.settings.grid;
                controller.views.update();
              }}
            />{" "}
            <ToolbarItem label="Show Formal Definition" onClick={() => setShowFormalDef(true)} />
            {graphType === "FA" && (
              <ToolbarItem
                label="Show FA as Regex"
                disabled={!isValid}
                onClick={() => {
                  const cmd = commands.find((c) => c.id === "dfa-to-regex");
                  if (cmd) cmd.action();
                }}
              />
            )}
            <ToolbarSection label="Labels" />
            <ToolbarItem
              label="Upright Labels"
              active={controller.settings.transitionStyle === TransitionStyle.UPRIGHT}
              onClick={() => {
                controller.settings.transitionStyle = TransitionStyle.UPRIGHT;
                controller.views.update();
              }}
            />
            <ToolbarItem
              label="Perpendicular Labels"
              active={controller.settings.transitionStyle === TransitionStyle.PERPENDICULAR}
              onClick={() => {
                controller.settings.transitionStyle = TransitionStyle.PERPENDICULAR;
                controller.views.update();
              }}
            />
            <ToolbarSection label="Theme" />
            <ToolbarItem
              label="Modern"
              active={theme.name === "modern"}
              onClick={() => {
                setTheme(modernTheme);
                tabs.forceUpdate();
              }}
            />
            <ToolbarItem
              label="Classic"
              active={theme.name === "classic"}
              onClick={() => {
                setTheme(classicTheme);
                tabs.forceUpdate();
              }}
            />
          </ToolbarDropdown>

          <ToolbarDropdown label="Help" width={220}>
            <ToolbarItem label="Commands" shortcut="⌘K" onClick={() => setCommandPaletteOpen(true)} />
            <ToolbarItem label="Keyboard Shortcuts" shortcut="?" onClick={() => setShowShortcuts(true)} />
          </ToolbarDropdown>
        </MenuBar>

        <ToolbarSeparator />

        {/* View action icons */}
        <div className="flex items-center gap-0.5">
          <ToolbarIconButton
            icon={deterministic ? <Icons.Deterministic /> : <Icons.NonDeterministic />}
            label={deterministic ? "Switch to Non-deterministic" : "Switch to Deterministic"}
            onClick={() => tabs.toggleDeterministic(!deterministic)}
          />
          <ToolbarIconButton
            icon={controller.settings.grid ? <Icons.GridOn /> : <Icons.GridOff />}
            label={controller.settings.grid ? "Hide Grid" : "Show Grid"}
            onClick={() => {
              controller.settings.grid = !controller.settings.grid;
              controller.views.update();
            }}
          />
          <ToolbarIconButton
            icon={<Icons.ZoomFit />}
            label="Zoom to Fit"
            onClick={() => controller.zoomToFit(canvasDimensions.width, canvasDimensions.height)}
          />
          <ToolbarIconButton
            icon={<Icons.ResetView />}
            label="Reset View"
            onClick={() => controller.resetView(canvasDimensions.width, canvasDimensions.height)}
          />
        </div>

        <ToolbarSeparator />

        {/* Layout action icons */}
        <div className="flex items-center gap-0.5">
          <ToolbarIconButton
            icon={<Icons.LayoutCircle />}
            label="Circle Layout"
            onClick={() => circleLayout(controller, canvasDimensions.width, canvasDimensions.height)}
          />
          <ToolbarIconButton icon={<Icons.LayoutTree />} label="Tree Layout" onClick={() => treeLayout(controller)} />
          <ToolbarIconButton
            icon={<Icons.LayoutForce />}
            label="Force-Directed Layout"
            onClick={() => forceDirectedLayout(controller, canvasDimensions.width, canvasDimensions.height)}
          />
          <ToolbarIconButton icon={<Icons.AlignGrid />} label="Align to Grid" onClick={() => alignToGrid(controller)} />
        </div>

        <ToolbarSeparator />

        {/* Power class badge (clickable → opens modal) */}
        {entries.length > 0 &&
          (() => {
            const pc = activeId
              ? simulation.getComputationalPowerClassForEntry(activeId)
              : { className: "Empty", chomskyType: -1, description: "" };
            const pcBg =
              pc.chomskyType === 3
                ? "bg-blue-600/10 text-blue-600 hover:bg-blue-600/20"
                : pc.chomskyType === 2
                  ? "bg-violet-600/10 text-violet-600 hover:bg-violet-600/20"
                  : pc.chomskyType === 0
                    ? "bg-red-600/10 text-red-600 hover:bg-red-600/20"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200";
            return (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <span
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${pcBg}`}
                title="Click to view computational power class details"
                onClick={() => setShowPowerClass(true)}
              >
                {/*<span className={`inline-block h-1.5 w-1.5 rounded-full ${pcDot}`} />*/}
                {pc.className}
              </span>
            );
          })()}
        {/* Status indicator */}
        <div className="flex items-center gap-2 px-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${isValid ? "bg-green-600/10 text-green-600" : "bg-orange-600/10 text-orange-600"}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isValid ? "bg-green-600" : "bg-orange-600"}`} />
            {isValid ? "Valid" : "Invalid"}
          </span>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
            {nodeCount} {nodeCount === 1 ? "Node" : "Nodes"} · {edgeCount} {edgeCount === 1 ? "Edge" : "Edges"}
          </span>

          {/* Cycle detection */}
          {simulation.detectCycles().length > 0 && (
            <span
              className="inline-flex items-center rounded-full bg-amber-600/10 px-2 py-0.5 text-[10px] font-medium text-amber-600"
              title="Recursive call chains detected in the RSM system"
            >
              ↻ Recursive
            </span>
          )}
        </div>
      </div>

      {/* ═══ ROW 2: Tab Bar ═══ */}
      <div className="bg-header-bg flex items-center border-b border-zinc-300 p-1 px-3 dark:border-zinc-600/50">
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto px-1 py-1">
          {entries.map((entry) => {
            const isActive = entry.id === activeId;
            const typeColor = TYPE_COLORS[entry.graphType] ?? "bg-zinc-100 text-zinc-600";
            const hasContent = entry.controller.views.nodes.length > 0 || entry.controller.views.edges.length > 0;
            const hasCallStates = entry.controller.graph.hasCallStates();
            const hasBrokenRefs = hasCallStates && !entry.controller.graph.validateCallStates(simulation.createGraphResolver());

            return (
              <div
                key={entry.id}
                role="tab"
                tabIndex={0}
                className={`group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-all ${
                  isActive
                    ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-300/60 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600/60"
                    : "text-zinc-600 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                }`}
                onClick={() => tabs.handleSwitchAutomaton(entry.id)}
                onDoubleClick={() => tabs.startEditingTab(entry.id, entry.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    tabs.handleSwitchAutomaton(entry.id);
                  }
                }}
              >
                {/* Type badge */}
                <span className={`inline-flex h-5 items-center rounded px-1.5 text-[9px] font-bold tracking-wide ${typeColor}`}>
                  {entry.graphType}
                </span>

                {/* RSM indicators */}
                {hasCallStates && !hasBrokenRefs && (
                  <span
                    className="inline-flex h-4 items-center rounded bg-violet-100 px-1 text-[8px] font-bold text-violet-600 dark:bg-violet-800/30 dark:text-violet-400"
                    title="Contains call states (RSM)"
                  >
                    □
                  </span>
                )}
                {hasBrokenRefs && (
                  <span
                    className="inline-flex h-4 items-center rounded bg-red-100 px-1 text-[8px] font-bold text-red-600 dark:bg-red-800/30 dark:text-red-400"
                    title="Broken call state reference"
                  >
                    □⚠
                  </span>
                )}

                {/* Name (editable on double-click) */}
                {tabs.editingTabId === entry.id ? (
                  <input
                    type="text"
                    value={tabs.editingTabName}
                    onChange={(e) => tabs.setEditingTabName(e.target.value)}
                    onBlur={tabs.finishEditingTab}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") tabs.finishEditingTab();
                      if (e.key === "Escape") tabs.startEditingTab("", "");
                    }}
                    className="w-24 rounded border border-zinc-300 bg-white px-1.5 py-0 text-[13px] outline-none dark:border-zinc-600 dark:bg-zinc-800"
                    ref={(el) => el?.focus()}
                  />
                ) : (
                  <span className="max-w-[120px] truncate">{entry.name}</span>
                )}

                {/* Content indicator */}
                {hasContent && isActive && (
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-600 dark:bg-zinc-300" title="Has content" />
                )}

                {/* Close button */}
                {simulation.size > 1 && tabs.editingTabId !== entry.id && (
                  <button
                    className="flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center rounded text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-300 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      tabs.handleRemoveAutomaton(entry.id);
                    }}
                    title="Close tab"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M1 1l6 6M7 1l-6 6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* New tab button */}
        <div className="flex-shrink-0 py-1">
          <NewTabDropdown onSelect={tabs.handleAddAutomaton} />
        </div>
      </div>

      {/* ═══ Canvas Area ═══ */}
      <div className="relative min-h-0 flex-1" ref={canvasContainerRef}>
        <ThemeProvider theme={theme} overrides={isDarkMode ? DARK_MODE_OVERRIDES : undefined}>
          <div
            ref={containerRef}
            className="h-full w-full"
            style={{ position: "relative" }}
            role="presentation"
            onMouseDown={() => {
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            }}
          >
            <ModeSelector controller={controller} hidden />
            <Canvas controller={controller} width={canvasDimensions.width} height={canvasDimensions.height} />
            <ContextMenu controller={controller} containerRef={containerRef} />
          </div>
        </ThemeProvider>

        {/* Floating Panel: Step Simulation */}
        <SimulationPanel
          controller={controller}
          onUpdate={tabs.forceUpdate}
          resolver={createResolver()}
          getAutomatonName={(automatonId) => simulation.getEntry(automatonId)?.name}
        />

        {/* Floating Panel: Quick Testing */}
        <FloatingPanel
          title="Quick Testing"
          defaultPosition={{ x: 16, y: 16 }}
          defaultExpanded={false}
          width={320}
          headerExtra={
            testing.testInputs.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  {testing.acceptedCount}
                </span>
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {testing.rejectedCount}
                </span>
                {testing.errorCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {testing.errorCount} err
                  </span>
                )}
              </div>
            ) : undefined
          }
        >
          <div className="space-y-1.5">
            {testing.testInputs.map((input, idx) => (
              <TestInputRow
                key={idx}
                value={input}
                result={!isValid ? { accepted: null, error: "Invalid graph", output: "" } : testing.testResults[idx]}
                isTM={isTM}
                invalidGraph={!isValid}
                onChange={(v) => testing.updateTestInput(idx, v)}
                onRemove={() => testing.removeTestInput(idx)}
                onAddAfter={() => testing.addTestInputAfter(idx)}
                inputRef={(el) => {
                  testing.testInputRefs.current[idx] = el;
                }}
              />
            ))}
          </div>

          {testing.testInputs.length === 0 ? (
            <button
              onClick={testing.addTestInput}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-3 text-xs text-zinc-600 transition-colors hover:border-zinc-600 hover:bg-zinc-100 hover:text-zinc-600 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
            >
              <PlusIcon /> Add test input
            </button>
          ) : (
            <PanelRow align="between">
              <button
                onClick={testing.addTestInput}
                className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-300 hover:text-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
              >
                <PlusIcon /> Add
              </button>
              {testing.testInputs.length > 1 && (
                <button
                  onClick={testing.clearAllTests}
                  className="cursor-pointer rounded-md px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  Clear all
                </button>
              )}
            </PanelRow>
          )}
        </FloatingPanel>
      </div>
    </div>
  );
};
