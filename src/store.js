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
      createScale("Brand Purple", "#8b5cf6"),
      createScale("Ocean", "#0ea5e9"),
      createScale("Danger", "#ef4444"),
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
  const state = {
    ...defaultState(),
    ...raw,
    activeView,
    scales: (raw.scales || []).map((scale) => createScale(scale.name, scale.baseHex)),
  };
  if (!state.scales.length) state.scales = defaultState().scales;
  return state;
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
