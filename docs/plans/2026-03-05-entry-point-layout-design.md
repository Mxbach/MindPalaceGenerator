# Entry Point Layout Design

**Date:** 2026-03-05

## Goal

Add a visual entry point (dot + connection line) above the first room to better represent the loci / mind palace technique — the user "stands outside the palace" before entering the entry hall. The first room should be centered horizontally so it has three free neighbor directions (left, right, down), not just two.

## Context

The loci technique places the memorizer at a starting location outside their memory palace. The current app renders rooms starting at `{x:0, y:0}` with no visual representation of this exterior starting point. Additionally, because `x:0` is the leftmost rendered position, the first room can only expand right and down — not left.

## Design

### Data model

No changes to `Room` or `Palace` types. The first room remains at `{x:0, y:0}` by convention. Negative x coordinates are made valid through normalized rendering.

### `lib/constants.ts`

Add two constants:
- `ENTRY_DOT_RADIUS` — size of the entry point dot (similar to `OBJ_RADIUS`)
- `ENTRY_TOP_MARGIN` — vertical space above the first room reserved for the entry dot and connecting line

### `lib/palace-utils.ts`

Update `getCanvasSize` to compute `minX` (can be negative) and `minY`, and return them alongside `width` and `height`.

Update `roomToPixel` to accept optional `minX` and `minY` offset parameters:
```
x = CANVAS_PADDING + (room.gridPosition.x - minX) * (ROOM_WIDTH + GUTTER)
y = CANVAS_PADDING + ENTRY_TOP_MARGIN + (room.gridPosition.y - minY) * (ROOM_HEIGHT + GUTTER)
```

Update `hitTestObject` and `hitTestRoom` to accept and forward the same offsets.

### `PalaceSVG.tsx`

Compute `minX` and `minY` once from all rooms at the top of the component, pass them to every `roomToPixel` call.

Render the entry point above the first room (the room with `gridPosition: {x:0, y:0}`):
- A small circle (entry dot) at the top-center of the canvas
- A vertical corridor line from the dot down to that room's north wall midpoint
- Dot styled distinctively (e.g. dashed border or dimmer fill) to indicate "outside"

Entry dot pixel position:
```
dotX = pixel center of room at {x:0, y:0}  (i.e., roomToPixel({x:0,y:0}).x + ROOM_WIDTH / 2)
dotY = CANVAS_PADDING + ENTRY_TOP_MARGIN / 2
```

Line runs from `(dotX, dotY)` to `(dotX, roomToPixel({x:0,y:0}).y)`.

Canvas height gains `ENTRY_TOP_MARGIN` to accommodate the entry area.

### `app/api/generate-room/route.ts` prompt

First room instruction updated:
- Place at `{x:0, y:0}`
- Three free neighbor directions: `{x:-1, y:0}`, `{x:1, y:0}`, `{x:0, y:1}`
- Connections array is empty for the first room (entry point is visual only, not a room)

All rooms constraint added:
- **Never place a room at `y < 0`** — that direction is the palace entrance and must remain open

## Trade-offs considered

- Using a large positive x offset (e.g. `x:10`) for the first room was rejected — it wastes canvas space and is a hack
- Adding an `isEntryHall` flag or `entryPoint` to the data model was rejected — the entry dot is a pure rendering artifact, not a data concept

## Success criteria

- Entry dot appears at top-center of the canvas with a line connecting to the first room
- First room can generate neighbors to its left (negative x) and they render correctly
- No room ever appears above the first room (y < 0)
- Existing tests continue to pass
