# Entry Point Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a visual "standing outside the palace" entry point dot above the first room, support negative x coordinates in rendering so the first room can grow left/right/down, and constrain the AI to never place rooms above the entry hall.

**Architecture:** Add two constants, update `palace-utils` to normalize coordinates using `minX`/`minY` offsets, update `PalaceSVG` to use those offsets and render the entry dot, and update the AI prompt to allow negative x and forbid y < 0.

**Tech Stack:** TypeScript, React, SVG, Jest, Next.js API routes

---

### Task 1: Add constants

**Files:**
- Modify: `lib/constants.ts`

**Step 1: Add the two new constants**

In `lib/constants.ts`, add after the existing constants:

```ts
export const ENTRY_DOT_RADIUS = 6      // radius of the entry point dot
export const ENTRY_TOP_MARGIN = 60     // vertical space above first room for entry dot + line
```

**Step 2: Verify the file looks correct**

Run: `cat lib/constants.ts`
Expected: 8 exports total, file unchanged otherwise.

**Step 3: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: add ENTRY_DOT_RADIUS and ENTRY_TOP_MARGIN constants"
```

---

### Task 2: Update palace-utils — write failing tests first

**Files:**
- Modify: `lib/palace-utils.ts`
- Modify: `__tests__/palace-utils.test.ts`

**Step 1: Update the import in the test file**

In `__tests__/palace-utils.test.ts`, update the constants import (line 11) to include the new ones:

```ts
import { ROOM_WIDTH, ROOM_HEIGHT, GUTTER, CANVAS_PADDING, OBJ_RADIUS, ENTRY_TOP_MARGIN } from '@/lib/constants'
```

**Step 2: Replace the `roomToPixel` describe block**

Replace lines 24–40 in `__tests__/palace-utils.test.ts` with:

```ts
describe('roomToPixel', () => {
  test('grid (0,0) maps to canvas padding + entry margin offset', () => {
    expect(roomToPixel(makeRoom(0, 0))).toEqual({
      x: CANVAS_PADDING,
      y: CANVAS_PADDING + ENTRY_TOP_MARGIN,
    })
  })
  test('grid (1,0) offsets x by ROOM_WIDTH + GUTTER', () => {
    expect(roomToPixel(makeRoom(1, 0))).toEqual({
      x: CANVAS_PADDING + ROOM_WIDTH + GUTTER,
      y: CANVAS_PADDING + ENTRY_TOP_MARGIN,
    })
  })
  test('grid (0,1) offsets y by ROOM_HEIGHT + GUTTER', () => {
    expect(roomToPixel(makeRoom(0, 1))).toEqual({
      x: CANVAS_PADDING,
      y: CANVAS_PADDING + ENTRY_TOP_MARGIN + ROOM_HEIGHT + GUTTER,
    })
  })
  test('negative x normalised by minX renders at CANVAS_PADDING', () => {
    expect(roomToPixel(makeRoom(-1, 0), -1, 0)).toEqual({
      x: CANVAS_PADDING,
      y: CANVAS_PADDING + ENTRY_TOP_MARGIN,
    })
  })
  test('negative x without offset renders off-canvas', () => {
    const { x } = roomToPixel(makeRoom(-1, 0))
    expect(x).toBeLessThan(0)
  })
})
```

**Step 3: Replace the `objectToPixel` describe block**

Replace lines 42–49 in `__tests__/palace-utils.test.ts` with:

```ts
describe('objectToPixel', () => {
  test('center object (0.5, 0.5) maps to centre of room', () => {
    expect(objectToPixel(makeRoom(0, 0), makeObj(0.5, 0.5))).toEqual({
      x: CANVAS_PADDING + ROOM_WIDTH * 0.5,
      y: CANVAS_PADDING + ENTRY_TOP_MARGIN + ROOM_HEIGHT * 0.5,
    })
  })
})
```

**Step 4: Replace the `hitTestRoom` describe block**

Replace lines 72–79 with:

```ts
describe('hitTestRoom', () => {
  test('click inside room bounds → true', () => {
    expect(hitTestRoom(CANVAS_PADDING + 10, CANVAS_PADDING + ENTRY_TOP_MARGIN + 10, makeRoom(0, 0))).toBe(true)
  })
  test('click outside room bounds → false', () => {
    expect(hitTestRoom(0, 0, makeRoom(0, 0))).toBe(false)
  })
})
```

**Step 5: Replace the `getCanvasSize` describe block**

Replace lines 81–97 with:

```ts
describe('getCanvasSize', () => {
  test('single room at (0,0) → minimal canvas', () => {
    const { width, height, minX, minY } = getCanvasSize([makeRoom(0, 0)])
    expect(width).toBe(CANVAS_PADDING * 2 + ROOM_WIDTH)
    expect(height).toBe(CANVAS_PADDING * 2 + ENTRY_TOP_MARGIN + ROOM_HEIGHT)
    expect(minX).toBe(0)
    expect(minY).toBe(0)
  })
  test('two rooms at (0,0) and (1,0) → wider canvas', () => {
    const { width, height, minX } = getCanvasSize([makeRoom(0, 0), makeRoom(1, 0)])
    expect(width).toBe(CANVAS_PADDING * 2 + ROOM_WIDTH * 2 + GUTTER)
    expect(height).toBe(CANVAS_PADDING * 2 + ENTRY_TOP_MARGIN + ROOM_HEIGHT)
    expect(minX).toBe(0)
  })
  test('rooms at x=-1, 0, 1 → minX=-1, width spans 3 cells', () => {
    const { width, minX } = getCanvasSize([makeRoom(-1, 0), makeRoom(0, 0), makeRoom(1, 0)])
    expect(minX).toBe(-1)
    expect(width).toBe(CANVAS_PADDING * 2 + ROOM_WIDTH * 3 + GUTTER * 2)
  })
  test('empty rooms → minimum fallback size', () => {
    const { width, height } = getCanvasSize([])
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })
})
```

**Step 6: Run the tests to confirm they fail**

Run: `npx jest __tests__/palace-utils.test.ts --no-coverage`
Expected: Multiple FAIL results — the new y values and minX/minY are not yet implemented.

**Step 7: Rewrite `lib/palace-utils.ts`**

Replace the entire file with:

```ts
import { Room, PalaceObject } from './types'
import { ROOM_WIDTH, ROOM_HEIGHT, GUTTER, CANVAS_PADDING, OBJ_RADIUS, ENTRY_TOP_MARGIN } from './constants'

