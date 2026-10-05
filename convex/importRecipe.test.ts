import { expect, test } from "vitest";
import { isReservedAddress, parsePublicUrl } from "./publicUrl";

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

test("DNS answers pointing at private networks are refused", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.5",
    "100.100.100.100",
    "169.254.169.254",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "64:ff9b::a00:1", // NAT64 for 10.0.0.1
    "2002:7f00:1::", // 6to4 for 127.0.0.1
    "fc00::1",
    "fd12:3456::1",
    "fe80::1%eth0",
    "ff02::1",
    "2001:db8::1",
    "not-an-ip",
  ]) {
    expect(isReservedAddress(address), address).toBe(true);
  }
  for (const address of ["8.8.8.8", "151.101.1.69", "2606:4700::6810:84e5", "::ffff:8.8.8.8", "64:ff9b::808:808"]) {
    expect(isReservedAddress(address), address).toBe(false);
  }
});
