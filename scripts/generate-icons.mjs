// Regenerates app/PWA icons from the lucide ChefHat glyph.
// Usage: node scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const BG = "#0a0a0a";
const DISC = "#20150e";
const ORANGE = "#dd7032";
const HAT =
  '<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>';

// All artwork is drawn on a 512 canvas; `fullBleed` fills the square so
// launchers never show a white/transparent backdrop.
function svg({ fullBleed, hatScale }) {
  const hatSize = 24 * hatScale;
  const offset = (512 - hatSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${fullBleed ? `<rect width="512" height="512" fill="${BG}"/>` : `<circle cx="256" cy="256" r="256" fill="${BG}"/>`}
  <circle cx="256" cy="256" r="${fullBleed ? 176 : 196}" fill="${DISC}"/>
  <g transform="translate(${offset} ${offset}) scale(${hatScale})" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${HAT}</g>
</svg>`;
}

const any = svg({ fullBleed: false, hatScale: 9 });
// Maskable: keep the glyph inside the 80% safe zone.
const maskable = svg({ fullBleed: true, hatScale: 8 });

const png = (src, size, out) =>
  sharp(Buffer.from(src), { density: 72 * (size / 512) * 4 })
    .resize(size, size)
    .png()
    .toFile(out);

await writeFile("app/icon.svg", any);
await png(any, 192, "public/icons/icon-192.png");
await png(any, 512, "public/icons/icon-512.png");
await png(maskable, 192, "public/icons/icon-maskable-192.png");
await png(maskable, 512, "public/icons/icon-maskable-512.png");
// iOS masks corners itself and renders transparency as black: use full bleed.
await png(maskable, 180, "app/apple-icon.png");
console.log("icons generated");
