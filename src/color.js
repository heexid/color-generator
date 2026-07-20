export const STEPS = [95, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const TARGET_LIGHTNESS = {
  95: 0.97,
  100: 0.932,
  200: 0.882,
  300: 0.809,
  400: 0.707,
  500: 0.623,
  600: 0.546,
  700: 0.488,
  800: 0.424,
  900: 0.379,
  950: 0.282,
};

const TARGET_CHROMA_RATIO = {
  95: 0.057,
  100: 0.131,
  200: 0.241,
  300: 0.429,
  400: 0.673,
  500: 0.873,
  600: 1,
  700: 0.992,
  800: 0.812,
  900: 0.596,
  950: 0.371,
};

export function normalizeHex(value) {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split("").map((char) => char + char).join("").toLowerCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

export function hexToRgb(hex) {
  const clean = normalizeHex(hex);
  if (!clean) throw new Error(`Invalid hex color: ${hex}`);
  const int = Number.parseInt(clean.slice(1), 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

export function rgbToHsl({ r, g, b }) {
  const sr = r / 255;
  const sg = g / 255;
  const sb = b / 255;
  const max = Math.max(sr, sg, sb);
  const min = Math.min(sr, sg, sb);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === sr) hue = (sg - sb) / delta + (sg < sb ? 6 : 0);
    if (max === sg) hue = (sb - sr) / delta + 2;
    if (max === sb) hue = (sr - sg) / delta + 4;
    hue *= 60;
  }

  return { h: hue, s: saturation * 100, l: lightness * 100 };
}

export function formatColor(hex, format) {
  const rgb = hexToRgb(hex);
  if (format === "rgb") return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
  if (format === "hsl") {
    const hsl = rgbToHsl(rgb);
    return `hsl(${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%)`;
  }
  if (format === "oklch") {
    const oklch = rgbToOklch(rgb);
    return `oklch(${(oklch.l * 100).toFixed(1)}% ${oklch.c.toFixed(3)} ${Math.round(oklch.h)})`;
  }
  return normalizeHex(hex);
}

export function generateScale(baseHex) {
  const base = rgbToOklch(hexToRgb(baseHex));
  const seedStep = nearestStep(base.l);
  const seedChromaRatio = TARGET_CHROMA_RATIO[seedStep] || 1;

  return Object.fromEntries(
    STEPS.map((step) => {
      const c = base.c * (TARGET_CHROMA_RATIO[step] / seedChromaRatio);
      const rgb = oklchToDisplayRgb({ l: TARGET_LIGHTNESS[step], c, h: base.h });
      const hex = rgbToHex(rgb);
      const hsl = rgbToHsl(rgb);
      const oklch = rgbToOklch(rgb);

      return [
        step,
        {
          step,
          hex,
          rgb,
          hsl,
          oklch,
        },
      ];
    }),
  );
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return {
    ratio,
    label: `${ratio.toFixed(2)}:1`,
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
  };
}

export function textColorForBackground(hex) {
  return contrastRatio("#111111", hex).ratio > contrastRatio("#ffffff", hex).ratio ? "#111111" : "#ffffff";
}

export function rgbToOklch({ r, g, b }) {
  const sr = linearize(r / 255);
  const sg = linearize(g / 255);
  const sb = linearize(b / 255);

  const l = 0.4122214708 * sr + 0.5363325363 * sg + 0.0514459929 * sb;
  const m = 0.2119034982 * sr + 0.6806995451 * sg + 0.1073969566 * sb;
  const s = 0.0883024619 * sr + 0.2817188376 * sg + 0.6299787005 * sb;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const okL = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const okA = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const okB = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  const c = Math.sqrt(okA * okA + okB * okB);
  const h = (Math.atan2(okB, okA) * 180) / Math.PI;

  return { l: okL, c, h: h < 0 ? h + 360 : h };
}

function oklchToDisplayRgb(oklch) {
  let chroma = oklch.c;
  for (let i = 0; i < 24; i += 1) {
    const rgb = oklchToRgb({ ...oklch, c: chroma });
    if (inGamut(rgb)) return rgb;
    chroma *= 0.92;
  }
  return clampRgb(oklchToRgb({ ...oklch, c: 0 }));
}

function oklchToRgb({ l, c, h }) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);

  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;

  const lmsL = lRoot ** 3;
  const lmsM = mRoot ** 3;
  const lmsS = sRoot ** 3;

  const red = 4.0767416621 * lmsL - 3.3077115913 * lmsM + 0.2309699292 * lmsS;
  const green = -1.2684380046 * lmsL + 2.6097574011 * lmsM - 0.3413193965 * lmsS;
  const blue = -0.0041960863 * lmsL - 0.7034186147 * lmsM + 1.707614701 * lmsS;

  return {
    r: delinearize(red) * 255,
    g: delinearize(green) * 255,
    b: delinearize(blue) * 255,
  };
}

function nearestStep(lightness) {
  return STEPS.reduce((nearest, step) => {
    const currentDistance = Math.abs(TARGET_LIGHTNESS[step] - lightness);
    const nearestDistance = Math.abs(TARGET_LIGHTNESS[nearest] - lightness);
    return currentDistance < nearestDistance ? step : nearest;
  }, 500);
}

function linearize(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function delinearize(value) {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

function inGamut({ r, g, b }) {
  return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
}

function clampRgb(rgb) {
  return {
    r: clamp(rgb.r, 0, 255),
    g: clamp(rgb.g, 0, 255),
    b: clamp(rgb.b, 0, 255),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
