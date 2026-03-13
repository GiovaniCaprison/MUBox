import { describe, it, expect } from "vitest";

import { EPSILON, BLANK, INITIAL_STACK } from "../../src/model/symbols";
import { CharacterTransition } from "../../src/model/transitions/character-transition";
import { PushdownTransition } from "../../src/model/transitions/pushdown-transition";
import { TuringTransition, TuringTransitionDirection } from "../../src/model/transitions/turing-transition";

describe("CharacterTransition", () => {
  it("matches the correct input character", () => {
    const t = new CharacterTransition("a");
    expect(t.canFollowOn("abc")).toBe(true);
    expect(t.canFollowOn("bca")).toBe(false);
    expect(t.canFollowOn("")).toBe(false);
  });

  it("epsilon transition matches any input (including empty)", () => {
    const t = new CharacterTransition(EPSILON);
    expect(t.canFollowOn("abc")).toBe(true);
    expect(t.canFollowOn("")).toBe(true);
  });

  it("pending transitions never match", () => {
    const t = new CharacterTransition("a", true);
    expect(t.canFollowOn("abc")).toBe(false);
  });

  it("rejects multi-character input", () => {
    expect(() => new CharacterTransition("ab")).toThrow();
  });

  it("clones correctly", () => {
    const t = new CharacterTransition("x", true);
    const clone = t.clone() as CharacterTransition;
    expect(clone.character).toBe("x");
    expect(clone.pending).toBe(true);
    expect(clone).not.toBe(t);
  });

  it("toString returns character or unknown for pending", () => {
    expect(new CharacterTransition("a").toString()).toBe("a");
    expect(new CharacterTransition(EPSILON).toString()).toBe(EPSILON);
    expect(new CharacterTransition("a", true).toString()).toBe(String.fromCharCode(0xfffd));
  });

  it("getTransitionParts returns one editable part", () => {
    const t = new CharacterTransition("a");
    const parts = t.getTransitionParts();
    expect(parts).toHaveLength(1);
    expect(parts[0].content).toBe("a");
  });
});

describe("TuringTransition", () => {
  it("matches when read symbol equals tape symbol", () => {
    const t = new TuringTransition("a", "b", TuringTransitionDirection.RIGHT);
    expect(t.canFollowOn("a")).toBe(true);
    expect(t.canFollowOn("b")).toBe(false);
  });

  it("blank read matches empty/blank tape cells", () => {
    const t = new TuringTransition(BLANK, "x", TuringTransitionDirection.LEFT);
    expect(t.canFollowOn(BLANK)).toBe(true);
    expect(t.canFollowOn("")).toBe(true);
    expect(t.canFollowOn("a")).toBe(false);
  });

  it("pending transitions never match", () => {
    const t = new TuringTransition("a", "b", TuringTransitionDirection.RIGHT, true);
    expect(t.canFollowOn("a")).toBe(false);
  });

  it("direction string conversion works", () => {
    const t = new TuringTransition("a", "b", TuringTransitionDirection.LEFT);
    expect(t.getDirectionString()).toBe("L");

    t.direction = TuringTransitionDirection.RIGHT;
    expect(t.getDirectionString()).toBe("R");

    t.direction = null;
    expect(t.getDirectionString()).toBe("S");
  });

  it("setDirectionFromString parses L/R/other", () => {
    const t = new TuringTransition("a", "b", null);
    t.setDirectionFromString("L");
    expect(t.direction).toBe(TuringTransitionDirection.LEFT);
    t.setDirectionFromString("R");
    expect(t.direction).toBe(TuringTransitionDirection.RIGHT);
    t.setDirectionFromString("l");
    expect(t.direction).toBe(TuringTransitionDirection.LEFT);
    t.setDirectionFromString("X");
    expect(t.direction).toBeNull();
  });

  it("toString formats as read/write; direction", () => {
    const t = new TuringTransition("a", "b", TuringTransitionDirection.RIGHT);
    expect(t.toString()).toBe("a/b; R");
  });

  it("clones correctly", () => {
    const t = new TuringTransition("a", "b", TuringTransitionDirection.LEFT);
    const clone = t.clone() as TuringTransition;
    expect(clone.read).toBe("a");
    expect(clone.write).toBe("b");
    expect(clone.direction).toBe(TuringTransitionDirection.LEFT);
    expect(clone).not.toBe(t);
  });

  it("getTransitionParts returns 5 parts (read, /, write, ;, direction)", () => {
    const t = new TuringTransition("a", "b", TuringTransitionDirection.RIGHT);
    const parts = t.getTransitionParts();
    expect(parts).toHaveLength(5);
    expect(parts[0].content).toBe("a");
    expect(parts[1].content).toBe("/");
    expect(parts[2].content).toBe("b");
    expect(parts[3].content).toBe(";");
    expect(parts[4].content).toBe("R");
  });
});

