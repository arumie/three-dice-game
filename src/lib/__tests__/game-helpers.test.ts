import { describe, expect, test } from "bun:test";
import { formatNamesList } from "@/lib/game-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// formatNamesList
// ═══════════════════════════════════════════════════════════════════════════════

describe("formatNamesList", () => {
  test("empty array returns null", () => {
    expect(formatNamesList([])).toBeNull();
  });

  test("single name returns the name", () => {
    expect(formatNamesList(["Alice"])).toBe("Alice");
  });

  test("two names joined with 'and'", () => {
    expect(formatNamesList(["Alice", "Bob"])).toBe("Alice and Bob");
  });

  test("three names with Oxford comma", () => {
    expect(formatNamesList(["Alice", "Bob", "Charlie"])).toBe(
      "Alice, Bob, and Charlie",
    );
  });

  test("four names with Oxford comma", () => {
    expect(formatNamesList(["Alice", "Bob", "Charlie", "Dave"])).toBe(
      "Alice, Bob, Charlie, and Dave",
    );
  });
});