export function roomToPixel(room: Room, minX = 0, minY = 0): { x: number; y: number } {
  return {
    x: CANVAS_PADDING + (room.gridPosition.x - minX) * (ROOM_WIDTH + GUTTER),
    y: CANVAS_PADDING + ENTRY_TOP_MARGIN + (room.gridPosition.y - minY) * (ROOM_HEIGHT + GUTTER),
  }
}

export function objectToPixel(room: Room, obj: PalaceObject, minX = 0, minY = 0): { x: number; y: number } {
  const { x, y } = roomToPixel(room, minX, minY)
  return {
    x: x + obj.relativePosition.x * ROOM_WIDTH,
    y: y + obj.relativePosition.y * ROOM_HEIGHT,
  }
}

export function hitTestObject(clickX: number, clickY: number, room: Room, obj: PalaceObject, minX = 0, minY = 0): boolean {
  const { x, y } = objectToPixel(room, obj, minX, minY)
  const dx = clickX - x
  const dy = clickY - y
  return Math.sqrt(dx * dx + dy * dy) <= OBJ_RADIUS
}

export function hitTestRoom(clickX: number, clickY: number, room: Room, minX = 0, minY = 0): boolean {
  const { x, y } = roomToPixel(room, minX, minY)
  return clickX >= x && clickX <= x + ROOM_WIDTH && clickY >= y && clickY <= y + ROOM_HEIGHT
}

