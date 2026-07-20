import { STEPS, contrastRatio, formatColor, generateScale, normalizeHex, rgbToOklch, textColorForBackground } from "./color.js";
import { downloadBlob, downloadText, paletteToDtcgJson, paletteToPngBlob, paletteToSvg } from "./exporters.js";
import { extractDominantColors } from "./imageExtractor.js";
import { createScale, loadState, saveState, shareUrl } from "./store.js";

let state = loadState();

const elements = {
  scaleCount: document.querySelector("#scaleCount"),
  scaleList: document.querySelector("#scaleList"),
  viewMount: document.querySelector("#viewMount"),
  tabs: document.querySelectorAll(".tab"),
  viewTitle: document.querySelector("#viewTitle"),
  viewSubtitle: document.querySelector("#viewSubtitle"),
  backgroundInput: document.querySelector("#backgroundInput"),
  backgroundPickerInput: document.querySelector("#backgroundPickerInput"),
  copyFormat: document.querySelector("#copyFormat"),
  addForm: document.querySelector("#addForm"),
  nameInput: document.querySelector("#nameInput"),
  hexInput: document.querySelector("#hexInput"),
  colorPickerInput: document.querySelector("#colorPickerInput"),
  hexError: document.querySelector("#hexError"),
  imageInput: document.querySelector("#imageInput"),
  imageColors: document.querySelector("#imageColors"),
  themeToggle: document.querySelector("#themeToggle"),
  toast: document.querySelector("#toast"),
};

const viewCopy = {
  theme: ["Theme colors", "Full 95-950 color scales. Scroll horizontally to inspect and copy each swatch."],
  gradient: ["Gradient", "Five gradients per color scale, plus one combined palette gradient from your added colors."],
};

bindEvents();
render();

function bindEvents() {
  elements.colorPickerInput.addEventListener("input", () => {
    elements.hexInput.value = elements.colorPickerInput.value;
    updateColorPickerSwatch();
  });

  elements.hexInput.addEventListener("input", () => {
    const hex = normalizeHex(elements.hexInput.value);
    elements.hexInput.toggleAttribute("aria-invalid", !hex);
    if (hex) {
      elements.colorPickerInput.value = hex;
      updateColorPickerSwatch();
    }
  });

  elements.addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const hex = normalizeHex(elements.hexInput.value);
    elements.hexError.hidden = Boolean(hex);
    elements.hexInput.toggleAttribute("aria-invalid", !hex);
    if (!hex) return;
    state.scales.push(createScale(elements.nameInput.value.trim() || "New Color", hex));
    elements.hexInput.value = hex;
    elements.colorPickerInput.value = hex;
    updateColorPickerSwatch();
    persistAndRender();
  });

  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeView = tab.dataset.view;
      persistAndRender();
    });
  });

  elements.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    persistAndRender();
  });

  elements.backgroundPickerInput.addEventListener("change", () => {
    state.background = elements.backgroundPickerInput.value;
    elements.backgroundInput.value = state.background;
    updateBackgroundPickerSwatch();
    persistAndRender();
  });

  elements.backgroundInput.addEventListener("input", () => {
    const hex = normalizeHex(elements.backgroundInput.value);
    elements.backgroundInput.toggleAttribute("aria-invalid", !hex);
    if (hex) {
      elements.backgroundPickerInput.value = hex;
      updateBackgroundPickerSwatch();
    }
  });

  elements.backgroundInput.addEventListener("change", () => {
    const hex = normalizeHex(elements.backgroundInput.value);
    if (!hex) {
      showToast("Invalid background color");
      elements.backgroundInput.value = state.background;
      elements.backgroundInput.removeAttribute("aria-invalid");
      return;
    }
    state.background = hex;
    elements.backgroundPickerInput.value = hex;
    updateBackgroundPickerSwatch();
    persistAndRender();
  });

  elements.copyFormat.addEventListener("change", () => {
    state.copyFormat = elements.copyFormat.value;
    persistAndRender();
  });

  document.querySelector("#sortNameButton").addEventListener("click", () => {
    state.scales.sort((a, b) => a.name.localeCompare(b.name));
    persistAndRender();
  });

  document.querySelector("#sortHueButton").addEventListener("click", () => {
    state.scales.sort((a, b) => rgbToOklch(a.steps[500].rgb).h - rgbToOklch(b.steps[500].rgb).h);
    persistAndRender();
  });

  document.querySelector("#svgButton").addEventListener("click", () => {
    downloadText("color-scales.svg", "image/svg+xml", paletteToSvg(state));
  });

  document.querySelector("#jsonButton").addEventListener("click", () => {
    downloadText("figma-color-variables.json", "application/json", paletteToDtcgJson(state));
  });

  document.querySelector("#pngButton").addEventListener("click", async () => {
    const blob = await paletteToPngBlob(state);
    downloadBlob("color-scales.png", blob);
  });

  document.querySelector("#shareButton").addEventListener("click", async () => {
    await copyText(shareUrl(state));
    showToast("Share link copied");
  });

  elements.imageInput.addEventListener("change", async () => {
    const file = elements.imageInput.files?.[0];
    if (!file) return;
    elements.imageColors.textContent = "Reading image...";
    const colors = await extractDominantColors(file);
    elements.imageColors.innerHTML = "";
    colors.forEach((hex, index) => {
      const button = document.createElement("button");
      button.className = "image-color";
      button.type = "button";
      button.title = `Add ${hex}`;
      button.style.background = hex;
      button.addEventListener("click", () => {
        state.scales.push(createScale(`Image ${index + 1}`, hex));
        persistAndRender();
        showToast(`${hex} added`);
      });
      elements.imageColors.append(button);
    });
  });
}

