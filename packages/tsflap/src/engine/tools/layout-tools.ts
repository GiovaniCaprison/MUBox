/* eslint-disable @typescript-eslint/no-non-null-assertion -- Oh Mr. Queue - why cant we get along */
import { MutablePoint } from "../../core/point";
import type { Controller } from "../controller";
import type { NodeView } from "../views/node-view";

/**
 * Arranges all nodes in a circle, ordered by BFS distance from the initial state.
 * The initial state is placed at the top (12 o'clock position).
 */
export function circleLayout(controller: Controller, canvasWidth = 800, canvasHeight = 600): void {
  const nodes = controller.views.nodes;
  if (nodes.length === 0) return;

  // Find initial node view, or use first node
  const initialNode = controller.graph.getInitialNode();
  let initialView: NodeView | null = null;
  if (initialNode) {
    initialView = nodes.find((nv) => nv.model === initialNode) ?? null;
  }

  // BFS to calculate distances from initial state
  const distances = new Map<string, number>();
  if (initialView) {
    const queue: NodeView[] = [initialView];
    distances.set(initialView.model.hashCode(), 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distances.get(current.model.hashCode())!;

      current.model.toEdges.items.forEach((edge) => {
        const toView = nodes.find((nv) => nv.model === edge.to);
        if (toView && !distances.has(toView.model.hashCode())) {
          distances.set(toView.model.hashCode(), currentDist + 1);
          queue.push(toView);
        }
      });
    }
  }

  // Sort nodes by distance (unreachable nodes get Infinity)
  const orderedNodes = [...nodes].sort((a, b) => {
    const distA = distances.get(a.model.hashCode()) ?? Infinity;
    const distB = distances.get(b.model.hashCode()) ?? Infinity;
    return distA - distB;
  });

  // Place in a circle
  const centerX = Math.round(canvasWidth / 2);
  const centerY = Math.round(canvasHeight / 2);
  const radius = Math.min(centerX, centerY) - 50;
  const deltaAngle = (2 * Math.PI) / orderedNodes.length;

  for (let i = 0; i < orderedNodes.length; i++) {
    const angle = i * deltaAngle - Math.PI / 2; // Start at top (12 o'clock)
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    orderedNodes[i].position = new MutablePoint(x, y);
  }

  // Recalculate all edge paths
  controller.views.edges.forEach((edgeV) => {
    edgeV.recalculatePath();
  });

  controller.views.update();
}

/**
 * Arranges nodes in a tree layout rooted at the initial state.
 * Children are placed to the right, spread vertically.
 */
export function treeLayout(controller: Controller): void {
  const nodes = controller.views.nodes;
  const initialNode = controller.graph.getInitialNode();
  if (!initialNode || nodes.length === 0) return;

  const initialView = nodes.find((nv) => nv.model === initialNode);
  if (!initialView) return;

  // Build tree structure via BFS
  interface TreeNode {
    view: NodeView;
    children: TreeNode[];
    depth: number;
    height: number;
  }

  const head: TreeNode = { view: initialView, children: [], depth: 0, height: 0 };
  const queue: TreeNode[] = [head];
  const resultQueue: TreeNode[] = [];
  const visited = new Set<string>();
  visited.add(initialView.model.hashCode());

  while (queue.length > 0) {
    const curr = queue.shift()!;
    resultQueue.push(curr);

    curr.view.model.toEdges.items.forEach((edge) => {
      const toView = nodes.find((nv) => nv.model === edge.to);
      if (toView && !visited.has(toView.model.hashCode())) {
        visited.add(toView.model.hashCode());
        const child: TreeNode = { view: toView, children: [], depth: curr.depth + 1, height: 0 };
        curr.children.push(child);
        queue.push(child);
      }
    });
  }

  // Calculate heights bottom-up
  const stack = resultQueue.slice().reverse();
  stack.forEach((node) => {
    if (node.children.length === 0) {
      node.height = 80;
    } else {
      node.height = node.children.reduce((sum, child) => sum + child.height, 0);
    }
  });

  // Position nodes
  initialView.position = new MutablePoint(60, 300);

  resultQueue.forEach((node) => {
    let yPos = node.view.position.y - node.height / 2;
    node.children.forEach((child) => {
      child.view.position = new MutablePoint(60 + child.depth * 140, Math.round(yPos + child.height / 2));
      yPos += child.height;
    });
  });

  // Adjust parent positions to center of children
  stack
    .filter((node) => node.children.length > 0)
    .forEach((node) => {
      const yAvg = node.children.reduce((sum, child) => sum + child.view.position.y, 0) / node.children.length;
      node.view.position.y = Math.round(yAvg);
    });

  // Handle unreachable nodes — place them below the tree
  let unreachableY = 500;
  nodes.forEach((nv) => {
    if (!visited.has(nv.model.hashCode())) {
      nv.position = new MutablePoint(60, unreachableY);
      unreachableY += 80;
    }
  });

  // Recalculate all edge paths
  controller.views.edges.forEach((edgeV) => {
    edgeV.recalculatePath();
  });

  controller.views.update();
}

/**
 * Arranges nodes using a force-directed (spring-embedder) algorithm.
 * Nodes repel each other, connected nodes attract, and a centering force pulls toward the origin.
 * Based on the Fruchterman–Reingold algorithm.
 */