describe("PushdownTransition", () => {
  it("matches when char and stack top match", () => {
    const t = new PushdownTransition("a", INITIAL_STACK, "A" + INITIAL_STACK);
    expect(t.canFollowOn("abc", INITIAL_STACK)).toBe(true);
    expect(t.canFollowOn("abc", "X")).toBe(false); // wrong stack top
    expect(t.canFollowOn("bca", INITIAL_STACK)).toBe(false); // wrong input char
  });

  it("epsilon char matches any input", () => {
    const t = new PushdownTransition(EPSILON, INITIAL_STACK, "A");
    expect(t.canFollowOn("abc", INITIAL_STACK)).toBe(true);
    expect(t.canFollowOn("", INITIAL_STACK)).toBe(true);
  });

  it("epsilon pop matches any stack top", () => {
    const t = new PushdownTransition("a", EPSILON, "A");
    expect(t.canFollowOn("abc", "X")).toBe(true);
    expect(t.canFollowOn("abc", "")).toBe(true);
  });

  it("empty string fields act as epsilon", () => {
    const t = new PushdownTransition("", "", "");
    expect(t.canFollowOn("abc", "X")).toBe(true);
    expect(t.canFollowOn("", "")).toBe(true);
  });

  it("applyTo consumes input and manipulates stack correctly", () => {
    // Read 'a', pop '$', push 'A$'
    const t = new PushdownTransition("a", INITIAL_STACK, "A" + INITIAL_STACK);
    const [newWord, newStack] = t.applyTo("abc", INITIAL_STACK);
    expect(newWord).toBe("bc"); // consumed 'a'
    expect(newStack).toBe("A" + INITIAL_STACK); // popped '$', pushed 'A$'
  });

  it("applyTo with epsilon char does not consume input", () => {
    const t = new PushdownTransition(EPSILON, "A", "BA");
    const [newWord, newStack] = t.applyTo("abc", "AX");
    expect(newWord).toBe("abc"); // no consumption
    expect(newStack).toBe("BAX"); // popped 'A', pushed 'BA'
  });

  it("applyTo with epsilon pop does not pop", () => {
    const t = new PushdownTransition("a", "", "X");
    const [newWord, newStack] = t.applyTo("abc", INITIAL_STACK);
    expect(newWord).toBe("bc");
    expect(newStack).toBe("X" + INITIAL_STACK); // pushed 'X' without popping
  });

  it("applyTo with epsilon push does not push", () => {
    const t = new PushdownTransition("a", "A", "");
    const [newWord, newStack] = t.applyTo("abc", "AX");
    expect(newWord).toBe("bc");
    expect(newStack).toBe("X"); // popped 'A', pushed nothing
  });

  it("toString formats as char, pop → push", () => {
    const t = new PushdownTransition("a", INITIAL_STACK, "A" + INITIAL_STACK);
    expect(t.toString()).toBe(`a, ${INITIAL_STACK} → A${INITIAL_STACK}`);
  });

  it("toString uses epsilon for empty fields", () => {
    const t = new PushdownTransition("", "", "");
    expect(t.toString()).toBe(`${EPSILON}, ${EPSILON} → ${EPSILON}`);
  });

  it("clones correctly", () => {
    const t = new PushdownTransition("a", "B", "CD");
    const clone = t.clone() as PushdownTransition;
    expect(clone.char).toBe("a");
    expect(clone.pop).toBe("B");
    expect(clone.push).toBe("CD");
    expect(clone).not.toBe(t);
  });
});
