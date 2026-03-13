/* eslint-disable @typescript-eslint/no-non-null-assertion -- Ooooh Map and Queue this time :D */
import type { Edge } from "../../model/edge";
import type { IGraph } from "../../model/graphs/abstract-graph";
import { FAGraph } from "../../model/graphs/fa-graph";
import { MachineTypeRegistry } from "../../model/machines/registry";
import type { Node } from "../../model/node";
import { EPSILON } from "../../model/symbols";
import { CharacterTransition } from "../../model/transitions";
import { Controller } from "../controller";
import { convertNFAtoDFA } from "./conversion-tools";
import { circleLayout } from "./layout-tools";

/**
 * The type of cross-product operation to perform.
 */
export type CrossProductOperation = "union" | "intersection" | "difference";

/**
 * Ensures a controller has a DFA graph. If the graph is already a DFA,
 * returns the same controller. If it's an NFA, converts it to a DFA first.
 */
function ensureDFA(controller: Controller): Controller | null {
  const graph = controller.graph;
  if (graph.shortName !== "FA") return null;

  const faGraph = graph as FAGraph;
  if (faGraph.deterministic) return controller;

  // Convert NFA to DFA
  return convertNFAtoDFA(controller);
}

/**
 * Builds a transition map from a DFA graph: nodeHash → Map<symbol, targetNodeHash>
 * For a DFA, each (state, symbol) pair maps to exactly one target state.
 */
function buildDFATransitionMap(graph: FAGraph): {
  map: Map<string, Map<string, string>>;
  alphabet: Set<string>;
  nodeMap: Map<string, Node>;
} {
  const map = new Map<string, Map<string, string>>();
  const alphabet = new Set<string>();
  const nodeMap = new Map<string, Node>();

  graph.getNodes().items.forEach((node: Node) => {
    nodeMap.set(node.hashCode(), node);
    const transitions = new Map<string, string>();

    node.toEdges.items.forEach((edge: Edge) => {
      const ch = (edge.transition as CharacterTransition).character;
      if (ch !== EPSILON && ch !== "") {
        alphabet.add(ch);
        if (!transitions.has(ch)) {
          transitions.set(ch, edge.to.hashCode());
        }
      }
    });

    map.set(node.hashCode(), transitions);
  });

  return { map, alphabet, nodeMap };
}

/**
 * Computes the cross product of two finite automata.
 *
 * Both inputs are first converted to DFAs (if not already), then the standard
 * cross product construction is applied. This is the academically standard approach.
 *
 * The combined alphabet is the union of both DFAs' alphabets. States that lack
 * transitions for a symbol are treated as going to a trap (non-accepting) state.
 *
 * The accepting condition depends on the operation:
 * - **union**: accept if either q1 or q2 is accepting
 * - **intersection**: accept if both q1 and q2 are accepting
 * - **difference**: accept if q1 is accepting and q2 is not
 *
 * Returns a new Controller with the product DFA, or null if not applicable.
 */
