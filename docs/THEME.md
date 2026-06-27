# SupaDupaBase — Cyan Hexagons theme

Dark-mode-only visual identity for the admin dashboard, auth pages, and any first-party SupaDupaBase UI.

## Principles

- **Dark mode only** — no light theme in v1
- **In-house CSS** — no UI frameworks (no Tailwind, MUI, shadcn, etc.)
- **Cyan on charcoal** — high contrast, technical feel
- **Hexagon motif** — background pattern, accents, loading states, empty states

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
}
```

## Hexagon pattern

Use an inline SVG tile as a repeating background on `body` or `.sdb-shell`:

```css
.sdb-shell {
  background-color: var(--sdb-bg-deep);
  background-image: url("data:image/svg+xml,..."); /* hex grid, stroke #22d3ee14, fill none */
  background-size: 56px 48px;
}
```

Hexagon accents:

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
  theme.css          # tokens + hex pattern + base reset
  components.css     # buttons, cards, forms, tables
  admin-shell.css    # layout
  hex.svg            # logo / pattern source (optional)
apps/admin/
  index.html         # static shell, links theme.css
  app.js             # vanilla JS, fetch to API
```

## SDK / consumer apps

The `@supadupabase/sdk` has **no UI**. Consumer PWAs bring their own styling. Only first-party SupaDupaBase surfaces use Cyan Hexagons.
