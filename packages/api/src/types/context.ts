/**
 * Context about the current request.
 */
export interface Context {
  /**
   * The userId of the current authenticated user that invoked the API.
   */
  readonly userId: string;
}
