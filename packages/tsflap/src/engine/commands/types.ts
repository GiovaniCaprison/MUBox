/**
 * Command interface - all commands must implement execute and undo
 */
export interface ICommand {
  execute(): void;
  undo(): void;
}