function render() {
  if (!viewCopy[state.activeView]) state.activeView = "theme";
  const isDark = state.theme === "dark";
  document.body.dataset.theme = isDark ? "dark" : "light";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.querySelector(".theme-icon").textContent = isDark ? "☀" : "☾";
  elements.themeToggle.querySelector(".theme-label").textContent = isDark ? "Light" : "Dark";
  elements.scaleCount.textContent = state.scales.length;
  elements.backgroundInput.value = state.background;
  elements.backgroundPickerInput.value = state.background;
  elements.copyFormat.value = state.copyFormat;
  elements.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === state.activeView));
  elements.viewTitle.textContent = viewCopy[state.activeView][0];
  elements.viewSubtitle.textContent = viewCopy[state.activeView][1];
  updateColorPickerSwatch();
  updateBackgroundPickerSwatch();
  renderScaleList();
  renderView();
}

function renderScaleList() {
  elements.scaleList.innerHTML = "";
  state.scales.forEach((scale, index) => {
    const card = document.createElement("article");
    card.className = "scale-card";
    card.innerHTML = `
      <div class="scale-card-header">
        <input class="scale-name" value="${escapeHtml(scale.name)}" aria-label="Scale name" />
        <label class="scale-color-picker" title="Pick ${escapeHtml(scale.name)} color">
          <input class="scale-color-input" type="color" value="${scale.baseHex}" aria-label="Pick base color" />
          <span aria-hidden="true" style="background:${scale.baseHex}"></span>
        </label>
        <input class="scale-hex" value="${scale.baseHex}" aria-label="Base hex color" />
      </div>
      <div class="mini-preview">${STEPS.map((step) => `<span style="background:${scale.steps[step].hex}"></span>`).join("")}</div>
      <div class="card-actions">
        <button class="icon-only" type="button" data-action="up" title="Move up">${icon("arrowUp")}<span class="sr-only">Move up</span></button>
        <button class="icon-only" type="button" data-action="down" title="Move down">${icon("arrowDown")}<span class="sr-only">Move down</span></button>
        <button class="icon-only" type="button" data-action="copy" title="Copy base color">${icon("copy")}<span class="sr-only">Copy base color</span></button>
        <button class="icon-only danger-action" type="button" data-action="delete" title="Delete">${icon("delete")}<span class="sr-only">Delete</span></button>
      </div>
    `;
    card.querySelector(".scale-name").addEventListener("change", (event) => {
      scale.name = event.target.value.trim() || "Color";
      persistAndRender();
    });
    card.querySelector(".scale-hex").addEventListener("change", (event) => {
      const hex = normalizeHex(event.target.value);
      if (!hex) {
        event.target.value = scale.baseHex;
        showToast("Invalid hex color");
        return;
      }
      scale.baseHex = hex;
      scale.steps = generateScale(hex);
      persistAndRender();
    });
    card.querySelector(".scale-color-input").addEventListener("change", (event) => {
      scale.baseHex = event.target.value;
      scale.steps = generateScale(scale.baseHex);
      persistAndRender();
    });
    card.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.action;
        if (action === "delete") state.scales.splice(index, 1);
        if (action === "up" && index > 0) swap(index, index - 1);
        if (action === "down" && index < state.scales.length - 1) swap(index, index + 1);
        if (action === "copy") {
          await copyText(formatColor(scale.baseHex, state.copyFormat));
          showToast(`${scale.name} copied`);
        }
        persistAndRender();
      });
    });
    elements.scaleList.append(card);
  });
}

