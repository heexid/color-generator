import assert from "node:assert/strict";
import { contrastRatio, generateScale, normalizeHex, STEPS } from "../src/color.js";
import { paletteToDtcgJson, paletteToSvg } from "../src/exporters.js";

const scale = generateScale("#8b5cf6");
assert.equal(normalizeHex("8b5cf6"), "#8b5cf6");
assert.equal(Object.keys(scale).length, STEPS.length);
assert.equal(contrastRatio("#000000", "#ffffff").label, "21.00:1");

for (let i = 1; i < STEPS.length; i += 1) {
  assert.ok(scale[STEPS[i - 1]].oklch.l > scale[STEPS[i]].oklch.l, "lightness should descend across steps");
}

const palette = {
  scales: [{ name: "Brand Purple", baseHex: "#8b5cf6", steps: scale }],
};
assert.match(paletteToSvg(palette), /<svg/);
const figmaTokens = JSON.parse(paletteToDtcgJson(palette));
assert.equal(figmaTokens.color["brand-purple"]["500"].$type, "color");
assert.equal(figmaTokens.color["brand-purple"]["500"].$value.colorSpace, "srgb");
assert.equal(figmaTokens.color["brand-purple"]["500"].$value.components.length, 3);
assert.equal(figmaTokens.color["brand-purple"]["500"].$value.alpha, 1);
assert.match(figmaTokens.color["brand-purple"]["500"].$value.hex, /^#[0-9A-F]{6}$/);

console.log("Smoke checks passed");
