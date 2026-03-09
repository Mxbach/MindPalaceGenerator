# Fixed Object Slot Positions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AI-generated object positions with 5 fixed hand-crafted slots, eliminating label overlap in SVG rooms.

**Architecture:** Add `OBJECT_SLOTS` to `lib/constants.ts`; update the API route to assign slots by index when mapping AI-returned objects; remove `relativePosition` from the AI prompt entirely.

**Tech Stack:** TypeScript, Next.js App Router API route, Jest

---

## Chunk 1: Add OBJECT_SLOTS constant and wire into API route

**Spec:** `docs/superpowers/specs/2026-03-10-fixed-object-slots-design.md`

### Task 1: Add OBJECT_SLOTS to constants

**Files:**
- Modify: `lib/constants.ts`
- Test: `__tests__/palace-utils.test.ts` (add at top of file, import from constants)

- [ ] **Step 1: Write the failing test**

Add `OBJECT_SLOTS` to the existing constants import on line 11 of `__tests__/palace-utils.test.ts`:

```ts
import { ROOM_WIDTH, ROOM_HEIGHT, GUTTER, CANVAS_PADDING, OBJ_RADIUS, ENTRY_TOP_MARGIN, OBJECT_SLOTS } from '@/lib/constants'
```

Then add the new describe block:

```ts
describe('OBJECT_SLOTS', () => {
  test('has exactly 5 slots', () => {
    expect(OBJECT_SLOTS).toHaveLength(5)
  })

  test('all slots are valid RelativePositions (0.0–1.0)', () => {
    for (const slot of OBJECT_SLOTS) {
      expect(slot.x).toBeGreaterThanOrEqual(0)
      expect(slot.x).toBeLessThanOrEqual(1)
      expect(slot.y).toBeGreaterThanOrEqual(0)
      expect(slot.y).toBeLessThanOrEqual(1)
    }
  })

  test('no two slots share the same x and y', () => {
    const keys = OBJECT_SLOTS.map(s => `${s.x},${s.y}`)
    expect(new Set(keys).size).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/palace-utils.test.ts
```

Expected: FAIL — `OBJECT_SLOTS` is not exported from `@/lib/constants`

- [ ] **Step 3: Add OBJECT_SLOTS to lib/constants.ts**

Add after the existing constants (note: `RelativePosition` must be imported):

```ts
import type { RelativePosition } from './types'

export const OBJECT_SLOTS: RelativePosition[] = [
  { x: 0.22, y: 0.25 }, // top-left
  { x: 0.78, y: 0.25 }, // top-right
  { x: 0.50, y: 0.52 }, // center
  { x: 0.22, y: 0.78 }, // bottom-left
  { x: 0.78, y: 0.78 }, // bottom-right
]
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/palace-utils.test.ts
```

Expected: all OBJECT_SLOTS tests PASS, no regressions

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts __tests__/palace-utils.test.ts
git commit -m "feat: add OBJECT_SLOTS fixed position constants"
```

---

### Task 2: Wire OBJECT_SLOTS into the generate-room API route

**Files:**
- Modify: `app/api/generate-room/route.ts`
- Test: `__tests__/api/generate-room.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new test to the existing `describe('POST /api/generate-room')` block in `__tests__/api/generate-room.test.ts`.

First, update the Claude mock's return value to include 2 objects (so we can verify multiple slots), and add the import:

```ts
import { OBJECT_SLOTS } from '@/lib/constants'
```

Update the Claude mock's `text` field to return 2 objects:

```ts
text: '{"name":"The Atrium","description":"A grand entrance hall","objects":[{"name":"Fountain","description":"A marble fountain","relativePosition":{"x":0.5,"y":0.5}},{"name":"Statue","description":"A stone guardian","relativePosition":{"x":0.9,"y":0.9}}]}'
```

Do the same for the OpenAI mock's `content` field.

Then add this test:

```ts
test('assigns OBJECT_SLOTS positions to objects, ignoring AI positions', async () => {
  const res = await POST(makeRequest({ topic: 'Ancient Rome', rooms: [], provider: 'claude' }))
  const room = await res.json()
  expect(room.objects[0].relativePosition).toEqual(OBJECT_SLOTS[0])
  expect(room.objects[1].relativePosition).toEqual(OBJECT_SLOTS[1])
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/api/generate-room.test.ts
```

Expected: FAIL — objects still have the AI's positions (`{x:0.5,y:0.5}` and `{x:0.9,y:0.9}`)

- [ ] **Step 3: Update the API route**

In `app/api/generate-room/route.ts`:

1. Add import at top:
```ts
import { OBJECT_SLOTS } from '@/lib/constants'
```

2. Update the `objects` mapping (currently line 99) to assign slot positions by index:
```ts
objects: roomData.objects.map((obj: any, i: number) => ({
  ...obj,
  id: generateId(),
  memory: '',
  relativePosition: OBJECT_SLOTS[i] ?? OBJECT_SLOTS[0],
})),
```

The fallback `?? OBJECT_SLOTS[0]` handles the edge case where the AI returns more objects than slots (shouldn't happen given 3–5 objects and 5 slots, but defensive).

3. In `buildPrompt`, remove `relativePosition` from the JSON format example and remove the "avoid edges" instruction. Change:

```ts
    {
      "name": "Object Name",
      "description": "Vivid sensory description useful as a memory anchor",
      "relativePosition": { "x": <0.0-1.0>, "y": <0.0-1.0> }
    }
```

To:

```ts
    {
      "name": "Object Name",
      "description": "Vivid sensory description useful as a memory anchor"
    }
```

And remove the line:
```
- relativePosition x and y are 0.0–1.0 within the room (spread objects out, avoid edges)
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npm run test
```

Expected: all tests PASS including the new slot-assignment test

- [ ] **Step 5: Commit**

```bash
git add app/api/generate-room/route.ts __tests__/api/generate-room.test.ts
git commit -m "feat: assign fixed OBJECT_SLOTS positions, remove relativePosition from AI prompt"
```
