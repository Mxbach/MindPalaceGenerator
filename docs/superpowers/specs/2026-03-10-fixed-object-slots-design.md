# Fixed Object Slot Positions

**Date:** 2026-03-10
**Status:** Approved

## Problem

Object labels in SVG rooms overlap because the AI generates free-form `relativePosition` values with no awareness of pixel dimensions. Rooms are only 180×140px, making label collisions likely with 3–5 objects per room.

## Solution

Replace AI-generated positions with 5 hand-crafted fixed slots defined in `lib/constants.ts`. Objects are assigned to slots sequentially. The AI no longer generates or needs to know about positions.

## Slot Positions

```
Slot 0: (0.22, 0.25)  — top-left
Slot 1: (0.78, 0.25)  — top-right
Slot 2: (0.50, 0.52)  — center
Slot 3: (0.22, 0.78)  — bottom-left
Slot 4: (0.78, 0.78)  — bottom-right
```

**Why these positions don't overlap:**
- Same-row objects are 100px apart horizontally — safe for names up to ~15 chars at 9px monospace
- Different-row labels have 36–38px vertical separation — well above the 9px text height
- Center object (slot 2) is in its own row, no same-row conflicts

## Scope

- 3–5 objects per room (unchanged) — rooms with fewer than 5 objects use the first N slots; unused slots stay empty
- `RelativePosition` type and `PalaceObject.relativePosition` field are unchanged — only the source changes

## Changes Required

| File | Change |
|------|--------|
| `lib/constants.ts` | Add `OBJECT_SLOTS: RelativePosition[]` with 5 entries |
| `app/api/generate-room/route.ts` | Assign `OBJECT_SLOTS[i]` when mapping objects; remove `relativePosition` from prompt JSON format and "avoid edges" instruction |

No changes needed to `PalaceSVG.tsx`, `objectToPixel()`, or `lib/types.ts`.
