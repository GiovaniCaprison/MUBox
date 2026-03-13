export enum Stage {
  BETA = "BETA",
  PROD = "PROD",
}

/**
 * A type that maps a specific stage to a given object of type T.
 *
 * This can be used to specify the specific configuration for a stage.
 */
export type StageConfiguration<T> = Readonly<Record<Stage, Readonly<T>>>;