export function crossProduct(controllerA: Controller, controllerB: Controller, operation: CrossProductOperation): Controller | null {
  // Convert both to DFA first (standard academic approach)
  const dfaA = ensureDFA(controllerA);
  const dfaB = ensureDFA(controllerB);
  if (!dfaA || !dfaB) return null;

  const graphA = dfaA.graph as FAGraph;
  const graphB = dfaB.graph as FAGraph;

  const initialA = graphA.getInitialNode();
  const initialB = graphB.getInitialNode();
  if (!initialA || !initialB) return null;

  const isFinal: (a: boolean, b: boolean) => boolean =
    operation === "union" ? (a, b) => a || b : operation === "intersection" ? (a, b) => a && b : (a, b) => a && !b;

  // Build transition maps
  const { map: transA, alphabet: alphaA, nodeMap: nodeMapA } = buildDFATransitionMap(graphA);
  const { map: transB, alphabet: alphaB, nodeMap: nodeMapB } = buildDFATransitionMap(graphB);

  // Combined alphabet
  const combinedAlphabet = new Set([...alphaA, ...alphaB]);
  if (combinedAlphabet.size === 0) return null;

  // Trap state identifier (non-accepting sink state)
  const TRAP = "__TRAP__";

  // Build the product DFA via BFS
  const productGraph = new FAGraph(true); // Result is always a DFA
  const productNodeMap = new Map<string, Node>();
  const visited = new Set<string>();

  const getKey = (hashA: string, hashB: string): string => `${hashA}|${hashB}`;

  const getOrCreateNode = (hashA: string, hashB: string): Node => {
    const key = getKey(hashA, hashB);
    if (productNodeMap.has(key)) return productNodeMap.get(key)!;

    const labelA = hashA === TRAP ? "trap" : (nodeMapA.get(hashA)?.label ?? "?");
    const labelB = hashB === TRAP ? "trap" : (nodeMapB.get(hashB)?.label ?? "?");
    const name = `(${labelA},${labelB})`;

    const isInitial = hashA === initialA.hashCode() && hashB === initialB.hashCode();
    const aIsFinal = hashA !== TRAP && (nodeMapA.get(hashA)?.final ?? false);
    const bIsFinal = hashB !== TRAP && (nodeMapB.get(hashB)?.final ?? false);

    const node = productGraph.addNode(name, {
      initial: isInitial,
      final: isFinal(aIsFinal, bIsFinal),
    });
    productNodeMap.set(key, node);
    return node;
  };

  // Start BFS from the initial product state
  const startA = initialA.hashCode();
  const startB = initialB.hashCode();
  getOrCreateNode(startA, startB);

  const queue: { hashA: string; hashB: string }[] = [{ hashA: startA, hashB: startB }];

  while (queue.length > 0) {
    const { hashA, hashB } = queue.shift()!;
    const key = getKey(hashA, hashB);
    if (visited.has(key)) continue;
    visited.add(key);

    const fromNode = productNodeMap.get(key)!;
    const transitionsA = hashA === TRAP ? new Map<string, string>() : (transA.get(hashA) ?? new Map<string, string>());
    const transitionsB = hashB === TRAP ? new Map<string, string>() : (transB.get(hashB) ?? new Map<string, string>());

    for (const symbol of combinedAlphabet) {
      const nextA = transitionsA.get(symbol) ?? TRAP;
      const nextB = transitionsB.get(symbol) ?? TRAP;

      const toNode = getOrCreateNode(nextA, nextB);
      productGraph.addEdge(fromNode, toNode, new CharacterTransition(symbol));

      const toKey = getKey(nextA, nextB);
      if (!visited.has(toKey)) {
        queue.push({ hashA: nextA, hashB: nextB });
      }
    }
  }

  const productController = new Controller(productGraph);
  circleLayout(productController);

  return productController;
}

/**
 * Tests whether two finite automata are equivalent (recognize the same language).
 *
 * Both inputs are first converted to DFAs (standard academic approach),
 * then uses BFS through state pairs checking for distinguishability.
 *
 * Returns true if the automata are equivalent, false otherwise.
 * Returns null if the test is not applicable (e.g., non-FA graphs or missing initial states).
 */
export function testEquivalence(controllerA: Controller, controllerB: Controller): boolean | null {
  // Convert both to DFA first
  const dfaA = ensureDFA(controllerA);
  const dfaB = ensureDFA(controllerB);
  if (!dfaA || !dfaB) return null;

  const graphA = dfaA.graph as FAGraph;
  const graphB = dfaB.graph as FAGraph;

  const initialA = graphA.getInitialNode();
  const initialB = graphB.getInitialNode();
  if (!initialA || !initialB) return null;

  const { map: mapA, alphabet: alphaA } = buildDFATransitionMap(graphA);
  const { map: mapB, alphabet: alphaB } = buildDFATransitionMap(graphB);

  // Build final state sets
  const finalA = new Set<string>();
  const finalB = new Set<string>();
  graphA.getNodes().items.forEach((n: Node) => {
    if (n.final) finalA.add(n.hashCode());
  });
  graphB.getNodes().items.forEach((n: Node) => {
    if (n.final) finalB.add(n.hashCode());
  });

  // Combined alphabet — if different, they can't be equivalent
  // (unless one accepts ε and the other doesn't, but with different alphabets
  // the languages are over different alphabets and thus not comparable)
  const combinedAlphabet = new Set([...alphaA, ...alphaB]);

  const TRAP = "__TRAP__";

  const visited = new Set<string>();
  const initialPair = `${initialA.hashCode()}|${initialB.hashCode()}`;
  const queue: string[] = [initialPair];

  while (queue.length > 0) {
    const pair = queue.shift()!;
    if (visited.has(pair)) continue;
    visited.add(pair);

    const [hashA, hashB] = pair.split("|");

    // Check distinguishability
    const aIsFinal = hashA !== TRAP && finalA.has(hashA);
    const bIsFinal = hashB !== TRAP && finalB.has(hashB);
    if (aIsFinal !== bIsFinal) return false;

    // Follow transitions for each symbol in the combined alphabet
    for (const ch of combinedAlphabet) {
      const nextA = hashA === TRAP ? TRAP : (mapA.get(hashA)?.get(ch) ?? TRAP);
      const nextB = hashB === TRAP ? TRAP : (mapB.get(hashB)?.get(ch) ?? TRAP);
      const nextPair = `${nextA}|${nextB}`;

      if (!visited.has(nextPair)) {
        queue.push(nextPair);
      }
    }
  }

  return true;
}