function renderView() {
  if (state.activeView === "gradient") return renderGradient();
  return renderTheme();
}

function renderTheme() {
  const canvasText = textColorForBackground(state.background);
  elements.viewMount.innerHTML = `<div class="scale-scroll" style="--canvas-bg:${state.background};--canvas-text:${canvasText}"><div class="theme-grid">
    <div class="grid-header">Scale</div>
    ${STEPS.map((step) => `<div class="grid-header">${step}</div>`).join("")}
  </div></div>`;
  const grid = elements.viewMount.querySelector(".theme-grid");
  grid.style.gridTemplateColumns = `160px repeat(${STEPS.length}, minmax(124px, 1fr))`;
  state.scales.forEach((scale) => {
    grid.insertAdjacentHTML("beforeend", `<div class="row-label"><strong>${escapeHtml(scale.name)}</strong><span>${scale.baseHex}</span></div>`);
    STEPS.forEach((step) => {
      const color = scale.steps[step];
      const contrast = contrastRatio(color.hex, state.background);
      const button = document.createElement("button");
      button.className = "swatch";
      button.type = "button";
      button.style.setProperty("--swatch", color.hex);
      button.style.setProperty("--swatch-text", textColorForBackground(color.hex));
      button.innerHTML = `<strong>${step}</strong><span>${color.hex}</span><span class="ratio-pill">${contrast.label} ${contrast.aaa ? "AAA" : contrast.aa ? "AA" : ""}</span>`;
      button.addEventListener("click", async () => {
        await copyText(formatColor(color.hex, state.copyFormat));
        showToast(`${formatColor(color.hex, state.copyFormat)} copied`);
      });
      grid.append(button);
    });
  });
}

function renderGradient() {
  if (!state.scales.length) {
    elements.viewMount.innerHTML = `<div class="empty-state"><h3>Add a color scale to generate gradients</h3><p>Gradients are built from the colors in your palette.</p></div>`;
    return;
  }

  const combined = buildCombinedGradient();
  elements.viewMount.innerHTML = `
    <div class="gradient-workspace">
      <div class="gradient-toolbar">
        <div>
          <strong>Generated gradients</strong>
          <p>Each color scale gets five gradients using only its own generated steps.</p>
        </div>
        <button id="randomGradientButton" class="soft-action" type="button">${icon("shuffle")}<span>Randomize</span></button>
      </div>
      ${state.scales.map((scale, scaleIndex) => `
        <section class="scale-gradient-section">
          <div class="scale-gradient-heading">
            <strong>${escapeHtml(scale.name)}</strong>
            <span>${scale.baseHex}</span>
          </div>
          <div class="gradient-list">
            ${buildScaleGradients(scale, scaleIndex).map((gradient, index) => gradientCard(gradient, `${scale.name} ${index + 1}`)).join("")}
          </div>
        </section>
      `).join("")}
      <section class="combined-gradient">
        <div>
          <strong>Combined palette gradient</strong>
          <p>Uses the base color from every scale in the current palette.</p>
        </div>
        ${gradientCard(combined, "Combined", true)}
      </section>
    </div>
  `;

  document.querySelector("#randomGradientButton").addEventListener("click", () => {
    state.gradientSeed = (state.gradientSeed || 1) + 1;
    persistAndRender();
  });

  document.querySelectorAll("[data-copy-gradient]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyText(button.dataset.copyGradient);
      showToast("Gradient copied");
    });
  });

  document.querySelectorAll("[data-download-gradient]").forEach((button) => {
    button.addEventListener("click", () => {
      downloadGradient(button.dataset.downloadGradient, button.dataset.gradientName);
    });
  });
}

