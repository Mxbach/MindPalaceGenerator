# Daylit Scriptorium — Color Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Retheme MindPalaceGen from dark Grimoire (near-black void) to the Daylit Scriptorium palette (warm cream/ivory base, fully light UI).

**Architecture:** Pure CSS variable swap + targeted inline-style updates across 5 files. No logic changes. No new components. The variable remap is the source of truth; individual component style props are updated to reference new variable names.

**Tech Stack:** Next.js 14, React, inline styles + CSS variables in `globals.css`, Tailwind (minimal usage).

---

## Variable Reference

| New variable  | Value     | Replaces              |
|---------------|-----------|---------------------- |
| `--page`      | #f8f1e4   | `--void`, `--parchment` (as fill) |
| `--page-mid`  | #ede4d2   | `--ink` (as header bg) |
| `--page-deep` | #ddd0b8   | `--parchment-dark`, `--parchment` (as sidebar) |
| `--border`    | #c8a86e   | `--gold-dim` (as structural line color) |
| `--ink`       | #1e140a   | `--ink` (repurposed: now dark text, not background) |
| `--ash`       | #4a3220   | `--ash` (secondary text, slightly adjusted) |
| `--smoke`     | #8a7060   | `--smoke` (muted labels, slightly adjusted) |
| `--gold`      | #b5831e   | `--gold` (accent, slightly deeper for light bg) |
| `--ember`     | #c84a18   | `--ember` (CTA/selected, slightly deeper) |

**Remove entirely:** `--void`, `--parchment`, `--parchment-dark`, `--gold-dim`

---

## Task 1: Update CSS variables and body background (`globals.css`)

**Files:**
- Modify: `app/globals.css`

**Step 1: Replace the `:root` block**

Replace the existing `:root` block with:

```css
:root {
  --page:       #f8f1e4;
  --page-mid:   #ede4d2;
  --page-deep:  #ddd0b8;
  --ink:        #1e140a;
  --ash:        #4a3220;
  --smoke:      #8a7060;
  --border:     #c8a86e;
  --gold:       #b5831e;
  --ember:      #c84a18;
}
```

**Step 2: Update the `body` rule**

Change `background: var(--void)` to `background: var(--page)`.
The `color` and `font-family` lines stay unchanged.

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: retheme CSS variables to Daylit Scriptorium palette"
```

---

## Task 2: Update `page.tsx` — header, canvas, loading state

**Files:**
- Modify: `app/page.tsx`

**Step 1: Update the loading state div** (line ~86–103)

Change:
```tsx
background: 'var(--void)',
```
To:
```tsx
background: 'var(--page)',
```

**Step 2: Update the outer wrapper div** (line ~106)

Change:
```tsx
background: 'var(--void)'
```
To:
```tsx
background: 'var(--page)'
```

**Step 3: Update the header** (line ~108–197)

Change header `background`:
```tsx
background: 'var(--ink)',
```
To:
```tsx
background: 'var(--page-mid)',
```

Change header `borderBottom`:
```tsx
borderBottom: '1px solid var(--gold-dim)',
```
To:
```tsx
borderBottom: '1px solid var(--border)',
```

**Step 4: Update the provider select border** (line ~158)

Change:
```tsx
borderBottom: '1px solid var(--gold-dim)',
```
To:
```tsx
borderBottom: '1px solid var(--border)',
```

**Step 5: Update the generate button text color** (line ~186)

Change:
```tsx
color: 'var(--parchment)',
```
To:
```tsx
color: 'var(--page)',
```

**Step 6: Update the canvas area background** (line ~202)

Change:
```tsx
background: 'var(--void)'
```
To:
```tsx
background: 'var(--page-mid)'
```

Note: canvas uses `--page-mid` (slightly darker than `--page`) so that room fills (`--page`) read as elevated surfaces against it.

**Step 7: Verify dev server**

Run `npm run dev`, open the app. Check:
- Header is warm sand, not black
- Body/canvas is ivory, not void black
- Gold text "MIND PALACE" still visible (gold on sand)
- Smoke-colored topic text still legible

**Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "feat: update page.tsx for Daylit Scriptorium palette"
```

---

## Task 3: Update `PalaceSVG.tsx` — rooms, walls, connection lines

**Files:**
- Modify: `app/components/PalaceSVG.tsx`

**Step 1: Update connection line color** (line ~72–79)

Change:
```tsx
stroke="var(--gold)"
strokeOpacity={0.4}
```
To:
```tsx
stroke="var(--border)"
strokeOpacity={0.7}
```

(Border gold is lighter than accent gold, so increase opacity slightly to maintain visibility.)

**Step 2: Update room fill** (line ~132–139)

Change:
```tsx
fill="var(--parchment)"
```
To:
```tsx
fill="var(--page)"
```

**Step 3: Update wall stroke color** (line ~181–185)

