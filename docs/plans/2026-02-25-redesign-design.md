# Full App Redesign — Grimoire Codex

**Date:** 2026-02-25
**Scope:** Full visual redesign of MindPalaceGen — all components, canvas replacement with SVG, new design system

---

## Aesthetic Direction

**Theme:** Grimoire Codex — ancient library, illuminated manuscript, torchlit corridors

The app should feel like consulting a secret archive. Rooms are parchment cards floating in a dark void, connected by gold lines. Typography is antique and deliberate. Motion is subtle and atmospheric — things breathe and glow rather than bounce.

---

## Design System

### Color Palette

```css
--ink:            #0d0a07   /* page background, near-black */
--parchment:      #f2e8d5   /* room fill, modal background */
--parchment-dark: #d9c9a8   /* room borders, subtle dividers */
--gold:           #c8933a   /* primary accent, connections, selected state */
--gold-dim:       #7a5820   /* inactive objects, muted labels */
--ember:          #e06420   /* hover state, generate button */
--ash:            #4a3f2f   /* body text on parchment */
--smoke:          #a89070   /* secondary text, metadata */
--void:           #080604   /* canvas viewport background */
```

### Typography

| Role | Font | Usage |
|------|------|-------|
| Display | `Cormorant Garamond` | Palace name, room names, modal title, object name in sidebar, save button |
| Labels | `Cinzel` | Uppercase small-caps labels ("Memory Note", "Room"), generate button |
| Monospace | `Courier Prime` | Topic pill, object labels in SVG, loading/empty state text |
| Body | `Lora` | Object descriptions, memory textarea |

All fonts loaded from Google Fonts via `next/font/google`.

### Global Background

`--void` base with a subtle radial vignette (darkest at edges, slightly lighter at center). No box-shadows — depth via border, opacity, and CSS `drop-shadow` filter in gold.

---

## Layout & Structure

```
┌─────────────────────────────────────────────────────┐
│  HEADER (56px, --ink bg, gold bottom rule)          │
│  [⬡ MIND PALACE]  — topic ——————  [Provider ▾] [+ Room] │
├──────────────────────────────────────┬──────────────┤
│                                      │              │
│   PALACE VIEWPORT                    │   SIDEBAR    │
│   (--void, overflow: scroll)         │   300px      │
│                                      │   slides in  │
│   SVG rooms floating in darkness     │   from right │
│   connected by gold lines            │              │
│                                      │              │
└──────────────────────────────────────┴──────────────┘
```

- **Header:** 56px fixed, `--ink` background, 1px gold bottom border
- **Palace viewport:** fills remaining height, `overflow: scroll`, `--void` background. SVG rooms positioned absolutely within a sized container using the same grid logic as the current canvas.
- **Sidebar:** 300px fixed width, `--parchment` bg, 1px left border in gold. Slides in from right when an object is selected.
- **NewPalaceModal:** Full-screen overlay with dark scrim + backdrop blur, centered parchment card.

---

## Component Details

### Header

- Sigil glyph (⬡) + `MIND PALACE` in `Cinzel` small-caps
- Em-dash separator
- Topic in `Courier Prime` italic, `--smoke` color
- Provider select: unstyled except gold underline, no visible border at rest
- "+ Room" button: `--ember` background, `Cinzel` uppercase, hover: 200ms color shift + subtle gold text glow
- While generating: button shows *"Conjuring..."* with slow opacity pulse

### Palace SVG (replacing HTML Canvas)

Each room is an SVG `<g>` element:
- `<rect>` with `fill: var(--parchment)`, `stroke: var(--gold-dim)`
- Room name: `Cormorant Garamond` bold, centered at top of rect
- Connection lines between rooms: thin gold `<line>` elements with centered gap for doorway (preserving current door logic)
- Objects: `<circle>` amber fill (`--gold-dim`); hover: `filter: drop-shadow(0 0 6px var(--gold))`; selected: `--ember` fill + stronger glow
- Object labels: `Courier Prime` 9px below each circle

The SVG container is sized to fit all rooms using the same `getCanvasSize` utility. Rooms positioned using `roomToPixel`.

### Sidebar

- Room name: `Cinzel` uppercase, `--smoke` color, tracking-widest
- Object name: `Cormorant Garamond` 22px bold, `--ash`
- Description: `Lora` italic, `--ash`
- "Memory Note" label: `Cinzel` uppercase, `--smoke`, tracking-widest
- Textarea: `--parchment-dark` bg, no border-radius, 1px gold focus ring, `Lora` body font
- Save button: full width, `--gold` background, `--ink` text, `Cormorant Garamond` 16px
- Close button: `×` in `--smoke`, hover `--ash`

### NewPalaceModal

- Scrim: `rgba(8,6,4,0.85)` + `backdrop-filter: blur(2px)`
- Card: `--parchment`, max-width 480px, decorative double-rule in gold at top
- Title: `Cormorant Garamond` 28px — "Begin Your Palace"
- Subtitle: `Lora` italic, `--smoke`
- Input: `--parchment-dark` bg, bottom-border only in `--gold-dim`, focus turns `--gold`
- Button: full-width `--ember`, `Cinzel` uppercase, `--parchment` text

### Empty & Loading States

| State | Text | Font | Color |
|-------|------|------|-------|
| Loading | *"consulting the archive..."* | `Courier Prime` | `--smoke` |
| Empty palace | *"The palace awaits its first room."* | `Cormorant Garamond` italic | `--smoke` |
| Generating | *"Conjuring..."* (pulsing) | `Cinzel` | `--parchment` |
| Error | Error message | `Courier Prime` | red-400 |

---

## Motion & Animation

All animations are CSS-only (no JS animation libraries).

| Trigger | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| New room added | Fade in + scale 0.92→1.0 | 300ms | ease-out |
| Connection line drawn | SVG stroke-dashoffset 0→full | 400ms | ease-out |
| Object hover | drop-shadow glow in | 150ms | ease |
| Object selected | fill color ember + glow | 200ms | ease |
| Sidebar open | translateX(100%→0) | 250ms | ease-out |
| Sidebar close | translateX(0→100%) | 200ms | ease-in |
| Button generating | opacity pulse 0.6→1.0→0.6 | 1.5s loop | ease-in-out |
| Modal open | opacity 0→1 + scale 0.96→1 | 250ms | ease-out |
| Modal close | opacity 1→0 | 150ms | ease-in |
| Page load rooms | Stagger fade-in, 60ms per room | 300ms each | ease-out |

---

## Implementation Scope

Files to modify:
- `app/globals.css` — CSS variables, font imports, global background
- `app/layout.tsx` — font loading (next/font/google)
- `app/page.tsx` — header redesign, loading/empty states
- `app/components/Canvas.tsx` — replace with SVG-based `PalaceSVG` component
- `app/components/Sidebar.tsx` — full restyle
- `app/components/NewPalaceModal.tsx` — full restyle

No changes to: API routes, lib/types, lib/constants, lib/palace-utils (SVG uses same geometry utilities).
