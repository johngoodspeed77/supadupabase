# SupaDupaBase — Cyan Hexagons theme

Dark-mode-only visual identity for the admin dashboard, auth pages, and any first-party SupaDupaBase UI.

## Principles

- **Dark mode only** — no light theme in v1
- **In-house CSS** — no UI frameworks (no Tailwind, MUI, shadcn, etc.)
- **Cyan on charcoal** — high contrast, technical feel
- **Tessellated hexagon motif** — seamless honeycomb background tile (not scattered or isolated hex shapes); accents, loading states, empty states

## Design tokens

```css
:root {
  /* Surfaces */
  --sdb-bg-deep: #06080c;
  --sdb-bg: #0b1018;
  --sdb-bg-raised: #111827;
  --sdb-bg-hover: #1a2332;
  --sdb-border: #1e3a4a;
  --sdb-border-bright: #22d3ee33;

  /* Cyan spectrum */
  --sdb-cyan-100: #e0fcff;
  --sdb-cyan-300: #67e8f9;
  --sdb-cyan-500: #22d3ee;
  --sdb-cyan-600: #06b6d4;
  --sdb-cyan-700: #0891b2;
  --sdb-glow: #22d3ee66;

  /* Text */
  --sdb-text: #e2e8f0;
  --sdb-text-muted: #94a3b8;
  --sdb-text-dim: #64748b;

  /* Semantic */
  --sdb-success: #34d399;
  --sdb-warning: #fbbf24;
  --sdb-error: #f87171;

  /* Shape */
  --sdb-radius: 8px;
  --sdb-radius-hex: 4px;
  --sdb-font: system-ui, "Segoe UI", Roboto, sans-serif;
  --sdb-font-mono: ui-monospace, "Cascadia Code", Consolas, monospace;

  /* Tessellated honeycomb tile (flat-top) */
  --sdb-hex-r: 14px;                          /* circumradius / side length */
  --sdb-hex-stroke: #22d3ee;
  --sdb-hex-stroke-opacity: 0.08;             /* ~#22d3ee14 on dark bg */
  --sdb-hex-fill: none;
  --sdb-hex-stroke-width: 0.75;
  --sdb-hex-tile-w: calc(var(--sdb-hex-r) * 3);           /* 42px @ r=14 */
  --sdb-hex-tile-h: calc(var(--sdb-hex-r) * 1.732050808); /* √3 × r ≈ 24.25px */
}
```

## Tessellated honeycomb pattern

The background uses a **flat-top** hexagon grid (standard honeycomb: each row offset by half a hex horizontally). The SVG defines one **repeat tile** whose edges clip partial hexes; `background-repeat: repeat` tiles them into a continuous mesh with no gaps or overlaps.

### Geometry (flat-top)

Let `r` = circumradius (equals side length for a regular hexagon).

| Quantity | Formula | @ r = 14px |
|----------|---------|------------|
| Hex width (vertex ↔ vertex) | `2r` | 28px |
| Hex height (flat ↔ flat) | `r√3` | ≈ 24.25px |
| Horizontal center pitch | `1.5 × 2r = 3r` | 42px (tile width) |
| Vertical center pitch | `r√3 / 2` per half-row; full tile height = `r√3` | ≈ 24.25px |
| Odd-row horizontal offset | `1.5r` | 21px |

**Flat-top vertex ring** (center `cx`, `cy`):

```
(cx + r, cy)
(cx + r/2, cy + r√3/2)
(cx − r/2, cy + r√3/2)
(cx − r, cy)
(cx − r/2, cy − r√3/2)
(cx + r/2, cy − r√3/2)
```

**Centers inside one tile** (`0 ≤ x < 3r`, `0 ≤ y < r√3`):

| Row | Centers (x, y) |
|-----|----------------|
| Even (0) | `(r, r√3/2)`, `(2.5r, r√3/2)` |
| Odd (1) | `(0.5r, r√3)`, `(2r, r√3)` |

Edge hexes are clipped by the tile bounds; the adjacent tile copy completes them.

### CSS usage

```css
.sdb-shell {
  background-color: var(--sdb-bg-deep);
  background-image: url("data:image/svg+xml,..."); /* full URI below */
  background-size: var(--sdb-hex-tile-w) var(--sdb-hex-tile-h);
  background-repeat: repeat;
  background-position: 0 0;
}
```

Use **exact** `background-size` matching the SVG `viewBox` dimensions. Do not stretch to arbitrary pixel values or the honeycomb will misalign.

For sharper strokes on HiDPI screens, double the tile (`r = 28`, viewBox `0 0 84 50`) and set `background-size: 84px 50px`.

### Complete data-URI example

Flat-top tessellated tile, `r = 14`, viewBox `0 0 42 25`, stroke `#22d3ee` at 8% opacity, no fill:

