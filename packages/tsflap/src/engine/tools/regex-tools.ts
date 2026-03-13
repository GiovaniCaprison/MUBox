/* eslint-disable @typescript-eslint/no-unnecessary-condition -- Object is null - member variable does not exist in metadata yet... JS doesn't even know what a number is - everything is a string right!? - I do as I please */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- First the Map, then the Queue, now the Map once again - I will get around to "fixing" this - eslint just can't get it's head around it yet */
import type { IGraph } from "../../model/graphs/abstract-graph";
import { FAGraph } from "../../model/graphs/fa-graph";
import { PDAGraph } from "../../model/graphs/pda-graph";
import { TMGraph } from "../../model/graphs/tm-graph";
import { EPSILON } from "../../model/symbols";
import { CharacterTransition } from "../../model/transitions";
import { Controller } from "../controller";

/**
 * Converts a Finite Automaton (DFA or NFA) to a regular expression using
 * the **state elimination** algorithm.
 *
 * **Algorithm** (Sipser, 2012, Lemma 1.60; Hopcroft & Ullman, 1979, §3.2.2):
 *
 * 1. Add a new start state with an ε-transition to the original start state.
 * 2. Add a new accept state with ε-transitions from all original accept states.
 * 3. Eliminate states one by one (except the new start and accept states).
 *    For each eliminated state q:
 *    - For every pair (qi, qj) where qi has a transition to q and q has a
 *      transition to qj, add/update the transition from qi to qj with the
 *      regex: R(qi,qj) = R(qi,qj) | R(qi,q) · R(q,q)* · R(q,qj)
 * 4. The final regex is the label on the single remaining transition from
 *    the new start state to the new accept state.
 *
 * Returns the regex string, or null if not applicable (non-FA graph, no
 * initial/final states).
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation, Lemma 1.60.
 * @see Hopcroft, J. E., & Ullman, J. D. (1979). Introduction to Automata Theory,
 *      Languages, and Computation. §3.2.2.
 */
export function dfaToRegex(controller: Controller): string | null {
  const graph = controller.graph;
  if (graph.shortName !== "FA") return null;

  const faGraph = graph as FAGraph;
  const initialNode = faGraph.getInitialNode();
  if (!initialNode) return null;
  if (faGraph.getFinalNodes().size === 0) return null;

  // Build the GNFA (Generalized NFA) transition table
  // Map: fromHash -> toHash -> regex string
  const nodes = faGraph.getNodes().items.slice();
  const nodeHashes = nodes.map((n) => n.hashCode());

  // Create virtual start and accept states
  const START = "__START__";
  const ACCEPT = "__ACCEPT__";

  // Initialize transition table
  const trans = new Map<string, Map<string, string>>();
  const allStates = [START, ...nodeHashes, ACCEPT];

  for (const from of allStates) {
    trans.set(from, new Map());
  }

  // Add ε-transition from START to original initial state
  trans.get(START)!.set(initialNode.hashCode(), "");

  // Add ε-transitions from all final states to ACCEPT
  for (const finalNode of faGraph.getFinalNodes().items) {
    setOrUnion(trans, finalNode.hashCode(), ACCEPT, "");
  }

  // Populate transitions from the graph
  for (const edge of faGraph.getEdges().items) {
    const fromHash = edge.from.hashCode();
    const toHash = edge.to.hashCode();
    const ch = (edge.transition as CharacterTransition).character;
    const label = ch === EPSILON ? "" : escapeRegex(ch);
    setOrUnion(trans, fromHash, toHash, label);
  }

  // Eliminate states one by one (all except START and ACCEPT)
  for (const elimHash of nodeHashes) {
    // Get self-loop on the eliminated state
    const selfLoop = trans.get(elimHash)?.get(elimHash) ?? null;
    const selfLoopStar = selfLoop !== null ? star(selfLoop) : null;

    // For every pair (qi, qj) that goes through elimHash
    for (const qi of allStates) {
      if (qi === elimHash) continue;
      const rQiElim = trans.get(qi)?.get(elimHash);
      if (rQiElim === undefined) continue;

      for (const qj of allStates) {
        if (qj === elimHash) continue;
        const rElimQj = trans.get(elimHash)?.get(qj);
        if (rElimQj === undefined) continue;

        // New path: R(qi,q) · R(q,q)* · R(q,qj)
        let newPath: string;
        if (selfLoopStar !== null) {
          newPath = concat(concat(rQiElim, selfLoopStar), rElimQj);
        } else {
          newPath = concat(rQiElim, rElimQj);
        }

        // Union with existing R(qi, qj)
        setOrUnion(trans, qi, qj, newPath);
      }
    }

    // Remove the eliminated state from all transition maps
    trans.delete(elimHash);
    for (const [, innerMap] of trans) {
      innerMap.delete(elimHash);
    }
  }

  // The result is the transition from START to ACCEPT
  const result = trans.get(START)?.get(ACCEPT);
  if (result === undefined || result === null) return "∅"; // empty language

  // Clean up the result
  return result.length === 0 ? "ε" : result;
}

// ─── Regex String Helpers ────────────────────────────────────────────

/** Escape special regex characters in a single symbol */
function escapeRegex(ch: string): string {
  if ("|*+()".includes(ch)) return "\\" + ch;
  return ch;
}

/** Union two regex strings: a|b */
function union(a: string, b: string): string {
  if (a === b) return a;
  // ε (empty string) handling
  if (a.length === 0) return b.length === 0 ? "" : `(${b}|ε)`;
  if (b.length === 0) return `(${a}|ε)`;
  return `(${a}|${b})`;
}

