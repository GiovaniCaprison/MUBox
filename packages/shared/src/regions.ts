/**
 * Represents a region in AWS.
 */
interface IRegion {
  /**
   * The alias of the region.
   *
   * @example "IAD"
   */
  readonly alias: string;

  /**
   * The identifier of the region.
   *
   * @example "us-east-1"
   */
  readonly id: string;

  /**
   * The name of the region.
   *
   * @example "US East (N. Virginia)"
   */
  readonly name: string;
}

/**
 * The `eu-west-1` region.
 */
const DUB = {
  alias: "DUB",
  id: "eu-west-1",
  name: "🇮🇪 Europe (Ireland)",
} as const satisfies IRegion;

/**
 * The `us-east-1` region.
 */
const IAD = {
  alias: "IAD",
  id: "us-east-1",
  name: "🇺🇸 US East (N. Virginia)",
} as const satisfies IRegion;

/**
 * The `us-west-2` region.
 */
const PDX = {
  alias: "PDX",
  id: "us-west-2",
  name: "🇺🇸 US West (Oregon)",
} as const satisfies IRegion;

/**
 * The `ap-southeast-2` region.
 */
const SYD = {
  alias: "SYD",
  id: "ap-southeast-2",
  name: "🇦🇺 Asia Pacific (Sydney)",
} as const satisfies IRegion;

/**
 * All of the regions we deploy to.
 */
export const REGIONS = [SYD, DUB, IAD, PDX] as const;

/**
 * A type representing the regions we support.
 */
export type Region = (typeof REGIONS)[number];

/**
 * A type representing the region aliases we support.
 */
export type RegionAlias = Region["alias"];

/**
 * A type representing the region ids we support.
 */
export type RegionId = Region["id"];

/**
 * The region global infrastructure (like our CloudFront distribution and Route 53 hosted zone) will be hosted.
 */
export const GLOBAL_INFRASTRUCTURE_REGION = IAD;
