# Color Generator

Generate production-ready color scales from a single HEX color.

Color Generator creates consistent **50–950 color shades** from one or multiple base colors, making it easy to build design systems, Tailwind themes, CSS variables, and design tokens.

---

## Features

✨ Generate 11 color shades (50 → 950)

🎨 Support multiple brand colors

📦 Multiple output formats

- HEX
- RGB
- HSL

🧩 Flexible output structure

- Nested object
- Flat object
- Array

⚡ Lightweight

🟦 Written in TypeScript

---

## Installation

```bash
npm install @nousantx/color-generator
```

---

## Quick Start

```ts
import { generateColors } from "@nousantx/color-generator";

const palette = generateColors({
  option: {
    format: "object2",
    output: "hex",
  },
  color: {
    primary: "#4F46E5",
  },
});

console.log(palette);
```

Output

```ts
{
  "primary-50": "#EEF2FF",
  "primary-100": "#E0E7FF",
  "primary-200": "#C7D2FE",
  ...
  "primary-900": "#312E81",
  "primary-950": "#1E1B4B"
}
```

---

## Multiple Colors

Generate palettes for multiple brand colors at once.

```ts
generateColors({
  option: {
    format: "object2",
    output: "hex",
  },
  color: {
    primary: "#3B82F6",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
});
```

---

## Configuration

### Output Format

Choose the color value format.

```ts
output: "hex"
```

Available options

| Value | Description |
|--------|-------------|
| `hex` | Hexadecimal color |
| `rgb` | RGB string |
| `hsl` | HSL string |

---

### Format

Choose how generated colors are returned.

```ts
format: "object2"
```

Example:

Nested object

```ts
{
  primary: {
    50: "...",
    100: "...",
    ...
  }
}
```

Flat object

```ts
{
  "primary-50": "...",
  "primary-100": "...",
  ...
}
```

Array

```ts
[
  {
    name: "primary",
    shade: 50,
    value: "#EEF2FF"
  }
]
```

---

## API

### generateColors()

```ts
generateColors({
  option,
  color,
});
```

### option

| Property | Type | Default |
|----------|------|----------|
| output | `"hex" \| "rgb" \| "hsl"` | `"hex"` |
| format | `"object" \| "object2" \| "array"` | `"object"` |

### color

```ts
{
  [name: string]: "#RRGGBB"
}
```

Example

```ts
{
  primary: "#3B82F6",
  secondary: "#8B5CF6"
}
```

---

## Generated Shades

Each input color generates the following scale.

```
50
100
200
300
400
500
600
700
800
900
950
```

Perfect for:

- Design Systems
- Tailwind CSS
- CSS Variables
- Design Tokens
- Figma Variables
- UI Libraries

---

## Example

Input

```ts
{
  primary: "#3B82F6"
}
```

Output

```ts
{
  "primary-50": "...",
  "primary-100": "...",
  "primary-200": "...",
  "primary-300": "...",
  "primary-400": "...",
  "primary-500": "...",
  "primary-600": "...",
  "primary-700": "...",
  "primary-800": "...",
  "primary-900": "...",
  "primary-950": "..."
}
```

---

## Requirements

- Valid 6-digit HEX colors
- Best results are achieved with colors that are not extremely dark or extremely light.

---

## Use Cases

- Design Systems
- Tailwind Theme Generation
- CSS Variable Generation
- Brand Token Creation
- Figma Variables
- UI Component Libraries
- White-label Applications

---

## License

MIT
