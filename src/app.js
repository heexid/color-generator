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
  copyFormat: document.querySelector("#copyFormat"),
  addForm: document.querySelector("#addForm"),
  nameInput: document.querySelector("#nameInput"),
  hexInput: document.querySelector("#hexInput"),
  hexError: document.querySelector("#hexError"),
  imageInput: document.querySelector("#imageInput"),
  imageColors: document.querySelector("#imageColors"),
  themeToggle: document.querySelector("#themeToggle"),
  toast: document.querySelector("#toast"),
};

const viewCopy = {
  theme: ["Theme colors", "Full 95-950 color scales. Scroll horizontally to inspect and copy each swatch."],
  gradient: ["Gradient", "Five generated gradients plus one combined palette gradient from your added colors."],
};

bindEvents();
render();

function bindEvents() {
  elements.addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const hex = normalizeHex(elements.hexInput.value);
    elements.hexError.hidden = Boolean(hex);
    elements.hexInput.toggleAttribute("aria-invalid", !hex);
    if (!hex) return;
    state.scales.push(createScale(elements.nameInput.value.trim() || "New Color", hex));
    elements.hexInput.value = "";
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

  elements.backgroundInput.addEventListener("change", () => {
    const hex = normalizeHex(elements.backgroundInput.value);
    if (!hex) {
      showToast("Invalid background color");
      elements.backgroundInput.value = state.background;
      return;
    }
    state.background = hex;
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
  elements.copyFormat.value = state.copyFormat;
  elements.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === state.activeView));
  elements.viewTitle.textContent = viewCopy[state.activeView][0];
  elements.viewSubtitle.textContent = viewCopy[state.activeView][1];
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
        <input class="scale-hex" value="${scale.baseHex}" aria-label="Base hex color" />
      </div>
      <div class="mini-preview">${STEPS.map((step) => `<span style="background:${scale.steps[step].hex}"></span>`).join("")}</div>
      <div class="card-actions">
        <button type="button" data-action="up" title="Move up">Up</button>
        <button type="button" data-action="down" title="Move down">Down</button>
        <button type="button" data-action="copy" title="Copy base color">Copy</button>
        <button type="button" data-action="delete" title="Delete">Del</button>
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
  elements.viewMount.innerHTML = `<div class="scale-scroll"><div class="theme-grid">
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
  const gradients = buildGradients();
  if (!gradients.length) {
    elements.viewMount.innerHTML = `<div class="empty-state"><h3>Add a color scale to generate gradients</h3><p>Gradients are built from the colors in your palette.</p></div>`;
    return;
  }

  const combined = buildCombinedGradient();
  elements.viewMount.innerHTML = `
    <div class="gradient-workspace">
      <div class="gradient-toolbar">
        <div>
          <strong>Generated gradients</strong>
          <p>Randomized from your added colors and their scale steps.</p>
        </div>
        <button id="randomGradientButton" type="button">Randomize</button>
      </div>
      <section class="gradient-list">
        ${gradients.map((gradient, index) => gradientCard(gradient, `Gradient ${index + 1}`)).join("")}
      </section>
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
        <button type="button" data-copy-gradient="${escapedGradient}">Copy</button>
        <button type="button" data-download-gradient="${escapedGradient}" data-gradient-name="${escapeHtml(name.toLowerCase().replaceAll(" ", "-"))}">Download</button>
      </div>
    </article>
  `;
}

function buildGradients() {
  const colors = gradientSourceColors();
  if (colors.length < 2) return [];
  const random = seededRandom(state.gradientSeed || 1);
  return Array.from({ length: 5 }, (_, index) => {
    const angle = [90, 120, 135, 160, 210][index];
    const stopCount = 2 + Math.floor(random() * Math.min(3, colors.length - 1));
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

function gradientSourceColors() {
  return state.scales.flatMap((scale) => [
    scale.steps[100].hex,
    scale.steps[300].hex,
    scale.steps[500].hex,
    scale.steps[700].hex,
    scale.steps[900].hex,
  ]);
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