export function getCanvasSize(rooms: Room[]): { width: number; height: number; minX: number; minY: number } {
  if (rooms.length === 0) {
    return {
      width: CANVAS_PADDING * 2 + ROOM_WIDTH,
      height: CANVAS_PADDING * 2 + ENTRY_TOP_MARGIN + ROOM_HEIGHT,
      minX: 0,
      minY: 0,
    }
  }
  const minX = Math.min(...rooms.map(r => r.gridPosition.x))
  const maxX = Math.max(...rooms.map(r => r.gridPosition.x))
  const minY = Math.min(...rooms.map(r => r.gridPosition.y))
  const maxY = Math.max(...rooms.map(r => r.gridPosition.y))
  const spanX = maxX - minX
  const spanY = maxY - minY
  return {
    width: CANVAS_PADDING * 2 + (spanX + 1) * ROOM_WIDTH + spanX * GUTTER,
    height: CANVAS_PADDING * 2 + ENTRY_TOP_MARGIN + (spanY + 1) * ROOM_HEIGHT + spanY * GUTTER,
    minX,
    minY,
  }
}

export function roomsAreConnected(a: Room, b: Room): boolean {
  return a.connections.includes(b.id) || b.connections.includes(a.id)
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
```

**Step 8: Run tests to confirm they pass**

Run: `npx jest __tests__/palace-utils.test.ts --no-coverage`
Expected: All PASS.

**Step 9: Commit**

```bash
git add lib/palace-utils.ts __tests__/palace-utils.test.ts
git commit -m "feat: normalise room coordinates with minX/minY, add ENTRY_TOP_MARGIN to y"
```

---

### Task 3: Update PalaceSVG to use offsets and render entry point

**Files:**
- Modify: `app/components/PalaceSVG.tsx`

**Step 1: Update imports**

At line 8 in `PalaceSVG.tsx`, add `ENTRY_DOT_RADIUS` and `ENTRY_TOP_MARGIN` to the constants import:

```ts
import {
  ROOM_WIDTH, ROOM_HEIGHT, OBJ_RADIUS, DOOR_SIZE, ENTRY_DOT_RADIUS, ENTRY_TOP_MARGIN,
} from '@/lib/constants'
```

**Step 2: Replace the `getCanvasSize` call and add minX/minY**

Replace line 22:
```ts
const { width, height } = getCanvasSize(palace.rooms)
```
with:
```ts
const { width, height, minX, minY } = getCanvasSize(palace.rooms)
```

**Step 3: Update `roomToPixel` calls in connection line loop**

Lines 37–38 currently call `roomToPixel(room)` and `roomToPixel(neighbor)`. Update both to pass the offsets:

```ts
const { x: ax, y: ay } = roomToPixel(room, minX, minY)
const { x: bx, y: by } = roomToPixel(neighbor, minX, minY)
```

**Step 4: Add entry point rendering before connection lines**

After line 26 (`const connectionLines...` array declaration), add the entry point computation:

```ts
// Entry point: dot + line above the first room (always at gridPosition {x:0, y:0})
const entryRoom = palace.rooms.find(r => r.gridPosition.x === 0 && r.gridPosition.y === 0) ?? null
const entryPixel = entryRoom ? roomToPixel(entryRoom, minX, minY) : null
const dotX = entryPixel ? entryPixel.x + ROOM_WIDTH / 2 : width / 2
const dotY = CANVAS_PADDING + ENTRY_TOP_MARGIN / 2
```

**Step 5: Add entry point SVG elements inside the `<svg>` return**

Add before the `{/* Connection corridor lines */}` comment (before line 70):

```tsx
{/* Entry point — dot and line above the first room */}
{entryPixel && (
  <>
    <line
      x1={dotX} y1={dotY + ENTRY_DOT_RADIUS}
      x2={dotX} y2={entryPixel.y}
      stroke="var(--border)"
      strokeWidth={1}
      strokeOpacity={0.7}
      vectorEffect="non-scaling-stroke"
    />
    <circle
      cx={dotX} cy={dotY}
      r={ENTRY_DOT_RADIUS}
      fill="none"
      stroke="var(--smoke)"
      strokeWidth={1.5}
      strokeDasharray="3 3"
    />
  </>
)}
```

**Step 6: Thread minX/minY into RoomGroup**

Update the `RoomGroup` call inside `palace.rooms.map` (around line 84) to pass the new props:

```tsx
<RoomGroup
  key={room.id}
  room={room}
  allRooms={palace.rooms}
  selectedObjectId={selectedObjectId}
  onObjectClick={onObjectClick}
  onRoomClick={onRoomClick}
  minX={minX}
  minY={minY}
/>
```

**Step 7: Update the `RoomGroup` function signature and body**

Add `minX: number` and `minY: number` to the props interface and destructuring of `RoomGroup`:

```ts
function RoomGroup({
  room, allRooms, selectedObjectId, onObjectClick, onRoomClick, minX, minY,
}: {
  room: Room
  allRooms: Room[]
  selectedObjectId: string | null
  onObjectClick: (roomId: string, objectId: string) => void
  onRoomClick: (roomId: string) => void
  minX: number
  minY: number
})
```

Update the `roomToPixel` call at line 106:
```ts
const { x, y } = roomToPixel(room, minX, minY)
```

Pass `minX` and `minY` down to `ObjectNode` in the `room.objects.map`:
```tsx
{room.objects.map(obj => (
  <ObjectNode
    key={obj.id}
    room={room}
    obj={obj}
    isSelected={obj.id === selectedObjectId}
    onObjectClick={onObjectClick}
    minX={minX}
    minY={minY}
  />
))}
```

**Step 8: Update `ObjectNode` function signature and body**

Add `minX` and `minY` to `ObjectNode`'s props:

```ts
function ObjectNode({
  room, obj, isSelected, onObjectClick, minX, minY,
}: {
  room: Room
  obj: PalaceObject
  isSelected: boolean
  onObjectClick: (roomId: string, objectId: string) => void
  minX: number
  minY: number
})
```

Update the `objectToPixel` call (line 229):
```ts
const { x, y } = objectToPixel(room, obj, minX, minY)
```

**Step 9: Run all tests**

Run: `npx jest --no-coverage`
Expected: All PASS (PalaceSVG is not unit-tested, so no test changes needed here).

**Step 10: Commit**

```bash
git add app/components/PalaceSVG.tsx
git commit -m "feat: render entry point dot and line above first room, support negative x coords"
```

---

### Task 4: Update AI room generation prompt

**Files:**
- Modify: `app/api/generate-room/route.ts`

**Step 1: Update the first-room instruction in `buildPrompt`**

In `buildPrompt` (line 8–9), replace:
```ts
const existingRoomsText = rooms.length === 0
  ? 'This is the first room. Place it at gridPosition { "x": 0, "y": 0 } with an empty connections array.'
```
with:
```ts
const existingRoomsText = rooms.length === 0
  ? 'This is the first room (the entry hall). Place it at gridPosition { "x": 0, "y": 0 } with an empty connections array. It has three valid neighbour directions: left { "x": -1, "y": 0 }, right { "x": 1, "y": 0 }, and down { "x": 0, "y": 1 }.'
```

**Step 2: Add the y < 0 constraint to the subsequent-room instruction**

In the `else` branch of `existingRoomsText` (line 10–12), append to the end of the template string — after "Set connections to the id(s) of directly adjacent rooms." — add:

```
 CONSTRAINT: never place a room at y < 0. That direction is the palace entrance and must remain clear.
```

So the full else value becomes:
```ts
: `Existing rooms:\n${rooms.map(r =>
    `- "${r.name}" at grid position (${r.gridPosition.x}, ${r.gridPosition.y}) with id "${r.id}"`
  ).join('\n')}\n\nOccupied positions: ${rooms.map(r => `(${r.gridPosition.x},${r.gridPosition.y})`).join(', ')}\n\nPlace the new room adjacent (up/down/left/right) to an existing room at an unoccupied position. Set connections to the id(s) of directly adjacent rooms. CONSTRAINT: never place a room at y < 0. That direction is the palace entrance and must remain clear.`
```

**Step 3: Run all tests to confirm nothing broke**

Run: `npx jest --no-coverage`
Expected: All PASS. The existing `generate-room` tests mock the AI response entirely so they are unaffected by prompt changes.

**Step 4: Commit**

```bash
git add app/api/generate-room/route.ts
git commit -m "feat: update room generation prompt — first room has 3 neighbours, forbid y < 0"
```

---

### Final verification

Run: `npx jest --no-coverage`
Expected: All tests pass across all suites.

Start the dev server and manually verify:
- The entry dot with dashed border appears above the first room
- A corridor line connects the dot to the first room's north wall
- Generating additional rooms works correctly
- If a room appears to the left (x=-1), it renders on-canvas without clipping
