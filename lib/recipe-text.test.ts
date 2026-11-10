import { describe, expect, it } from "vitest";
import { segmentStep } from "./recipe-text";

const timers = (step: string) =>
  segmentStep(step).flatMap((s) => (s.type === "timer" ? [[s.text, s.seconds, s.label]] : []));

describe("timers in steps", () => {
  it("finds English times and names them after the verb", () => {
    expect(timers("Simmer for 6-8 minutes, then rest 30 secs.")).toEqual([
      ["6-8 minutes", 360, "Simmer"],
      ["30 secs", 30, "Rest"],
    ]);
  });

  it("finds Bulgarian times", () => {
    expect(timers("Вари 10 минути, после печи 1,5 часа.")).toEqual([
      ["10 минути", 600, "Вари"],
      ["1,5 часа", 5400, "Печи"],
    ]);
    expect(timers("Разбъркай и остави 5 до 7 мин.")).toEqual([["5 до 7 мин", 300, "Остави"]]);
    expect(timers("Сложи 2 ч. в хладилника.")[0]).toEqual(["2 ч", 7200, "Таймер"]);
  });

  it("does not read units inside other words", () => {
    expect(timers("Добави 2 чаши брашно и 3 часовника")).toEqual([]);
  });
});
