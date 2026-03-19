import { Edge } from "../edge";
import { EdgeList } from "../edge-list";
import type { NodeOptions } from "../node";
import { Node } from "../node";
import { NodeList } from "../node-list";
import type { Transition } from "../transitions";

// ─── IGraph Interface ────────────────────────────────────────────────

/**
 * Interface for automaton graph operations.
 *
 * A graph represents the structure of a formal automaton: a directed graph
 * where nodes are states (Q) and edges are transitions (δ). This interface
 * abstracts over all automaton types in the Chomsky hierarchy:
 *
 * - **Type 3 (Regular)**: FAGraph — Finite Automata (DFA/NFA)
 * - **Type 2 (Context-Free)**: PDAGraph — Pushdown Automata
 * - **Type 0 (Recursively Enumerable)**: TMGraph — Turing Machines
 *
 * The interface also supports the **Recursive State Machine** (RSM) extension
 * (Alur & Yannakakis, 2001), where nodes can be designated as **call states**
 * (boxes) that invoke other automata.
 *
 * @see Node for the state representation
 * @see Edge for the transition representation
 * @see CallStateConfig for the sub-automaton invocation mechanism
 */
export interface IGraph {
  /** Short identifier for the automaton type (e.g., "FA", "TM", "PDA"). */
  shortName: string;

  // ─── State (Node) Operations ───
  getNodes(): NodeList;
  getNode(node: Node | string): Node | null;
  hasNode(node: Node | string): boolean;
  addNode(node: Node | string, options?: NodeOptions): Node;
  removeNode(node: Node | string): boolean;

  // ─── Transition (Edge) Operations ───
  getEdges(): EdgeList;
  getEdge(edge: Edge | string): Edge | null;
  hasEdge(edge: Edge | string): boolean;
  addEdge(from: Edge | Node | string, to?: Node | string, transition?: Transition | string, pending?: boolean): Edge;
  removeEdge(edge: Edge | string): boolean;

  // ─── Initial / Final State Management ───
  getInitialNode(): Node | null;
  setInitialNode(node: Node | null): Node | null;
  getFinalNodes(): NodeList;
  markFinalNode(node: Node): Node;
  unmarkFinalNode(node: Node): Node;

  // ─── Alphabet ───
  getAlphabet(): Record<string, boolean>;
  updateAlphabetForEdge(edge: Edge): void;
  updateAlphabet(): void;

  // ─── Serialization ───
  toString(): string;
  fromString(input: string): boolean;

  // ─── Validation ───
  isValid(): boolean;

  // ─── Transition Factory ───
  getEmptyTransitionCharacter(): string;
  createTransitionFromString(transition: string, pending: boolean): Transition;

  // ─── RSM (Recursive State Machine) ───
  getCallStates(): Node[];
  hasCallStates(): boolean;
  validateCallStates(resolver: (id: string) => IGraph | null): boolean;
}

// ─── AbstractGraph Base Class ────────────────────────────────────────

/**
 * Abstract base class for all automaton graph types.
 *
 * Provides the shared implementation for state/transition management,
 * initial/final state tracking, alphabet computation, serialization,
 * and RSM call state support. Subclasses provide type-specific behavior
 * through the template method pattern:
 *
 * - {@link createTransitionFromString} — How to parse transition strings
 * - {@link updateAlphabetForEdge} — How to extract alphabet symbols from edges
 * - {@link getEmptyTransitionCharacter} — The "no input" symbol (ε or ☐)
 * - {@link isValid} — Type-specific validation rules
 *
 * @see Sipser, M. (2012). Introduction to the Theory of Computation (3rd ed.).
 */
export abstract class AbstractGraph implements IGraph {
  public abstract shortName: string;

  /** Whether this automaton is deterministic. */
  public deterministic: boolean;

  /** The finite set of states Q. */
  public nodes: NodeList;

  /** The set of transitions δ. */
  public edges: EdgeList;

  /** The initial state q₀ (null if not set). */
  public initialNode: Node | null;

  /** The set of accepting/final states F ⊆ Q. */
  public finalNodes: NodeList;

  /** The input alphabet Σ (computed from transitions). */
  public alphabet: Record<string, boolean>;

