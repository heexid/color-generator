import { generateScale, normalizeHex } from "./color.js";

const STORAGE_KEY = "codex-color-scale-platform";

export function createScale(name, baseHex) {
  const hex = normalizeHex(baseHex);
  if (!hex) throw new Error("Invalid hex color");
  return {
    id: crypto.randomUUID(),
    name: name || "Color",
    baseHex: hex,
    steps: generateScale(hex),
  };
}

export function defaultState() {
  return {
    scales: [
      createScale("Red", "#ef4444"),
      createScale("Green", "#22c55e"),
      createScale("Blue", "#3b82f6"),
      createScale("Yellow", "#eab308"),
      createScale("Grey", "#6b7280"),
    ],
    background: "#ffffff",
    activeView: "theme",
    gradientSeed: 1,
    theme: "light",
    activeScaleId: null,
    copyFormat: "hex",
  };
}

export function loadState() {
  const params = new URLSearchParams(location.search);
  const shared = params.get("palette");
  const stored = shared || localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultState();
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(stored))));
    return hydrate(parsed);
  } catch {
    try {
      return hydrate(JSON.parse(stored));
    } catch {
      return defaultState();
    }
  }
}

export function saveState(state) {
  const lean = serializeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lean));
}

export function shareUrl(state) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(serializeState(state)))));
  const url = new URL(location.href);
  url.searchParams.set("palette", encoded);
  return url.toString();
}

function hydrate(raw) {
  const activeView = raw.activeView === "preview" ? "gradient" : raw.activeView;
  const rawScales = isOldDemoPalette(raw.scales) ? defaultState().scales : (raw.scales || []).map((scale) => createScale(scale.name, scale.baseHex));
  const state = {
    ...defaultState(),
    ...raw,
    activeView,
    scales: rawScales,
  };
  if (!state.scales.length) state.scales = defaultState().scales;
  return state;
}

function isOldDemoPalette(scales = []) {
  const names = scales.map((scale) => scale.name).join("|");
  const colors = scales.map((scale) => normalizeHex(scale.baseHex)).join("|");
  return names === "Brand Purple|Ocean|Danger" && colors === "#8b5cf6|#0ea5e9|#ef4444";
}

function serializeState(state) {
  return {
    scales: state.scales.map(({ name, baseHex }) => ({ name, baseHex })),
    background: state.background,
    activeView: ["theme", "gradient"].includes(state.activeView) ? state.activeView : "theme",
    gradientSeed: state.gradientSeed || 1,
    theme: state.theme === "dark" ? "dark" : "light",
    copyFormat: state.copyFormat,
  };
}
