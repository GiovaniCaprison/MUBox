import { MutablePoint } from "../../core/point";

/**
 * Manages the viewport (zoom, pan, viewBox) for the automaton canvas.
 *
 * The viewport maps between two coordinate systems:
 * - **Screen space**: Pixel coordinates relative to the SVG element (0,0 = top-left of canvas)
 * - **SVG space**: The coordinate system used by nodes and edges (can be panned/zoomed)
 *
 * The viewport is defined by a rectangular window into SVG space:
 * `(viewX, viewY)` is the top-left corner, and `(viewWidth, viewHeight)` is the size.
 * Zooming changes the size of this window (smaller = zoomed in), while panning
 * shifts its position.
 */
export class ViewportManager {
  /** The X origin of the viewport in SVG coordinate space. */
  public viewX = 0;
  /** The Y origin of the viewport in SVG coordinate space. */
  public viewY = 0;
  /** The width of the viewport in SVG coordinate space (changes with zoom). */
  public viewWidth = 800;
  /** The height of the viewport in SVG coordinate space (changes with zoom). */
  public viewHeight = 600;
  /** Current zoom level (1.0 = 100%). */
  public zoom = 1.0;
  /** Minimum zoom level. */
  public readonly minZoom: number = 0.2;
  /** Maximum zoom level. */
  public readonly maxZoom: number = 5.0;

  /** Callback invoked after any viewport change. */
  public onUpdate: (() => void) | null = null;

  /**
   * Initialize the viewport dimensions (call when canvas size is known).
   */
  public init(canvasWidth: number, canvasHeight: number): void {
    this.viewWidth = canvasWidth;
    this.viewHeight = canvasHeight;
    this.viewX = 0;
    this.viewY = 0;
    this.zoom = 1.0;
  }

  /**
   * Convert screen coordinates (relative to SVG element) to SVG coordinate space.
   */
  public screenToSVG(screenX: number, screenY: number, canvasWidth: number, canvasHeight: number): MutablePoint {
    const svgX = this.viewX + (screenX / canvasWidth) * this.viewWidth;
    const svgY = this.viewY + (screenY / canvasHeight) * this.viewHeight;
    return new MutablePoint(svgX, svgY);
  }

  /**
   * Pan the viewport by a screen-space delta.
   */
  public pan(screenDeltaX: number, screenDeltaY: number, canvasWidth: number, canvasHeight: number): void {
    const svgDeltaX = (screenDeltaX / canvasWidth) * this.viewWidth;
    const svgDeltaY = (screenDeltaY / canvasHeight) * this.viewHeight;
    this.viewX -= svgDeltaX;
    this.viewY -= svgDeltaY;
    this.notifyUpdate();
  }

  /**
   * Zoom the viewport centered on a screen point.
   */
  public zoomAt(screenX: number, screenY: number, zoomDelta: number, canvasWidth: number, canvasHeight: number): void {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * (1 + zoomDelta)));

    // Get the SVG point under the cursor before zoom
    const svgPointBefore = this.screenToSVG(screenX, screenY, canvasWidth, canvasHeight);

    // Apply new zoom
    this.zoom = newZoom;
    this.viewWidth = canvasWidth / newZoom;
    this.viewHeight = canvasHeight / newZoom;

    // Get the SVG point under the cursor after zoom
    const svgPointAfter = this.screenToSVG(screenX, screenY, canvasWidth, canvasHeight);

    // Adjust viewX/viewY so the point under cursor stays fixed
    this.viewX += svgPointBefore.x - svgPointAfter.x;
    this.viewY += svgPointBefore.y - svgPointAfter.y;

    this.notifyUpdate();
  }

  /**
   * Reset the viewport to the default view (origin, 100% zoom).
   */
  public reset(canvasWidth: number, canvasHeight: number): void {
    this.viewX = 0;
    this.viewY = 0;
    this.viewWidth = canvasWidth;
    this.viewHeight = canvasHeight;
    this.zoom = 1.0;
    this.notifyUpdate();
  }

  /**
   * Fit the viewport to show all content within the given bounds.
   */
  public zoomToFit(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    canvasWidth: number,
    canvasHeight: number,
    padding = 50,
  ): void {
    const contentWidth = bounds.maxX - bounds.minX + padding * 2;
    const contentHeight = bounds.maxY - bounds.minY + padding * 2;

    const zoomX = canvasWidth / contentWidth;
    const zoomY = canvasHeight / contentHeight;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.min(zoomX, zoomY)));

    this.zoom = newZoom;
    this.viewWidth = canvasWidth / newZoom;
    this.viewHeight = canvasHeight / newZoom;
    this.viewX = bounds.minX - padding;
    this.viewY = bounds.minY - padding;

    this.notifyUpdate();
  }

  /**
   * Get the current viewBox string for the SVG element.
   */
  public getViewBox(): string {
    return `${this.viewX} ${this.viewY} ${this.viewWidth} ${this.viewHeight}`;
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate();
    }
  }
}