  constructor(deterministic: boolean, nodes?: Node[], edges?: Edge[]) {
    this.deterministic = deterministic;
    this.initialNode = null;
    this.nodes = new NodeList();
    this.finalNodes = new NodeList();
    this.edges = new EdgeList();
    this.alphabet = {};

    if (nodes) {
      nodes.forEach((node) => this.addNode(node));
    }
    if (edges) {
      edges.forEach((edge) => this.addEdge(edge));
    }
  }

  init(deterministic: boolean): void {
    this.deterministic = deterministic;
    this.initialNode = null;
    this.nodes = new NodeList();
    this.finalNodes = new NodeList();
    this.edges = new EdgeList();
    this.alphabet = {};
  }

  // ─── State (Node) Operations ───

  getNodes(): NodeList {
    return this.nodes;
  }

  addNode(node: Node | string, options?: NodeOptions): Node {
    let newNode: Node;
    if (typeof node === "string") {
      newNode = new Node(node, options);
    } else if (node instanceof Node) {
      newNode = node;
    } else {
      throw new Error("Invalid node type: expected Node instance or string label");
    }

    const result = this.nodes.add(newNode);

    if (result === newNode) {
      if (result.initial) {
        this.setInitialNode(result);
      }
      if (result.final) {
        this.finalNodes.add(result);
      }
    }

    return result;
  }

  removeNode(node: Node | string): boolean {
    const foundNode = this.nodes.get(node);
    if (!foundNode) return false;

    const incidentEdges = [...foundNode.fromEdges.items, ...foundNode.toEdges.items];
    incidentEdges.forEach((edge) => this.removeEdge(edge));

    if (foundNode === this.initialNode) {
      this.initialNode = null;
    }
    if (foundNode.final && this.finalNodes.has(foundNode)) {
      this.finalNodes.remove(foundNode);
    }
    this.nodes.remove(foundNode);
    return true;
  }

  getNode(node: Node | string): Node | null {
    return this.nodes.get(node);
  }

  hasNode(node: Node | string): boolean {
    return this.nodes.has(node);
  }

  // ─── Transition (Edge) Operations ───

  getEdges(): EdgeList {
    return this.edges;
  }

  addEdge(from: Edge | Node | string, to?: Node | string, transition?: Transition | string, pending?: boolean): Edge {
    let edge: Edge;

    if (from instanceof Edge) {
      edge = from;
    } else if (to !== undefined && transition !== undefined) {
      let fromObj: Node | null;
      let toObj: Node | null;
      let transitionObj: Transition;

      if (typeof from === "string") {
        fromObj = this.getNode(from);
      } else if (from instanceof Node) {
        fromObj = from;
      } else {
        throw new Error("Invalid from node: expected Node instance or string label");
      }

      if (typeof to === "string") {
        toObj = this.getNode(to);
      } else if (to instanceof Node) {
        toObj = to;
      } else {
        throw new Error("Invalid to node: expected Node instance or string label");
      }

      if (typeof transition === "string") {
        transitionObj = this.createTransitionFromString(transition, !!pending);
      } else {
        transitionObj = transition;
      }

      if (!fromObj || !toObj) {
        throw new Error("Could not find nodes for edge");
      }

      edge = new Edge(fromObj, toObj, transitionObj);
    } else {
      throw new Error("Invalid arguments for addEdge: expected Edge or (from, to, transition)");
    }

    if (!this.hasNode(edge.from) || !this.hasNode(edge.to)) {
      throw new Error("Graph does not contain all nodes referenced by the edge");
    }

    this.updateAlphabetForEdge(edge);
    return this.edges.add(edge);
  }

  getEdge(edge: Edge | string): Edge | null {
    return this.edges.get(edge);
  }

  removeEdge(edge: Edge | string): boolean {
    const foundEdge = this.edges.get(edge);
    if (!foundEdge) return false;
    foundEdge.removeNodes();
    const removed = this.edges.remove(foundEdge);
    if (removed) {
      this.updateAlphabet();
    }
    return removed;
  }

  hasEdge(edge: Edge | string): boolean {
    return this.edges.has(edge);
  }

  // ─── Initial / Final State Management ───

  getInitialNode(): Node | null {
    return this.initialNode;
  }