/**
 * Constructs the union of two automata using the ε-transition construction.
 *
 * Creates a new automaton with a fresh initial state that has ε-transitions
 * to both input automata's initial states. All states and transitions from
 * both automata are copied into the result. The final states are the union
 * of both automata's final states.
 *
 * This construction works for:
 * - FA (NFA union — produces an NFA)
 * - PDA (context-free languages are closed under union)
 * - TM (recursively enumerable languages are closed under union)
 *
 * The result is always non-deterministic.
 *
 * Returns a new Controller with the union automaton, or null if not applicable.
 */
export function unionViaEpsilon(controllerA: Controller, controllerB: Controller): Controller | null {
  const graphA = controllerA.graph;
  const graphB = controllerB.graph;

  // Both must be the same type
  if (graphA.shortName !== graphB.shortName) return null;

  const initialA = graphA.getInitialNode();
  const initialB = graphB.getInitialNode();
  if (!initialA || !initialB) return null;

  // Create a new graph of the same type (always non-deterministic).
  // Uses the MachineTypeRegistry to avoid a triple switch — this enables
  // extensibility: registering a new machine type automatically makes
  // union-via-epsilon available for that type.
  const graphType = graphA.shortName;
  const machineType = MachineTypeRegistry.get(graphType);
  const unionGraph: IGraph = machineType ? machineType.createGraph(false) : new FAGraph(false);

  // Node mapping: old hash → new node in union graph
  const nodeMap = new Map<string, Node>();

  // Helper to get the empty transition character for this graph type
  const emptyChar = unionGraph.getEmptyTransitionCharacter();

  // Copy all nodes from graph A (with prefix to avoid label collisions)
  let stateCounter = 0;
  graphA.getNodes().items.forEach((node: Node) => {
    const newNode = unionGraph.addNode(`a${stateCounter}`, {
      initial: false, // We'll set our own initial state
      final: node.final,
    });
    nodeMap.set(node.hashCode(), newNode);
    stateCounter++;
  });

  // Copy all nodes from graph B
  graphB.getNodes().items.forEach((node: Node) => {
    const newNode = unionGraph.addNode(`b${stateCounter}`, {
      initial: false,
      final: node.final,
    });
    nodeMap.set(node.hashCode(), newNode);
    stateCounter++;
  });

  // Copy all edges from graph A
  graphA.getEdges().items.forEach((edge: Edge) => {
    const from = nodeMap.get(edge.from.hashCode());
    const to = nodeMap.get(edge.to.hashCode());
    if (from && to) {
      unionGraph.addEdge(from, to, edge.transition);
    }
  });

  // Copy all edges from graph B
  graphB.getEdges().items.forEach((edge: Edge) => {
    const from = nodeMap.get(edge.from.hashCode());
    const to = nodeMap.get(edge.to.hashCode());
    if (from && to) {
      unionGraph.addEdge(from, to, edge.transition);
    }
  });

  // Create new initial state with ε-transitions to both original initial states
  const newInitial = unionGraph.addNode(`q_start`, { initial: true, final: false });
  const mappedInitialA = nodeMap.get(initialA.hashCode());
  const mappedInitialB = nodeMap.get(initialB.hashCode());

  if (mappedInitialA) {
    const epsilonTransition = unionGraph.createTransitionFromString(emptyChar, false);
    unionGraph.addEdge(newInitial, mappedInitialA, epsilonTransition);
  }
  if (mappedInitialB) {
    const epsilonTransition = unionGraph.createTransitionFromString(emptyChar, false);
    unionGraph.addEdge(newInitial, mappedInitialB, epsilonTransition);
  }

  const resultController = new Controller(unionGraph);
  circleLayout(resultController);

  return resultController;
}
