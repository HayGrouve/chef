import { describe, expect, it } from "vitest";
import { parseCommand, recognitionLang } from "../components/cook/voice";

describe("cook mode voice commands", () => {
  it("understands Bulgarian", () => {
    expect(parseCommand("Напред")).toBe("next");
    expect(parseCommand("следващата стъпка")).toBe("next");
    expect(parseCommand("назад")).toBe("back");
    expect(parseCommand("повтори")).toBe("repeat");
    expect(parseCommand("пусни таймер")).toBe("timer");
    expect(parseCommand("покажи съставките")).toBe("ingredients");
    expect(parseCommand("спри да слушаш")).toBe("stop");
  });

  it("keeps the English commands", () => {
    expect(parseCommand("next")).toBe("next");
    expect(parseCommand("go back")).toBe("back");
    expect(parseCommand("say again")).toBe("repeat");
    expect(parseCommand("start timer")).toBe("timer");
    expect(parseCommand("stop listening")).toBe("stop");
  });

  it("ignores everything else", () => {
    expect(parseCommand("колко сол")).toBeNull();
    expect(parseCommand("")).toBeNull();
  });

  it("listens in Bulgarian when the browser lists it", () => {
    expect(recognitionLang(["en-US", "bg"], "en-US")).toBe("bg-BG");
    expect(recognitionLang(["en-GB"], "en-GB")).toBe("en-GB");
    expect(recognitionLang([], "")).toBe("bg-BG");
  });
});
