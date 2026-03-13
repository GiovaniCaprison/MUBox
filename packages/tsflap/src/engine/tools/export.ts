/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
import type { Controller } from "../controller";

/**
 * Exports the current automaton as a PNG image and triggers a download
 */
export function exportToPNG(controller: Controller, svgElement: SVGSVGElement, filename = "graph.png"): void {
  const bounds = controller.getBounds();
  const padding = 25;
  const width = bounds.maxX + padding * 2 - bounds.minX;
  const height = bounds.maxY + padding * 2 - bounds.minY;

  // Clone the SVG
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

  // Remove control points from the clone
  const controlPoints = svgClone.querySelector(".control-points");
  if (controlPoints) controlPoints.remove();

  // Set viewBox to crop to content
  svgClone.setAttribute("width", String(width));
  svgClone.setAttribute("height", String(height));
  svgClone.setAttribute("viewBox", `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.maxX + padding} ${bounds.maxY + padding}`);

  // Temporarily add to DOM so getComputedStyle works on the clone
  svgClone.style.position = "absolute";
  svgClone.style.left = "-9999px";
  svgClone.style.top = "-9999px";
  document.body.appendChild(svgClone);

  // Inline computed styles for proper rendering
  inlineStyles(svgClone);

  // Remove from DOM
  document.body.removeChild(svgClone);

  // Serialize to data URI
  const svgXml = new XMLSerializer().serializeToString(svgClone);
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- I have played around with fixing this to no avail oh well :)
  const svgDataUri = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgXml)));

  // Draw to canvas
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  const image = new Image(width, height);
  image.src = svgDataUri;

  image.onload = () => {
    ctx.drawImage(image, 0, 0, width, height);
    const pngDataUri = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.download = filename;
    a.href = pngDataUri;
    a.click();
  };
}

/**
 * Exports the current automaton as a LaTeX file and triggers a download
 */
export function exportToLaTeX(controller: Controller, filename = "graph.tex"): void {
  const latex = controller.toLaTeX();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const dataUri = "data:text/plain;base64," + btoa(unescape(encodeURIComponent(latex)));

  const a = document.createElement("a");
  a.download = filename;
  a.href = dataUri;
  a.click();
}

/**
 * Exports the current automaton definition as a text file and triggers a download
 */
export function exportToDefinition(controller: Controller, filename = "graph.txt"): void {
  const definition = controller.graph.toString();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const dataUri = "data:text/plain;base64," + btoa(unescape(encodeURIComponent(definition)));

  const a = document.createElement("a");
  a.download = filename;
  a.href = dataUri;
  a.click();
}

/**
 * Recursively inlines computed styles on an element (needed for SVG → canvas rendering)
 */
function inlineStyles(element: Element): void {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) return;

  Array.from(element.children).forEach((child) => inlineStyles(child));

  const computedStyle = getComputedStyle(element);
  for (let i = 0; i < computedStyle.length; i++) {
    const property = computedStyle.item(i);
    const value = computedStyle.getPropertyValue(property);
    element.style.setProperty(property, value);
  }
}
