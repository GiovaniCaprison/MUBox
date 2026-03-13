/* eslint-disable @typescript-eslint/restrict-plus-operands -- Will be using the inverse of this rule going forward as the way which we concat sting literals in the project */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- Classic queue interface + eslint not understanding logical branching - it's okay though */
import type { Edge } from "../../model/edge";
import { FAGraph } from "../../model/graphs/fa-graph";
import type { Node } from "../../model/node";
import { EPSILON } from "../../model/symbols";
import { CharacterTransition } from "../../model/transitions";
import { Controller } from "../controller";
import type { NodeView } from "../views/node-view";

/**
 * Removes all states that are not reachable from the initial state via BFS.
 * Returns the number of states removed.
 */
export function removeUnreachableStates(controller: Controller): number {
  const initialNode = controller.graph.getInitialNode();
  if (!initialNode) return 0;

  // BFS from initial state
  const reachable = new Set<string>();
  const queue: Node[] = [initialNode];
  reachable.add(initialNode.hashCode());

  while (queue.length > 0) {
    const current = queue.shift()!;
    current.toEdges.items.forEach((edge: Edge) => {
      if (!reachable.has(edge.to.hashCode())) {
        reachable.add(edge.to.hashCode());
        queue.push(edge.to);
      }
    });
  }

  // Find unreachable node views
  const unreachableViews: NodeView[] = [];
  controller.views.nodes.forEach((nv) => {
    if (!reachable.has(nv.model.hashCode())) {
      unreachableViews.push(nv);
    }
  });

  // Remove them
  unreachableViews.forEach((nv) => {
    controller.removeNode(nv);
  });

  return unreachableViews.length;
}

/**
 * Converts an NFA to a DFA using the subset construction algorithm.
 * Returns a new Controller with the resulting DFA, or null if not applicable.
 *
 * The original controller is not modified.
 */
export function convertNFAtoDFA(sourceController: Controller): Controller | null {
  const sourceGraph = sourceController.graph;
  if (sourceGraph.shortName !== "FA") return null;

  const initialNode = sourceGraph.getInitialNode();
  if (!initialNode) return null;

  const faGraph = sourceGraph as FAGraph;
  faGraph.updateAlphabet();
  const alphabet = Object.keys(faGraph.alphabet).filter((ch) => ch !== EPSILON && ch !== "");

  if (alphabet.length === 0) return null;

  const getEpsilonClosure = (nodes: Set<Node>): Set<Node> => {
    const closure = new Set<Node>(nodes);
    const queue = [...nodes];
    while (queue.length > 0) {
      const current = queue.shift()!;
      current.toEdges.items.forEach((edge: Edge) => {
        const transition = edge.transition as CharacterTransition;
        if (transition.character === EPSILON || transition.character === "") {
          if (!closure.has(edge.to)) {
            closure.add(edge.to);
            queue.push(edge.to);
          }
        }
      });
    }
    return closure;
  };

  const stateSetToKey = (states: Set<Node>): string => {
    return [...states]
      .map((n) => n.hashCode())
      .sort()
      .join("+");
  };

  const getTransitions = (states: Set<Node>, char: string): Set<Node> => {
    const result = new Set<Node>();
    states.forEach((node) => {
      node.toEdges.items.forEach((edge: Edge) => {
        const transition = edge.transition as CharacterTransition;
        if (transition.character === char) {
          result.add(edge.to);
        }
      });
    });
    return getEpsilonClosure(result);
  };

  // Subset construction
  const initialClosure = getEpsilonClosure(new Set([initialNode]));
  const initialKey = stateSetToKey(initialClosure);

  const dfaStates = new Map<string, { nodes: Set<Node>; isFinal: boolean }>();
  const dfaTransitions: { fromKey: string; toKey: string; char: string }[] = [];
  const queue: { key: string; nodes: Set<Node> }[] = [{ key: initialKey, nodes: initialClosure }];

  dfaStates.set(initialKey, {
    nodes: initialClosure,
    isFinal: [...initialClosure].some((n) => n.final),
  });

  let needsTrapState = false;

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const char of alphabet) {
      const nextNodes = getTransitions(current.nodes, char);
      if (nextNodes.size === 0) {
        dfaTransitions.push({ fromKey: current.key, toKey: "TRAP", char });
        needsTrapState = true;
        continue;
      }

      const nextKey = stateSetToKey(nextNodes);

      if (!dfaStates.has(nextKey)) {
        dfaStates.set(nextKey, {
          nodes: nextNodes,
          isFinal: [...nextNodes].some((n) => n.final),
        });
        queue.push({ key: nextKey, nodes: nextNodes });
      }

      dfaTransitions.push({ fromKey: current.key, toKey: nextKey, char });
    }
  }

  // Build the DFA graph
  const dfaGraph = new FAGraph(true);
  const nodeMap = new Map<string, Node>();

  let stateIndex = 0;
  dfaStates.forEach((state, key) => {
    const node = dfaGraph.addNode("q" + stateIndex, {
      initial: key === initialKey,
      final: state.isFinal,
    });
    nodeMap.set(key, node);
    stateIndex++;
  });

  if (needsTrapState) {
    const trapNode = dfaGraph.addNode("trap");
    nodeMap.set("TRAP", trapNode);
    // Trap state has self-loops for all alphabet symbols
    for (const char of alphabet) {
      dfaGraph.addEdge(trapNode, trapNode, new CharacterTransition(char));
    }
  }

  // Add transitions
  dfaTransitions.forEach((t) => {
    const fromNode = nodeMap.get(t.fromKey);
    const toNode = nodeMap.get(t.toKey);
    if (fromNode && toNode) {
      dfaGraph.addEdge(fromNode, toNode, new CharacterTransition(t.char));
    }
  });

  // Create a new controller with the DFA
  const dfaController = new Controller(dfaGraph);
  return dfaController;
}

