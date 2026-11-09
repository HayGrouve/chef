import { expect, test } from "vitest";
import { nextSyncedAuthName } from "./names";

test("an empty or unchanged name writes nothing; a new name is trimmed", () => {
  expect(nextSyncedAuthName("Мария", undefined)).toBeUndefined();
  expect(nextSyncedAuthName("Мария", null)).toBeUndefined();
  expect(nextSyncedAuthName("Мария", "   ")).toBeUndefined();
  expect(nextSyncedAuthName("Мария", " Мария ")).toBeUndefined();
  expect(nextSyncedAuthName("Мария", " Мария Петрова ")).toBe("Мария Петрова");
  expect(nextSyncedAuthName(undefined, "Иван")).toBe("Иван");
});