/** Concatenate two regex strings: ab */
function concat(a: string, b: string): string {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  // Wrap in parens if needed for clarity
  const aWrapped = needsParensForConcat(a) ? `(${a})` : a;
  const bWrapped = needsParensForConcat(b) ? `(${b})` : b;
  return aWrapped + bWrapped;
}

/** Kleene star: a* */
function star(a: string): string {
  if (a.length === 0) return ""; // ε* = ε
  if (a.length === 1) return a + "*";
  if (a.endsWith("*")) return a; // (a*)* = a*
  return `(${a})*`;
}

/** Check if a regex string needs parentheses when used in concatenation */
function needsParensForConcat(r: string): boolean {
  if (r.length <= 1) return false;
  // If it contains a top-level | (union), it needs parens
  let depth = 0;
  for (const ch of r) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "|" && depth === 0) return true;
  }
  return false;
}

/** Set or union a transition in the table */
function setOrUnion(trans: Map<string, Map<string, string>>, from: string, to: string, label: string): void {
  const innerMap = trans.get(from);
  if (!innerMap) return;
  const existing = innerMap.get(to);
  if (existing === undefined) {
    innerMap.set(to, label);
  } else {
    innerMap.set(to, union(existing, label));
  }
}

/**
 * Imports a Finite Automaton from a formal definition string.
 *
 * Accepts the format produced by `FAGraph.toString()`:
 * `NFA:({a, b}, {q0, q1}, {(q0, q1, a)}, q0, {q1})`
 *
 * Also accepts a simplified format for quick input:
 * - Lines of the form: `q0 -a-> q1` or `q0 a q1`
 * - Special lines: `initial: q0`, `final: q1, q2`
 *
 * Returns a new Controller with the imported graph, or null on parse failure.
 */
export function importFromDefinition(definition: string, graphType: "FA" | "PDA" | "TM" = "FA"): Controller | null {
  const trimmed = definition.trim();
  if (!trimmed) return null;

  // Try the formal toString() format first
  let graph: IGraph;
  if (graphType === "FA") graph = new FAGraph(false);
  else if (graphType === "PDA") graph = new PDAGraph(false);
  else if (graphType === "TM") graph = new TMGraph(false);
  else return null;

  if (graph.fromString(trimmed)) {
    return new Controller(graph);
  }

  // Formal format failed — return null for now
  // (The existing fromString handles the standard format)
  return null;
}

/**
 * Imports a Finite Automaton from a LaTeX/TikZ representation.
 *
 * Parses a subset of TikZ automata notation commonly used in academic papers:
 * - `\node[state, initial] (q0) {$q_0$};`
 * - `\node[state, accepting] (q1) {$q_1$};`
 * - `\path (q0) edge node {a} (q1);`
 * - `\draw (q0) -- node {a} (q1);`
 *
 * This is a best-effort parser — it handles the most common TikZ automata
 * patterns but may not cover all possible LaTeX formatting variations.
 *
 * Returns a new Controller with the imported graph, or null on parse failure.
 */
export function importFromLaTeX(latex: string): Controller | null {
  const trimmed = latex.trim();
  if (!trimmed) return null;

  const graph = new FAGraph(false);

  // Parse nodes: \node[state, initial, accepting] (name) {label};
  // Also handles: \node[state] (name) at (x,y) {label};
  const nodeRegex = /\\node\s*\[([^\]]*)\]\s*\(([^)]+)\)\s*(?:at\s*\([^)]*\)\s*)?\{([^}]*)\}\s*;/g;
  let match: RegExpExecArray | null;
  const nodeNames = new Map<string, { initial: boolean; final: boolean; label: string }>();

  while ((match = nodeRegex.exec(trimmed)) !== null) {
    const options = match[1].toLowerCase();
    const name = match[2].trim();
    let label = match[3].trim();

    // Strip LaTeX math mode: $q_0$ → q0, $q_{10}$ → q10
    label = label
      .replace(/\$/g, "")
      .replace(/[_^]\{([^}]*)\}/g, "$1")
      .replace(/[_^](.)/g, "$1");
    if (!label) label = name;

    const isInitial = options.includes("initial");
    const isFinal = options.includes("accepting") || options.includes("final");

    nodeNames.set(name, { initial: isInitial, final: isFinal, label });
  }

  if (nodeNames.size === 0) return null;

  // Add nodes to graph
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [name, info] of nodeNames) {
    graph.addNode(info.label, { initial: info.initial, final: info.final });
  }

  // Parse edges: \path (from) edge [options] node {label} (to);
  // Also: \draw[->] (from) -- node {label} (to);
  // Also: \draw[->] (from) edge node {label} (to);
  const edgeRegex =
    /(?:\\path|\\draw)\s*(?:\[[^\]]*\])?\s*\(([^)]+)\)\s*(?:edge|--)\s*(?:\[[^\]]*\])?\s*node\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}\s*\(([^)]+)\)\s*;/g;

  while ((match = edgeRegex.exec(trimmed)) !== null) {
    const fromName = match[1].trim();
    const transLabel = match[2]
      .trim()
      .replace(/\$/g, "")
      .replace(/\\lambda/g, EPSILON)
      .replace(/\\varepsilon/g, EPSILON)
      .replace(/\\epsilon/g, EPSILON);
    const toName = match[3].trim();

    const fromInfo = nodeNames.get(fromName);
    const toInfo = nodeNames.get(toName);
    if (!fromInfo || !toInfo) continue;

    // Handle multiple comma-separated transition labels (e.g., "a, b")
    const labels = transLabel
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    for (const label of labels.length > 0 ? labels : [EPSILON]) {
      try {
        graph.addEdge(fromInfo.label, toInfo.label, label);
      } catch {
        // Skip edges that can't be added (e.g., duplicate nodes)
      }
    }
  }

  if (graph.getNodes().size === 0) return null;

  return new Controller(graph);
}
