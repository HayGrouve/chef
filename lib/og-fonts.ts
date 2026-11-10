// Geist with Cyrillic for next/og images; Satori's default font has none.
// Edge runtime: the font files are bundled as assets and fetched.
export async function ogFonts() {
  const load = (url: URL) => fetch(url).then((res) => res.arrayBuffer());
  const [regular, bold] = await Promise.all([
    load(new URL("../assets/fonts/Geist-400.ttf", import.meta.url)),
    load(new URL("../assets/fonts/Geist-700.ttf", import.meta.url)),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}