Change:
```tsx
stroke: 'var(--gold-dim)',
```
To:
```tsx
stroke: 'var(--border)',
```

**Step 4: Update object circle stroke** (line ~247)

Change:
```tsx
stroke={isSelected ? 'var(--ember)' : 'var(--gold-dim)'}
```
To:
```tsx
stroke={isSelected ? 'var(--ember)' : 'var(--border)'}
```

**Step 5: Verify visually**

With `npm run dev` open and a palace loaded:
- Rooms should be ivory rectangles on a slightly darker sand canvas
- Wall lines should be medium gold
- Connection corridors should be visible gold lines
- Object circles: muted gold when unselected, ember glow when selected
- Room names and object labels: dark brown text, readable on both room fill AND canvas

**Step 6: Commit**

```bash
git add app/components/PalaceSVG.tsx
git commit -m "feat: update PalaceSVG.tsx for Daylit Scriptorium palette"
```

---

## Task 4: Update `Sidebar.tsx` — panel, textarea, close button

**Files:**
- Modify: `app/components/Sidebar.tsx`

**Step 1: Update panel background** (line ~26)

Change:
```tsx
background: 'var(--parchment)',
```
To:
```tsx
background: 'var(--page-deep)',
```

**Step 2: Update panel border** (line ~29)

Change:
```tsx
borderLeft: '1px solid var(--gold)',
```
To:
```tsx
borderLeft: '1px solid var(--border)',
```

**Step 3: Update textarea background** (line ~117)

Change:
```tsx
background: 'var(--parchment-dark)',
```
To:
```tsx
background: 'var(--page)',
```

(Textarea uses the lightest layer — it feels like writing on a fresh piece of paper within the deeper sidebar panel.)

**Step 4: Verify visually**

Open sidebar by clicking an object:
- Panel is the richest parchment tone (page-deep)
- Textarea is lighter ivory (page) — legible contrast within the panel
- Gold border on left edge still visible
- All text (room name, object name, description, label) readable on deep-parchment background

**Step 5: Commit**

```bash
git add app/components/Sidebar.tsx
git commit -m "feat: update Sidebar.tsx for Daylit Scriptorium palette"
```

---

## Task 5: Update `NewPalaceModal.tsx` — card, input, backdrop

**Files:**
- Modify: `app/components/NewPalaceModal.tsx`

**Step 1: Update modal card background** (line ~41)

Change:
```tsx
background: 'var(--parchment)',
```
To:
```tsx
background: 'var(--page)',
```

**Step 2: Update top rule border** (line ~48–53)

Change:
```tsx
borderBottom: '1px solid var(--gold-dim)',
```
To:
```tsx
borderBottom: '1px solid var(--border)',
```

**Step 3: Update input background** (line ~89)

Change:
```tsx
background: 'var(--parchment-dark)',
```
To:
```tsx
background: 'var(--page-deep)',
```

**Step 4: Update input border colors** (lines ~91, 97–98)

Change the static style:
```tsx
borderBottom: '1px solid var(--gold-dim)',
```
To:
```tsx
borderBottom: '1px solid var(--border)',
```

Change the onBlur handler:
```tsx
onBlur={e => (e.currentTarget.style.borderBottomColor = 'var(--gold-dim)')}
```
To:
```tsx
onBlur={e => (e.currentTarget.style.borderBottomColor = 'var(--border)')}
```

**Step 5: Update button text color for disabled state** (line ~108)

Change:
```tsx
color: topic.trim() ? 'var(--parchment)' : 'var(--smoke)',
```
To:
```tsx
color: topic.trim() ? 'var(--page)' : 'var(--smoke)',
```

**Step 6: Verify visually**

Load the app with no saved palace (clear localStorage or reset API):
- Backdrop: dark overlay (unchanged — fine for dramatic contrast)
- Modal card: ivory white
- Top rule: gold double line decorative element
- Input area: deep parchment background (page-deep) with gold underline
- "BEGIN" button: ember red with ivory text when active; muted gold bg with smoke text when disabled

**Step 7: Commit**

```bash
git add app/components/NewPalaceModal.tsx
git commit -m "feat: update NewPalaceModal.tsx for Daylit Scriptorium palette"
```

---

## Task 6: Final check — scan for any remaining old variable references

**Step 1: Search for stale references**

```bash
grep -r "var(--void)\|var(--parchment)\|var(--gold-dim)" app/
```

Expected output: no matches. If any appear, update them to the closest equivalent from the new variable set.

**Step 2: Final visual pass**

Walk through the full user flow:
1. Fresh load → modal appears (ivory card on dark backdrop)
2. Create a palace → empty state message visible on sand canvas
3. Generate a room → room appears as ivory box on sand, gold walls
4. Click an object → sidebar slides in with deep-parchment panel
5. Type in textarea → ivory textarea within panel, gold focus ring
6. Generating state → "CONJURING..." button breathes

**Step 3: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: clean up remaining stale palette variable references"
```
