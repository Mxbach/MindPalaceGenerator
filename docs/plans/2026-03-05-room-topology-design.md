# Room Topology Redesign

**Date:** 2026-03-05

## Problem

Currently all adjacent rooms are connected to each other. For a mind palace, the experience should follow routes — corridors with an entry, a path, and a destination. Rooms should not be a mesh but a navigable tree.

## Design

### Topology

```
         [Entry (0,0)]
    ┌──┬──┼──┬──┐
  (-2,1)(-1,1)(0,1)(1,1)(2,1)
     |     |    |    |    |
   (-2,2)  …   …   …  (2,2)
     |
   (-2,3)
     …
```

- **Entry room** `(0,0)`: connections `[]`. Acts as hub — corridor lines fan out to all 5 y=1 rooms.
- **y=1 rooms** `x ∈ {0,-1,1,-2,2}`: connections `[entryId]`. Each is a branch off the entry hall.
- **y≥2 rooms**: connections `[parentId]` where parent is `(same x, y-1)`. One room per branch per level.

`roomsAreConnected()` is bidirectional so parent doors render correctly without modifying parent data.

### Room Placement

**Auto-phase (y=1):** Header "+ ROOM" button places rooms in order:
1. `(0,0)` — entry hall
2. `(0,1)`, `(-1,1)`, `(1,1)`, `(-2,1)`, `(2,1)` — five branch rooms

Header "+ ROOM" button is hidden once 5 y=1 rooms exist.

**Manual phase (y≥2):** Hovering any room reveals a "+" button below it (only if no room already exists directly below). Clicking it generates a new room at `(room.x, room.y + 1)`.

### Hover "+" Button (SVG)

- Rendered inside each `RoomGroup` as a `<g>` with `opacity: 0 → 1` CSS transition on hover.
- Small circle + `+` text, centered horizontally below the room.
- Only rendered when `onExtendRoom` prop is provided AND no room exists directly below.
- Click calls `onExtendRoom(room.id)` and stops propagation.
- `onExtendRoom` is passed as `undefined` while `generating` is true, disabling all buttons during generation.

### API Changes

**Request body** gains optional field: `parentRoomId?: string`

**Server-side computation** (no longer delegated to AI):
- `nextRoomPosition(rooms, parentRoomId?)`:
  - If `parentRoomId` given: `(parent.x, parent.y + 1)`
  - Otherwise: next auto y=1 position in sequence `0, -1, 1, -2, 2`
- `computeConnections(position, rooms)`:
  - `y === 0` → `[]`
  - `y === 1` → `[entryId]`
  - `y >= 2` → `[parentId]`

**AI prompt simplified:** Returns only `{ name, description, objects[] }`. Server assigns `gridPosition` and `connections`. Context hint tells the AI whether it's generating an entry hall, a branch room, or a continuation.

### Files Changed

| File | Change |
|------|--------|
| `app/api/generate-room/route.ts` | Add position/connection computation; simplify prompt |
| `app/page.tsx` | `handleGenerateRoom(parentRoomId?)`, hide header button after 5 y=1 rooms |
| `app/components/PalaceSVG.tsx` | Add hover "+" button per room; add `onExtendRoom` prop |
| `__tests__/api/generate-room.test.ts` | Update mock to new AI response format |
