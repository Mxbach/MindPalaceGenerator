# Design Spec: Fix Object Label Overlap via Staggered Y Positions

**Date:** 2026-03-12

## Problem

After switching from random to fixed `OBJECT_SLOTS` positions, object labels in rooms that share the same `y` coordinate overlap and become unreadable. Specifically:

- Slots 0 (top-left) and 1 (top-right) both have `y=0.25` → labels render at the same vertical position, ~100px apart horizontally → overlap for any name longer than ~5 characters at 9px font
- Slots 3 (bottom-left) and 4 (bottom-right) both have `y=0.78` → same issue

## Solution

Stagger the `y` values of paired slots so no two objects share the same row. Labels remain below their dot (consistent, clean), but the dots are at different heights so label baselines can't collide.

### New OBJECT_SLOTS

```ts
export const OBJECT_SLOTS: RelativePosition[] = [
  { x: 0.22, y: 0.22 }, // top-left    (was 0.25)
  { x: 0.78, y: 0.30 }, // top-right   (was 0.25)
  { x: 0.50, y: 0.52 }, // center      (unchanged)
  { x: 0.22, y: 0.68 }, // bottom-left (was 0.78)
  { x: 0.78, y: 0.78 }, // bottom-right (unchanged)
]
```

### Why these values

- **Top pair stagger:** `0.30 − 0.22 = 0.08` relative → ~11px vertical gap between label baselines. Font size is 9px, so no overlap.
- **Bottom pair stagger:** `0.78 − 0.68 = 0.10` relative → ~14px vertical gap. Clean.
- **Slot 4 stays at 0.78** because shifting it lower would push its label past the 140px room bottom.
- **Rhythm:** left-high / right-low / center / left-high / right-low — a consistent diagonal zigzag through the room interior.

### Label positioning (no change)

Labels continue to render below their dot at `y + OBJ_RADIUS + 11`, `textAnchor="middle"`. No changes to `ObjectNode` rendering logic.

## Scope

| File | Change |
|------|--------|
| `lib/constants.ts` | Update `OBJECT_SLOTS` y values as above |
| `__tests__/palace-utils.test.ts` | Update pinned coordinate values to match new slots |

No changes to types, API, or rendering logic.
