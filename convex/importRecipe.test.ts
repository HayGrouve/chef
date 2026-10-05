import { expect, test } from "vitest";
import { parsePublicUrl } from "./importRecipe";

test("import refuses links to private or reserved hosts", () => {
  for (const url of [
    "http://localhost/",
    "http://localhost./",
    "http://foo.localhost/",
    "http://printer.local./",
    "http://metadata.google.internal./",
    "http://127.0.0.1/",
    "http://0.0.0.0/",
    "http://10.1.2.3/",
    "http://100.64.0.1/",
    "http://169.254.169.254/",
    "http://172.16.0.1/",
    "http://192.168.1.1/",
    "http://198.18.0.1/",
    "http://[::1]/",
    "http://2130706433/", // 127.0.0.1 as a decimal
    "ftp://example.com/",
  ]) {
    expect(() => parsePublicUrl(url), url).toThrow();
  }
  expect(parsePublicUrl("https://www.bbcgoodfood.com/recipes/x").hostname).toBe("www.bbcgoodfood.com");
  expect(parsePublicUrl("http://8.8.8.8/").hostname).toBe("8.8.8.8");
});