function gradientCard(gradient, name, wide = false) {
  const escapedGradient = escapeHtml(gradient);
  return `
    <article class="gradient-card ${wide ? "is-wide" : ""}">
      <div class="gradient-swatch" style="background:${escapedGradient}"></div>
      <div class="gradient-meta">
        <strong>${escapeHtml(name)}</strong>
        <code>${escapedGradient}</code>
      </div>
      <div class="gradient-actions">
        <button type="button" data-copy-gradient="${escapedGradient}">${icon("copy")}<span>Copy</span></button>
        <button type="button" data-download-gradient="${escapedGradient}" data-gradient-name="${escapeHtml(name.toLowerCase().replaceAll(" ", "-"))}">${icon("download")}<span>Download</span></button>
      </div>
    </article>
  `;
}

function updateColorPickerSwatch() {
  const hex = normalizeHex(elements.hexInput.value) || elements.colorPickerInput.value;
  document.querySelector(".color-picker-swatch").style.background = hex;
}

function updateBackgroundPickerSwatch() {
  const hex = normalizeHex(elements.backgroundInput.value) || elements.backgroundPickerInput.value;
  document.querySelector(".background-picker-swatch").style.background = hex;
}

function buildScaleGradients(scale, scaleIndex) {
  const colors = gradientSourceColors(scale);
  if (colors.length < 2) return [];
  const random = seededRandom((state.gradientSeed || 1) + scaleIndex * 97);
  return Array.from({ length: 5 }, (_, index) => {
    const angle = [90, 120, 135, 160, 210][index];
    const stopCount = 2 + Math.floor(random() * 2);
    const stops = [];
    while (stops.length < stopCount) {
      const color = colors[Math.floor(random() * colors.length)];
      if (!stops.includes(color)) stops.push(color);
    }
    return `linear-gradient(${angle}deg, ${stops.join(", ")})`;
  });
}

function buildCombinedGradient() {
  const colors = state.scales.map((scale) => scale.baseHex);
  if (colors.length === 1) return `linear-gradient(135deg, ${colors[0]}, ${state.scales[0].steps[950].hex})`;
  return `linear-gradient(135deg, ${colors.join(", ")})`;
}

function gradientSourceColors(scale) {
  return [
    scale.steps[100].hex,
    scale.steps[300].hex,
    scale.steps[500].hex,
    scale.steps[700].hex,
    scale.steps[900].hex,
  ];
}

function downloadGradient(gradient, name) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720"><foreignObject width="1200" height="720"><div xmlns="http://www.w3.org/1999/xhtml" style="width:1200px;height:720px;background:${escapeAttribute(gradient)}"></div></foreignObject></svg>`;
  downloadText(`${name || "gradient"}.svg`, "image/svg+xml", svg);
}

function seededRandom(seed) {
  let value = seed * 9301 + 49297;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function persistAndRender() {
  saveState(state);
  render();
}

function swap(from, to) {
  const [item] = state.scales.splice(from, 1);
  state.scales.splice(to, 0, item);
}

async function copyText(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

function escapeHtml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&#039;",
  })[char]);
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}

function icon(name) {
  const paths = {
    arrowUp: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>',
    delete: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
  };
  return `<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ""}</svg>`;
}