/**
 * Builds an NFA from a regular expression using Thompson's construction.
 * Returns a new Controller with the resulting NFA, or null on error.
 *
 * Supported syntax:
 * - Characters: a, b, c, ...
 * - Concatenation: ab
 * - Union: a|b
 * - Kleene star: a*
 * - Kleene plus: a+
 * - Grouping: (ab|c)*
 * - Escape: \| \* \+ \( \)
 */
export function regexToNFA(expression: string): Controller | null {
  if (!expression || expression.length === 0) return null;

  const graph = new FAGraph(false);
  let stateCounter = 0;

  const createState = (isFinal = false): Node => {
    const node = graph.addNode("q" + stateCounter);
    if (isFinal) graph.markFinalNode(node);
    stateCounter++;
    return node;
  };

  const addTransition = (from: Node, to: Node, char: string) => {
    graph.addEdge(from, to, new CharacterTransition(char));
  };

  interface NFAFragment {
    start: Node;
    end: Node;
  }

  const buildNFA = (expr: string): NFAFragment | null => {
    if (expr.length === 0) {
      const s = createState();
      return { start: s, end: s };
    }

    const fragments: NFAFragment[] = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      if (ch === "(") {
        // Find matching closing bracket
        let depth = 1;
        let j = i + 1;
        while (j < expr.length && depth > 0) {
          if (expr[j] === "(") depth++;
          else if (expr[j] === ")") depth--;
          j++;
        }
        if (depth !== 0) return null;

        const subExpr = expr.substring(i + 1, j - 1);
        const subFragment = buildNFA(subExpr);
        if (!subFragment) return null;
        fragments.push(subFragment);
        i = j;
      } else if (ch === "|") {
        // Union: combine everything before | with everything after
        const left = concatenateFragments(fragments);
        if (!left) return null;
        fragments.length = 0;

        const rightExpr = expr.substring(i + 1);
        const right = buildNFA(rightExpr);
        if (!right) return null;

        const start = createState();
        const end = createState();
        addTransition(start, left.start, EPSILON);
        addTransition(start, right.start, EPSILON);
        addTransition(left.end, end, EPSILON);
        addTransition(right.end, end, EPSILON);

        return { start, end };
      } else if (ch === "*" && fragments.length > 0) {
        // Kleene star on last fragment
        const last = fragments.pop()!;
        const start = createState();
        const end = createState();
        addTransition(start, last.start, EPSILON);
        addTransition(start, end, EPSILON);
        addTransition(last.end, last.start, EPSILON);
        addTransition(last.end, end, EPSILON);
        fragments.push({ start, end });
        i++;
      } else if (ch === "+" && fragments.length > 0) {
        // Kleene plus on last fragment
        const last = fragments.pop()!;
        const start = createState();
        const end = createState();
        addTransition(start, last.start, EPSILON);
        addTransition(last.end, last.start, EPSILON);
        addTransition(last.end, end, EPSILON);
        fragments.push({ start, end });
        i++;
      } else if (ch === "\\") {
        // Escaped character
        i++;
        if (i < expr.length) {
          const s = createState();
          const e = createState();
          addTransition(s, e, expr[i]);
          fragments.push({ start: s, end: e });
        }
        i++;
      } else {
        // Regular character
        const s = createState();
        const e = createState();
        addTransition(s, e, ch);
        fragments.push({ start: s, end: e });
        i++;
      }
    }

    return concatenateFragments(fragments);
  };

  const concatenateFragments = (fragments: NFAFragment[]): NFAFragment | null => {
    if (fragments.length === 0) return null;
    if (fragments.length === 1) return fragments[0];

    // Chain fragments with epsilon transitions
    for (let i = 0; i < fragments.length - 1; i++) {
      addTransition(fragments[i].end, fragments[i + 1].start, EPSILON);
    }

    return { start: fragments[0].start, end: fragments[fragments.length - 1].end };
  };

  const result = buildNFA(expression);
  if (!result) return null;

  graph.setInitialNode(result.start);
  graph.markFinalNode(result.end);

  return new Controller(graph);
}