  setInitialNode(node: Node | null): Node | null {
    if (node && !this.nodes.has(node)) {
      throw new Error("Cannot set initial node: node does not belong to this graph");
    }

    if (this.initialNode) {
      this.initialNode.initial = false;
    }
    if (node) {
      node.initial = true;
      this.initialNode = node;
    } else {
      this.initialNode = null;
    }
    return node;
  }

  getFinalNodes(): NodeList {
    return this.finalNodes;
  }

  markFinalNode(node: Node): Node {
    if (!this.nodes.has(node)) {
      throw new Error("Cannot mark final node: node does not belong to this graph");
    }

    node.final = true;
    if (!this.finalNodes.has(node)) {
      this.finalNodes.add(node);
    }
    return node;
  }

  unmarkFinalNode(node: Node): Node {
    if (!this.nodes.has(node)) {
      throw new Error("Cannot unmark final node: node does not belong to this graph");
    }

    node.final = false;
    if (this.finalNodes.has(node)) {
      this.finalNodes.remove(node);
    }
    return node;
  }

  // ─── Alphabet ───

  getAlphabet(): Record<string, boolean> {
    return this.alphabet;
  }

  updateAlphabet(): void {
    this.alphabet = {};
    this.edges.items.forEach((edge: Edge) => this.updateAlphabetForEdge(edge));
  }

  abstract updateAlphabetForEdge(edge: Edge): void;

  // ─── Transition Factory (Template Methods) ───

  abstract getEmptyTransitionCharacter(): string;
  abstract createTransitionFromString(transition: string, pending: boolean): Transition;

  // ─── Validation ───

  abstract isValid(): boolean;

  // ─── Serialization ───

  toString(): string {
    let str = "";
    str += this.deterministic ? "D" : "N";
    str += this.shortName;
    str += ":(";

    this.updateAlphabet();
    str += "{";
    str += Object.keys(this.alphabet).join(", ");
    str += "}, ";

    str += "{";
    str += this.nodes.items.map((node) => node.toString()).join(", ");
    str += "}, ";

    str += "{";
    str += this.edges.items.map((edge) => edge.toString()).join(", ");
    str += "}, ";

    str += this.initialNode ? this.initialNode.toString() : "";
    str += ", ";

    str += "{";
    str += this.finalNodes.items.map((node) => node.toString()).join(", ");
    str += "}";

    str += ")";
    return str;
  }

  fromString(input: string): boolean {
    const configRegex = new RegExp("^([DN])" + this.shortName + ":\\({(.*)}, {(.*)}, {(.*)}, (.*), {(.*)}\\)$");

    if (!configRegex.test(input)) return false;

    const configParse = configRegex.exec(input);
    if (!configParse) return false;

    try {
      const deterministic = configParse[1] === "D";
      const alphabet = configParse[2]
        .split(", ")
        .filter((entry) => entry.length > 0);
      const nodes = configParse[3]
        .split(", ")
        .filter((entry) => entry.length > 0);
      let edgesStr = configParse[4];
      if (edgesStr.length > 0) {
        edgesStr = edgesStr.substring(1, edgesStr.length - 1);
      }
      const edges = edgesStr.length > 0 ? edgesStr.split("), (").map((edge) => edge.split(", ")) : [];
      const initialNode = configParse[5];
      const finalNodes = configParse[6]
        .split(", ")
        .filter((entry) => entry.length > 0);

      this.init(deterministic);

      alphabet.forEach((letter) => {
        this.alphabet[letter] = true;
      });

      nodes.forEach((node) => {
        if (node) {
          this.addNode(node, {
            initial: initialNode === node,
            final: finalNodes.includes(node),
          });
        }
      });

      edges.forEach((edge) => {
        if (edge.length === 3) {
          this.addEdge(edge[0], edge[1], edge[2]);
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Pretty straight forward don't you think?
    } catch (e) {
      return false;
    }

    return true;
  }

  // ─── RSM (Recursive State Machine) ───

  getCallStates(): Node[] {
    return this.nodes.items.filter((node: Node) => node.isCallState);
  }

  hasCallStates(): boolean {
    return this.nodes.items.some((node: Node) => node.isCallState);
  }

  validateCallStates(resolver: (id: string) => IGraph | null): boolean {
    const callStates = this.getCallStates();
    for (const node of callStates) {
      if (!node.callConfig) continue;
      const target = resolver(node.callConfig.targetAutomatonId);
      if (target === null) return false;
    }
    return true;
  }
}