```css
.sdb-shell {
  background-color: var(--sdb-bg-deep);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='42' height='25' viewBox='0 0 42 25'%3E%3Cg fill='none' stroke='%2322d3ee' stroke-opacity='0.08' stroke-width='0.75' vector-effect='non-scaling-stroke'%3E%3Cpolygon points='28,12.124 21,24.248 7,24.248 0,12.124 7,0 21,0'/%3E%3Cpolygon points='49,12.124 42,24.248 28,24.248 21,12.124 28,0 42,0'/%3E%3Cpolygon points='17.5,24.248 10.5,36.372 -3.5,36.372 -10.5,24.248 -3.5,12.124 10.5,12.124'/%3E%3Cpolygon points='38.5,24.248 31.5,36.372 17.5,36.372 10.5,24.248 17.5,12.124 31.5,12.124'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 42px 25px;
  background-repeat: repeat;
}
```

Equivalent inline SVG (for `packages/ui/hex-tile.svg` or debugging):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="42" height="25" viewBox="0 0 42 25">
  <g fill="none" stroke="#22d3ee" stroke-opacity="0.08" stroke-width="0.75" vector-effect="non-scaling-stroke">
    <!-- row 0: centers (14, 12.124), (35, 12.124) -->
    <polygon points="28,12.124 21,24.248 7,24.248 0,12.124 7,0 21,0"/>
    <polygon points="49,12.124 42,24.248 28,24.248 21,12.124 28,0 42,0"/>
    <!-- row 1: centers (3.5, 24.248), (24.5, 24.248) -->
    <polygon points="17.5,24.248 10.5,36.372 -3.5,36.372 -10.5,24.248 -3.5,12.124 10.5,12.124"/>
    <polygon points="38.5,24.248 31.5,36.372 17.5,36.372 10.5,24.248 17.5,12.124 31.5,12.124"/>
  </g>
</svg>
```

### Stroke / fill tokens

| Token | Value | Notes |
|-------|-------|-------|
| `--sdb-hex-stroke` | `#22d3ee` | Same as `--sdb-cyan-500` |
| `--sdb-hex-stroke-opacity` | `0.08` | Subtle on `--sdb-bg-deep`; raise to `0.12` on hero panels only |
| `--sdb-hex-fill` | `none` | Never solid-fill the grid — keeps the mesh airy |
| `--sdb-hex-stroke-width` | `0.75` | Use `vector-effect="non-scaling-stroke"` in SVG |

### Optional subtle animation

Keep motion minimal so the admin UI stays calm. Prefer one of:

```css
/* A — very slow pan (reveals tessellation depth) */
@keyframes sdb-hex-drift {
  to { background-position: var(--sdb-hex-tile-w) var(--sdb-hex-tile-h); }
}
.sdb-shell--animated {
  animation: sdb-hex-drift 120s linear infinite;
}

/* B — pulse stroke on a dedicated overlay layer (not the tile itself) */
@keyframes sdb-hex-pulse {
  0%, 100% { opacity: 0.06; }
  50% { opacity: 0.10; }
}
.sdb-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: inherit;
  background-size: inherit;
  animation: sdb-hex-pulse 8s ease-in-out infinite;
}
```

Respect `prefers-reduced-motion: reduce` — disable both animations when set.

### Anti-patterns

- **Do not** place individual hex `<div>`s or random SVG hexes on the page background — use the repeating tile only.
- **Do not** use pointy-top hexes unless the entire grid is converted consistently (flat-top is the project default).
- **Do not** set `background-size` that does not match the tile aspect ratio (`3r × r√3`).

## Hexagon accents (non-background)

- Logo mark: single cyan hexagon with inner glow
- Card corners: optional `clip-path` hex-cut on hero panels only (sparingly)
- Buttons: solid cyan primary; ghost buttons with cyan border
- Focus rings: `box-shadow: 0 0 0 2px var(--sdb-bg), 0 0 0 4px var(--sdb-cyan-500)`

## Components (in-house)

Build in `packages/ui/` as plain CSS + minimal vanilla JS helpers:

| Component | Notes |
|-----------|--------|
| `.sdb-btn` | Primary / ghost / danger variants |
| `.sdb-card` | Raised surface, subtle cyan border |
| `.sdb-input` | Dark fill, cyan focus ring |
| `.sdb-table` | Zebra rows on `--sdb-bg-raised` |
| `.sdb-nav` | Side nav with cyan active indicator |
| `.sdb-hex-loader` | Rotating hex outline for async states |

## Admin layout

```
┌─────────────────────────────────────────────┐
│  ⬡ SupaDupaBase          [user] [logout]   │  ← top bar, hex logo
├──────────┬──────────────────────────────────┤
│ Projects │  Main content (cards, tables)      │
│ Users    │                                  │
│ API Keys │                                  │
└──────────┴──────────────────────────────────┘
```

## File layout (target)

```
packages/ui/
  theme.css          # tokens + tessellated hex pattern + base reset
  components.css     # buttons, cards, forms, tables
  admin-shell.css    # layout
  hex-tile.svg       # flat-top honeycomb repeat tile (source of truth)
apps/admin/
  index.html         # static shell, links theme.css
  app.js             # vanilla JS, fetch to API
```

## SDK / consumer apps

The `@supadupabase/sdk` has **no UI**. Consumer PWAs bring their own styling. Only first-party SupaDupaBase surfaces use Cyan Hexagons.
