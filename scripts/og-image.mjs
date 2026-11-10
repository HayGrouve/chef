// Renders the images with words on them: app/opengraph-image.png (the
// site-wide social preview) and public/mission.png (the about page).
// Run from the repo root after changing them: node scripts/og-image.mjs "$PWD"
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const root = process.argv[2];
const require = createRequire(root + "/package.json");
const { ImageResponse } = require("next/og");
const React = require("react");
const h = React.createElement;
const font = (w) => readFileSync(`${root}/assets/fonts/Geist-${w}.ttf`);
const fonts = [
  { name: "Geist", data: font(400), weight: 400, style: "normal" },
  { name: "Geist", data: font(700), weight: 700, style: "normal" },
];

async function render(path, element, width, height) {
  const img = new ImageResponse(element, { width, height, fonts });
  writeFileSync(`${root}/${path}`, Buffer.from(await img.arrayBuffer()));
  console.log("written", path);
}

await render(
  "app/opengraph-image.png",
  h("div", { style: { display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "72px 80px", background: "#0a0a0a", color: "#f5f5f5", fontFamily: "Geist" } },
    h("div", { style: { display: "flex", fontSize: 30, color: "#a3a3a3", fontWeight: 400 } }, "Твоята готварска книга"),
    h("div", { style: { display: "flex", flexDirection: "column" } },
      h("div", { style: { display: "flex", fontSize: 64, color: "#a3a3a3", fontWeight: 400, lineHeight: 1 } }, "онова за"),
      h("div", { style: { display: "flex", fontSize: 168, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, marginTop: 8 } }, "кухнята", h("span", { style: { color: "#f2613f", marginLeft: -26 } }, "."))
    ),
    h("div", { style: { display: "flex", fontSize: 30, color: "#d4d4d4", fontWeight: 400 } }, "Рецепти, план за седмицата и списък за пазаруване.")
  ),
  1200,
  630
);

// lucide's chef-hat, drawn in the brand orange
const chefHat = h("svg", { width: 220, height: 220, viewBox: "0 0 24 24", fill: "none", stroke: "#f0731f", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" },
  h("path", { d: "M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" }),
  h("path", { d: "M6 17h12" })
);

await render(
  "public/mission.png",
  h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#2a1a12", color: "#f0731f", fontFamily: "Geist" } },
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: 340, height: 340, borderRadius: 170, background: "#1c110b" } }, chefHat),
    h("div", { style: { display: "flex", fontSize: 150, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 64, lineHeight: 1 } }, "кухнята", h("span", { style: { color: "#f5f5f5", marginLeft: -22 } }, "."))
  ),
  1024,
  1024
);
