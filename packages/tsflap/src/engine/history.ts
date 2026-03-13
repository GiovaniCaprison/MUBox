import type { ICommand } from "./commands/types";

/**
 * Manages the command history for undo/redo functionality
 */
export class History {
  private commands: ICommand[] = [];
  private currentIndex = -1;

  public trackExecution(command: ICommand) {
    this.commands.splice(this.currentIndex + 1, this.commands.length - this.currentIndex);
    this.commands.push(command);
    this.currentIndex++;
    command.execute();
  }

  public undo() {
    if (!this.hasUndo()) return;
    this.commands[this.currentIndex].undo();
    this.currentIndex -= 1;
  }

  public redo() {
    if (!this.hasRedo()) return;
    this.commands[this.currentIndex + 1].execute();
    this.currentIndex += 1;
  }

  public hasUndo(): boolean {
    return this.currentIndex !== -1;
  }

  public hasRedo(): boolean {
    return this.currentIndex < this.commands.length - 1;
  }

  public clear() {
    this.commands = [];
    this.currentIndex = -1;
  }
}
