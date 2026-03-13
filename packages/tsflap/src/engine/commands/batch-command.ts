import type { ICommand } from "./types";

/**
 * Groups multiple commands into a single undoable/redoable operation.
 * Execute runs all commands in order; undo reverses them in reverse order.
 */
export class BatchCommand implements ICommand {
  private commands: ICommand[];

  constructor(commands: ICommand[]) {
    this.commands = commands;
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