export function forceDirectedLayout(controller: Controller, canvasWidth = 800, canvasHeight = 600, iterations = 500): void {
  const nodes = controller.views.nodes;
  if (nodes.length === 0) return;

  // Helper: magnitude of a vector
  const magnitude = (p: { x: number; y: number }) => Math.sqrt(p.x * p.x + p.y * p.y);

  // Helper: normalize a vector to a given length
  const normalize = (p: { x: number; y: number }, length: number): { x: number; y: number } => {
    const mag = magnitude(p);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: (p.x / mag) * length, y: (p.y / mag) * length };
  };

  // Randomly scatter nodes
  nodes.forEach((nv) => {
    nv.position = new MutablePoint(Math.random() * canvasWidth - canvasWidth / 2, Math.random() * canvasHeight - canvasHeight / 2);
  });

  // Build bidirectional neighborhood map (node index → set of neighbor indices)
  const neighborhoods = new Map<number, Set<number>>();
  const nodeIndexMap = new Map<NodeView, number>();
  nodes.forEach((nv, i) => {
    nodeIndexMap.set(nv, i);
    neighborhoods.set(i, new Set());
  });

  nodes.forEach((nv, i) => {
    nv.model.toEdges.items.forEach((edge) => {
      const toView = nodes.find((n) => n.model === edge.to);
      if (toView && toView !== nv) {
        const j = nodeIndexMap.get(toView)!;
        neighborhoods.get(i)!.add(j);
        neighborhoods.get(j)!.add(i);
      }
    });
    nv.model.fromEdges.items.forEach((edge) => {
      const fromView = nodes.find((n) => n.model === edge.from);
      if (fromView && fromView !== nv) {
        const j = nodeIndexMap.get(fromView)!;
        neighborhoods.get(i)!.add(j);
        neighborhoods.get(j)!.add(i);
      }
    });
  });

  // Connect disconnected components via fake edges to node 0
  const connected = new Set<number>();
  const queue: number[] = [0];
  connected.add(0);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    neighborhoods.get(curr)!.forEach((neighbor) => {
      if (!connected.has(neighbor)) {
        connected.add(neighbor);
        queue.push(neighbor);
      }
    });
  }
  if (connected.size < nodes.length) {
    for (let i = 0; i < nodes.length; i++) {
      if (!connected.has(i)) {
        neighborhoods.get(0)!.add(i);
        neighborhoods.get(i)!.add(0);
      }
    }
  }

  // Ideal spacing constant
  const area = canvasWidth * canvasHeight;
  const minDistance = 100;
  const k = Math.min(Math.sqrt(area / nodes.length), minDistance);

  // Run simulation
  for (let iter = 0; iter < iterations; iter++) {
    // Temperature cools over time — controls max displacement per iteration
    const temperature = (canvasWidth / (5 * Math.sqrt(iterations))) * Math.sqrt(iterations - iter);

    // Calculate displacements for each node
    const displacements: { x: number; y: number }[] = nodes.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < nodes.length; i++) {
      const neighborhood = neighborhoods.get(i)!;
      const posI = nodes[i].position;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const posJ = nodes[j].position;

        // Vector from i to j
        const dx = posJ.x - posI.x;
        const dy = posJ.y - posI.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

        // Repulsion: push away from all nodes
        const repStrength = -(k * k) / dist;
        const repForce = normalize({ x: dx, y: dy }, repStrength);
        displacements[i].x += repForce.x;
        displacements[i].y += repForce.y;

        // Attraction: pull toward neighbors
        if (neighborhood.has(j)) {
          const attStrength = (dist * dist) / k;
          const attForce = normalize({ x: dx, y: dy }, attStrength);
          displacements[i].x += attForce.x;
          displacements[i].y += attForce.y;
        }
      }

      // Centering force: pull toward origin
      const centerDist = magnitude(posI);
      if (centerDist > 0) {
        const centerForce = normalize({ x: posI.x, y: posI.y }, -centerDist / k);
        displacements[i].x += centerForce.x;
        displacements[i].y += centerForce.y;
      }
    }

    // Apply displacements, capped by temperature
    for (let i = 0; i < nodes.length; i++) {
      const disp = displacements[i];
      const mag = magnitude(disp);
      if (mag > temperature) {
        const scaled = normalize(disp, temperature);
        disp.x = scaled.x;
        disp.y = scaled.y;
      }
      nodes[i].position.x += disp.x;
      nodes[i].position.y += disp.y;
    }
  }

  // Center the result in the canvas
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  nodes.forEach((nv) => {
    minX = Math.min(minX, nv.position.x);
    maxX = Math.max(maxX, nv.position.x);
    minY = Math.min(minY, nv.position.y);
    maxY = Math.max(maxY, nv.position.y);
  });
  const contentCenterX = (minX + maxX) / 2;
  const contentCenterY = (minY + maxY) / 2;
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;
  const offsetX = canvasCenterX - contentCenterX;
  const offsetY = canvasCenterY - contentCenterY;
  nodes.forEach((nv) => {
    nv.position.x = Math.round(nv.position.x + offsetX);
    nv.position.y = Math.round(nv.position.y + offsetY);
  });

  // Snap to grid if enabled
  if (controller.settings.grid) {
    nodes.forEach((nv) => {
      nv.position.round(20);
    });
  }

  // Recalculate all edge paths
  controller.views.edges.forEach((edgeV) => {
    edgeV.recalculatePath();
  });

  controller.views.update();
}

/**
 * Snaps all node positions to the nearest grid point (default grid size = 20).
 */
export function alignToGrid(controller: Controller, gridSize = 20): void {
  controller.views.nodes.forEach((nodeV) => {
    nodeV.position.round(gridSize);
  });

  // Recalculate all edge paths
  controller.views.edges.forEach((edgeV) => {
    edgeV.recalculatePath();
  });

  controller.views.update();
}
