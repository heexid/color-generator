import { STEPS, textColorForBackground } from "./color.js";

export function paletteToSvg(palette) {
  const cellWidth = 132;
  const cellHeight = 76;
  const labelWidth = 164;
  const headerHeight = 54;
  const width = labelWidth + STEPS.length * cellWidth;
  const height = headerHeight + palette.scales.length * cellHeight;
  const rows = palette.scales
    .map((scale, rowIndex) => {
      const y = headerHeight + rowIndex * cellHeight;
      const swatches = STEPS.map((step, columnIndex) => {
        const color = scale.steps[step].hex;
        const x = labelWidth + columnIndex * cellWidth;
        const text = textColorForBackground(color);
        return `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${color}"/><text x="${x + 12}" y="${y + 30}" fill="${text}" font-size="14" font-family="Inter, Arial">${step}</text><text x="${x + 12}" y="${y + 53}" fill="${text}" font-size="12" font-family="Inter, Arial">${color}</text>`;
      }).join("");
      return `<text x="24" y="${y + 44}" fill="#f4f4f5" font-size="18" font-family="Inter, Arial" font-weight="700">${escapeXml(scale.name)}</text>${swatches}`;
    })
    .join("");
  const headers = STEPS.map((step, index) => {
    const x = labelWidth + index * cellWidth + 12;
    return `<text x="${x}" y="34" fill="#a1a1aa" font-size="13" font-family="Inter, Arial">${step}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#18181b"/>${headers}${rows}</svg>`;
}

export function paletteToDtcgJson(palette) {
  const tokens = {
    color: {
      $description: "Generated color scales for Figma Variables import",
    },
  };
  palette.scales.forEach((scale) => {
    tokens.color[slug(scale.name)] = {
      $description: `Generated from ${scale.baseHex}`,
    };
    STEPS.forEach((step) => {
      const color = scale.steps[step];
      tokens.color[slug(scale.name)][step] = {
        $type: "color",
        $value: figmaColorValue(color),
        $extensions: {
          "com.figma": {
            hiddenFromPublishing: false,
            scopes: ["ALL_SCOPES"],
          },
        },
      };
    });
  });
  return JSON.stringify(tokens, null, 2);
}

export function downloadText(filename, mimeType, text) {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function paletteToPngBlob(palette) {
  const scale = 2;
  const cellWidth = 132;
  const cellHeight = 76;
  const labelWidth = 164;
  const headerHeight = 54;
  const canvas = document.createElement("canvas");
  canvas.width = (labelWidth + STEPS.length * cellWidth) * scale;
  canvas.height = (headerHeight + palette.scales.length * cellHeight) * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "13px Inter, Arial";
  ctx.fillStyle = "#a1a1aa";
  STEPS.forEach((step, index) => ctx.fillText(step, labelWidth + index * cellWidth + 12, 34));
  palette.scales.forEach((colorScale, rowIndex) => {
    const y = headerHeight + rowIndex * cellHeight;
    ctx.font = "700 18px Inter, Arial";
    ctx.fillStyle = "#f4f4f5";
    ctx.fillText(colorScale.name, 24, y + 44);
    STEPS.forEach((step, columnIndex) => {
      const x = labelWidth + columnIndex * cellWidth;
      const color = colorScale.steps[step].hex;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellWidth, cellHeight);
      ctx.fillStyle = textColorForBackground(color);
      ctx.font = "14px Inter, Arial";
      ctx.fillText(step, x + 12, y + 30);
      ctx.font = "12px Inter, Arial";
      ctx.fillText(color, x + 12, y + 53);
    });
  });
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "color";
}

function figmaColorValue(color) {
  return {
    colorSpace: "srgb",
    components: [
      toFigmaChannel(color.rgb.r),
      toFigmaChannel(color.rgb.g),
      toFigmaChannel(color.rgb.b),
    ],
    alpha: 1,
    hex: color.hex.toUpperCase(),
  };
}

function toFigmaChannel(value) {
  return Number((value / 255).toFixed(10));
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&apos;",
  })[char]);
}
