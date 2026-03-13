import { describe, it, expect } from "vitest";

import type { ICommand } from "../../src/engine/commands/types";
import { History } from "../../src/engine/history";

class MockCommand implements ICommand {
  public executed = 0;
  public undone = 0;

  execute(): void {
    this.executed++;
  }
  undo(): void {
    this.undone++;
  }
}

describe("History", () => {
  it("trackExecution executes the command and adds to history", () => {
    const history = new History();
    const cmd = new MockCommand();

    history.trackExecution(cmd);
    expect(cmd.executed).toBe(1);
    expect(history.hasUndo()).toBe(true);
    expect(history.hasRedo()).toBe(false);
  });

  it("undo reverses the last command", () => {
    const history = new History();
    const cmd = new MockCommand();

    history.trackExecution(cmd);
    history.undo();

    expect(cmd.undone).toBe(1);
    expect(history.hasUndo()).toBe(false);
    expect(history.hasRedo()).toBe(true);
  });

  it("redo re-executes the undone command", () => {
    const history = new History();
    const cmd = new MockCommand();

    history.trackExecution(cmd);
    history.undo();
    history.redo();

    expect(cmd.executed).toBe(2); // once from trackExecution, once from redo
    expect(history.hasUndo()).toBe(true);
    expect(history.hasRedo()).toBe(false);
  });

  it("new command after undo discards redo stack", () => {
    const history = new History();
    const cmd1 = new MockCommand();
    const cmd2 = new MockCommand();
    const cmd3 = new MockCommand();

    history.trackExecution(cmd1);
    history.trackExecution(cmd2);
    history.undo(); // undo cmd2
    history.trackExecution(cmd3); // should discard cmd2 from redo

    expect(history.hasRedo()).toBe(false);
    history.undo(); // undoes cmd3
    expect(cmd3.undone).toBe(1);
    history.undo(); // undoes cmd1
    expect(cmd1.undone).toBe(1);
    expect(history.hasUndo()).toBe(false);
  });

  it("multiple undo/redo in sequence", () => {
    const history = new History();
    const cmds = [new MockCommand(), new MockCommand(), new MockCommand()];

    cmds.forEach((c) => history.trackExecution(c));

    history.undo(); // undo cmd3
    history.undo(); // undo cmd2
    expect(cmds[2].undone).toBe(1);
    expect(cmds[1].undone).toBe(1);

    history.redo(); // redo cmd2
    expect(cmds[1].executed).toBe(2);

    history.redo(); // redo cmd3
    expect(cmds[2].executed).toBe(2);
  });

  it("undo on empty history does nothing", () => {
    const history = new History();
    history.undo(); // should not throw
    expect(history.hasUndo()).toBe(false);
  });

  it("redo on empty redo stack does nothing", () => {
    const history = new History();
    history.redo(); // should not throw
    expect(history.hasRedo()).toBe(false);
  });

  it("clear resets the history", () => {
    const history = new History();
    history.trackExecution(new MockCommand());
    history.trackExecution(new MockCommand());

    history.clear();
    expect(history.hasUndo()).toBe(false);
    expect(history.hasRedo()).toBe(false);
  });
});
