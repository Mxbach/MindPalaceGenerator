# Daylit Scriptorium — Color Theme Redesign

**Date:** 2026-02-25
**Status:** Approved

## Problem

The current "Grimoire" theme uses a near-black void background (`#080604`) with dark ash text. When SVG room labels overflow the light-colored room rect, the text becomes unreadable against the dark canvas. The overall UI is also too dark for comfortable sustained use.

## Goal

Replace the dark background with a warm cream/ivory base while preserving the mystical, manuscript-like personality of the app.

## Design Direction: Daylit Scriptorium

Everything unified in the warm cream family. No dark fills. The app feels like a manuscript viewed in afternoon light — ink on ivory, gold structural lines, ember accents for action states.

## Color System

### CSS Variable Remap

| Variable      | Old value  | New value  | Role                          |
|---------------|------------|------------|-------------------------------|
| `--page`      | _(new)_    | `#f8f1e4`  | Canvas & room fills (lightest)|
| `--page-mid`  | _(new)_    | `#ede4d2`  | Header background             |
| `--page-deep` | _(new)_    | `#ddd0b8`  | Sidebar panel                 |
| `--ink`       | `#0d0a07`  | `#1e140a`  | Primary text (dark)           |
| `--ash`       | `#4a3f2f`  | `#4a3220`  | Secondary text                |
| `--smoke`     | `#a89070`  | `#8a7060`  | Muted labels                  |
| `--border`    | _(new)_    | `#c8a86e`  | Structural lines & borders    |
| `--gold`      | `#c8933a`  | `#b5831e`  | Accent gold (circles, etc.)   |
| `--ember`     | `#e06420`  | `#c84a18`  | CTA buttons, selected state   |

### Removed Variables

- `--void` (`#080604`) — was the body/canvas background; replaced by `--page`
- `--parchment` (`#f2e8d5`) — was the room fill and sidebar; replaced by `--page` and `--page-deep`
- `--parchment-dark` (`#d9c9a8`) — was the textarea background; replaced by `--page-deep`
- `--gold-dim` (`#7a5820`) — was the structural border color on dark; replaced by `--border`

## Spatial Hierarchy

Three cream tones create depth without darkness:

```
Header bar    →  --page-mid  (#ede4d2)  slightly warm sand
Body canvas   →  --page      (#f8f1e4)  lightest ivory  ← rooms also use this
Sidebar panel →  --page-deep (#ddd0b8)  richer parchment
```

Rooms (`--page`) are lighter than the canvas area (which uses `--page-mid`), so they read as elevated islands on a slightly darker field.

## Side Effect: Text Overflow Problem Resolved

With dark text (`--ash` `#4a3220`) on the cream canvas (`--page-mid` `#ede4d2`), SVG object labels that spill outside room bounds remain readable. The light theme passively fixes the previous readability bug without requiring clipPath or truncation changes.

## Affected Files

- `app/globals.css` — CSS variable definitions and `body` background
- `app/page.tsx` — header, loading state, empty state, canvas area background
- `app/components/PalaceSVG.tsx` — room fill, wall stroke, object circle colors, label colors
- `app/components/Sidebar.tsx` — panel background, textarea background
- `app/components/NewPalaceModal.tsx` — modal background and borders
