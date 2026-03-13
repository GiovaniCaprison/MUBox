import type { IconProps } from "@cloudscape-design/components/icon";

/**
 * Represents our route's metadata
 */
export interface RouteMetadata {
  /**
   * The title of the page associated with this route
   */
  readonly title: string;

  /**
   * A description of the page associated with this route
   */
  readonly description: string;

  /**
   * The icon used to represent the page associated with this route.
   */
  readonly icon: IconProps.Name;

  /**
   * The path of the route.
   */
  readonly path: string;
}
