/**
 * useCanvasDimensions — Tracks the pixel dimensions of the canvas container.
 *
 * Attaches a `resize` listener to the window and measures the container
 * element on every resize (and on mount).  The returned dimensions are used
 * to pass width/height into layout algorithms and zoom-to-fit operations.
 *
 * **Viewport initialisation**: `controller.initViewport()` is only called
 * for controllers that have not yet been initialised (tracked via a WeakSet).
 * This preserves the zoom/pan state when switching between tabs — a
 * previously-viewed tab retains its viewport transform.
 */

import type { Controller } from "@mubox/local-tsflap";
import { useState, useEffect, useRef } from "react";

export interface CanvasDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * @param controller - The active automaton controller.  Its viewport will be
 *   initialised exactly once (the first time it becomes active).
 * @returns A tuple of `[dimensions, containerRef]` where `containerRef`
 *   should be attached to the DOM element wrapping the `<Canvas>`.
 */
export function useCanvasDimensions(controller: Controller): [CanvasDimensions, React.RefObject<HTMLDivElement | null>] {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<CanvasDimensions>({ width: 800, height: 600 });

  /**
   * Track which controllers have already had their viewport initialised.
   * Using a WeakSet so entries are garbage-collected when a tab is removed.
   */
  const initialisedControllers = useRef(new WeakSet<Controller>());

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const dims: CanvasDimensions = {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        };
        setDimensions(dims);

        /*
         * Only initialise the viewport for controllers that haven't been
         * seen before.  This is critical for the default "Main" automaton
         * (created before the DOM mounts) and for newly-added tabs.
         * Returning tabs keep their existing zoom/pan transform.
         */
        if (!initialisedControllers.current.has(controller)) {
          controller.initViewport(dims.width, dims.height);
          initialisedControllers.current.add(controller);
        }
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [controller]);

  return [dimensions, containerRef];
}
