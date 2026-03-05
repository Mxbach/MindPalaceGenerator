# Room Topology Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change room connections from a mesh of adjacent rooms to a navigable tree: entry hall → 5 branch rooms → linear chains downward, with a hover "+" button to extend any branch.

**Architecture:** Server-side position and connection computation replaces AI-driven layout. New utility functions in `palace-utils.ts` are unit-tested independently. The SVG gains per-room hover buttons for extending branches.

**Tech Stack:** Next.js 16, React, TypeScript, Jest, SVG

---

### Task 1: Add placement utilities to palace-utils.ts

**Files:**
- Modify: `lib/palace-utils.ts`
- Test: `__tests__/palace-utils.test.ts` (create)

**Step 1: Write the failing tests**

Create `__tests__/palace-utils.test.ts`:

```ts
import { nextRoomPosition, computeConnections } from '@/lib/palace-utils'
import { Room } from '@/lib/types'

function makeRoom(id: string, x: number, y: number, connections: string[] = []): Room {
  return {
    id,
    name: id,
    description: '',
    gridPosition: { x, y },
    connections,
    objects: [],
  }
}

describe('nextRoomPosition', () => {
  test('returns (0,0) for empty palace', () => {
    expect(nextRoomPosition([])).toEqual({ x: 0, y: 0 })
  })

  test('returns (0,1) after entry room only', () => {
    const rooms = [makeRoom('entry', 0, 0)]
    expect(nextRoomPosition(rooms)).toEqual({ x: 0, y: 1 })
  })

  test('returns (-1,1) after first y=1 room', () => {
    const rooms = [makeRoom('entry', 0, 0), makeRoom('r1', 0, 1)]
    expect(nextRoomPosition(rooms)).toEqual({ x: -1, y: 1 })
  })

  test('returns (1,1) after two y=1 rooms', () => {
    const rooms = [makeRoom('entry', 0, 0), makeRoom('r1', 0, 1), makeRoom('r2', -1, 1)]
    expect(nextRoomPosition(rooms)).toEqual({ x: 1, y: 1 })
  })

  test('returns (-2,1) after three y=1 rooms', () => {
    const rooms = [
      makeRoom('entry', 0, 0),
      makeRoom('r1', 0, 1), makeRoom('r2', -1, 1), makeRoom('r3', 1, 1),
    ]
    expect(nextRoomPosition(rooms)).toEqual({ x: -2, y: 1 })
  })

  test('returns (2,1) after four y=1 rooms', () => {
    const rooms = [
      makeRoom('entry', 0, 0),
      makeRoom('r1', 0, 1), makeRoom('r2', -1, 1), makeRoom('r3', 1, 1), makeRoom('r4', -2, 1),
    ]
    expect(nextRoomPosition(rooms)).toEqual({ x: 2, y: 1 })
  })

  test('uses parentRoomId to place below a specific room', () => {
    const rooms = [
      makeRoom('entry', 0, 0),
      makeRoom('r1', 0, 1), makeRoom('r2', -1, 1),
    ]
    expect(nextRoomPosition(rooms, 'r2')).toEqual({ x: -1, y: 2 })
  })

  test('parentRoomId works for deeper rooms', () => {
    const rooms = [
      makeRoom('entry', 0, 0),
      makeRoom('r1', 0, 1),
      makeRoom('r2', 0, 2),
    ]
    expect(nextRoomPosition(rooms, 'r2')).toEqual({ x: 0, y: 3 })
  })
})

describe('computeConnections', () => {
  test('entry room has no connections', () => {
    expect(computeConnections({ x: 0, y: 0 }, [])).toEqual([])
  })

  test('y=1 room connects to entry', () => {
    const rooms = [makeRoom('entry', 0, 0)]
    expect(computeConnections({ x: 0, y: 1 }, rooms)).toEqual(['entry'])
  })

  test('y=1 room with no entry returns empty', () => {
    expect(computeConnections({ x: 0, y: 1 }, [])).toEqual([])
  })

  test('y=2 room connects to parent at same x', () => {
    const rooms = [makeRoom('entry', 0, 0), makeRoom('branch', 0, 1)]
    expect(computeConnections({ x: 0, y: 2 }, rooms)).toEqual(['branch'])
  })

  test('y=2 room picks correct parent by x', () => {
    const rooms = [
      makeRoom('entry', 0, 0),
      makeRoom('b0', 0, 1),
      makeRoom('b1', -1, 1),
    ]
    expect(computeConnections({ x: -1, y: 2 }, rooms)).toEqual(['b1'])
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/palace-utils.test.ts --no-coverage
```

Expected: FAIL — `nextRoomPosition` and `computeConnections` not exported

**Step 3: Add functions to palace-utils.ts**

Add to the bottom of `lib/palace-utils.ts`:

```ts
import { GridPosition } from './types'

// y=1 x positions in placement order: 0, -1, 1, -2, 2
const Y1_X_SEQUENCE = [0, -1, 1, -2, 2]
export const MAX_Y1_ROOMS = 5

export function nextRoomPosition(rooms: Room[], parentRoomId?: string): GridPosition {
  if (rooms.length === 0) return { x: 0, y: 0 }

  if (parentRoomId) {
    const parent = rooms.find(r => r.id === parentRoomId)
    if (!parent) throw new Error(`Parent room ${parentRoomId} not found`)
    return { x: parent.gridPosition.x, y: parent.gridPosition.y + 1 }
  }

  const y1Rooms = rooms.filter(r => r.gridPosition.y === 1)
  const idx = y1Rooms.length
  return { x: Y1_X_SEQUENCE[idx] ?? idx, y: 1 }
}

export function computeConnections(position: GridPosition, rooms: Room[]): string[] {
  if (position.y === 0) return []
  if (position.y === 1) {
    const entry = rooms.find(r => r.gridPosition.y === 0)
    return entry ? [entry.id] : []
  }
  const parent = rooms.find(
    r => r.gridPosition.x === position.x && r.gridPosition.y === position.y - 1
  )
  return parent ? [parent.id] : []
}
```

Note: `GridPosition` is already imported via `Room` in the file — add it to the import at the top:
```ts
import { Room, PalaceObject, GridPosition } from './types'
```

**Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/palace-utils.test.ts --no-coverage
```

Expected: all PASS

**Step 5: Commit**

```bash
git add lib/palace-utils.ts __tests__/palace-utils.test.ts
git commit -m "feat: add nextRoomPosition and computeConnections utilities"
```

---

### Task 2: Update generate-room route

**Files:**
- Modify: `app/api/generate-room/route.ts`
- Modify: `__tests__/api/generate-room.test.ts`

**Step 1: Update the mock responses in the test file**

The AI no longer returns `gridPosition` or `connections`. Update both mocks in `__tests__/api/generate-room.test.ts`:

```ts
// Claude mock text:
'{"name":"The Atrium","description":"A grand entrance hall","objects":[{"name":"Fountain","description":"A marble fountain","relativePosition":{"x":0.5,"y":0.5}}]}'

// OpenAI mock content (same):
'{"name":"The Atrium","description":"A grand entrance hall","objects":[{"name":"Fountain","description":"A marble fountain","relativePosition":{"x":0.5,"y":0.5}}]}'
```

Also add a test that the returned room has a computed `gridPosition` and `connections`:

```ts
test('returns room with server-computed gridPosition and connections', async () => {
  const res = await POST(makeRequest({ topic: 'Ancient Rome', rooms: [], provider: 'claude' }))
  const room = await res.json()
  expect(room.gridPosition).toEqual({ x: 0, y: 0 })
  expect(room.connections).toEqual([])
})
```

**Step 2: Run existing tests to confirm they break (mock format mismatch)**

```bash
npx jest __tests__/api/generate-room.test.ts --no-coverage
```

Expected: some FAIL (or PASS if the old mock format still works — either way, proceed)

**Step 3: Rewrite route**

Replace the entire content of `app/api/generate-room/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { generateId, nextRoomPosition, computeConnections } from '@/lib/palace-utils'
import { Room } from '@/lib/types'

function buildPrompt(topic: string, rooms: Room[], position: { x: number; y: number }): string {
  const entryRoom = rooms.find(r => r.gridPosition.y === 0)
  const parentRoom = position.y >= 2
    ? rooms.find(r => r.gridPosition.x === position.x && r.gridPosition.y === position.y - 1)
    : null

  let context: string
  if (position.y === 0) {
    context = 'This is the entry hall — the grand first room visitors step into. It should feel like a hub with multiple exits leading deeper into the palace.'
  } else if (position.y === 1) {
    context = `This room branches off from "${entryRoom?.name ?? 'the entry hall'}". It is one of several corridors accessible from the entry.`
  } else {
    context = `This room follows "${parentRoom?.name ?? 'the previous room'}" and leads deeper into the palace.`
  }

  const existingNames = rooms.length > 0
    ? `\nExisting rooms: ${rooms.map(r => `"${r.name}"`).join(', ')}`
    : ''

  return `Generate a room for a mind palace themed around "${topic}".
${context}${existingNames}

Requirements:
- 3 to 5 vivid, memorable objects per room
- Each object should be a strong visual anchor for the loci memory method
- relativePosition x and y are 0.0–1.0 within the room (spread objects out, avoid edges)

Return ONLY valid JSON in this exact format, no explanation:
{
  "name": "Room Name",
  "description": "Brief atmospheric description",
  "objects": [
    {
      "name": "Object Name",
      "description": "Vivid sensory description useful as a memory anchor",
      "relativePosition": { "x": <0.0-1.0>, "y": <0.0-1.0> }
    }
  ]
}`
}

async function generateWithClaude(prompt: string): Promise<string> {
  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: 'You output ONLY valid JSON with no explanation, markdown, or code blocks.',
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const openai = new OpenAI()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You output ONLY valid JSON with no explanation, markdown, or code blocks.' },
      { role: 'user', content: prompt },
    ],
    max_completion_tokens: 4096,
  })
  return response.choices[0].message.content ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const {
      topic,
      rooms,
      provider = 'openai',
      parentRoomId,
    }: { topic: string; rooms: Room[]; provider?: string; parentRoomId?: string } = await req.json()

    if (provider !== 'claude' && provider !== 'openai') {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    const position = nextRoomPosition(rooms, parentRoomId)
    const connections = computeConnections(position, rooms)
    const prompt = buildPrompt(topic, rooms, position)

    const text = provider === 'openai'
      ? await generateWithOpenAI(prompt)
      : await generateWithClaude(prompt)

    const roomData = JSON.parse(text)
    const room: Room = {
      ...roomData,
      id: generateId(),
      gridPosition: position,
      connections,
      objects: roomData.objects.map((obj: any) => ({
        ...obj,
        id: generateId(),
        memory: '',
      })),
    }

    return NextResponse.json(room)
  } catch (err) {
    console.error('generate-room error:', err)
    return NextResponse.json({ error: 'Failed to generate room' }, { status: 500 })
  }
}
```

Note: the old route had `model: 'gpt-5-mini'` which is incorrect — corrected to `gpt-4o-mini`.

**Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all PASS

**Step 5: Commit**

```bash
git add app/api/generate-room/route.ts __tests__/api/generate-room.test.ts
git commit -m "feat: compute room position and connections server-side"
```

---

### Task 3: Update page.tsx

**Files:**
- Modify: `app/page.tsx`

No new tests needed — this is UI wiring logic.

**Step 1: Update handleGenerateRoom to accept parentRoomId**

Find `handleGenerateRoom` and replace it:

```ts
async function handleGenerateRoom(parentRoomId?: string) {
  if (!palace) return
  setGenerating(true)
  setError(null)
  try {
    const res = await fetch('/api/generate-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: palace.topic, rooms: palace.rooms, provider, parentRoomId }),
    })
    if (!res.ok) throw new Error('Generation failed')
    const newRoom: Room = await res.json()
    await savePalace({ ...palace, rooms: [...palace.rooms, newRoom] })
  } catch {
    setError('Failed to generate room. Check your API key.')
  } finally {
    setGenerating(false)
  }
}
```

**Step 2: Hide the header "+ ROOM" button once 5 y=1 rooms exist**

Add a computed value just above the `return`:

```ts
const y1RoomCount = palace?.rooms.filter(r => r.gridPosition.y === 1).length ?? 0
const autoPhaseComplete = y1RoomCount >= 5
```

Then update the button condition — change:
```ts
{palace && (
  <button
    onClick={handleGenerateRoom}
```
to:
```ts
{palace && !autoPhaseComplete && (
  <button
    onClick={() => handleGenerateRoom()}
```

**Step 3: Pass onExtendRoom to PalaceSVG**

Find the `<PalaceSVG` usage and add the prop:

```tsx
<PalaceSVG
  palace={palace}
  selectedObjectId={selected?.objectId ?? null}
  onObjectClick={(roomId, objectId) => setSelected({ roomId, objectId })}
  onRoomClick={() => setSelected(null)}
  onDeselect={() => setSelected(null)}
  onExtendRoom={generating ? undefined : handleGenerateRoom}
/>
```

**Step 4: Run the app and do a manual smoke test**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- "+ ROOM" button appears and generates the entry hall
- Clicking 5 more times generates y=1 rooms at x = 0, -1, 1, -2, 2
- After 5 y=1 rooms, the "+ ROOM" header button disappears

**Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire handleGenerateRoom with parentRoomId and hide header button after 5 y=1 rooms"
```

---

### Task 4: Add hover "+" button to PalaceSVG

**Files:**
- Modify: `app/components/PalaceSVG.tsx`

**Step 1: Add onExtendRoom prop**

Update `PalaceSVGProps`:

```ts
interface PalaceSVGProps {
  palace: Palace
  selectedObjectId: string | null
  onObjectClick: (roomId: string, objectId: string) => void
  onRoomClick: (roomId: string) => void
  onDeselect: () => void
  onExtendRoom?: (roomId: string) => void
}
```

Destructure it:
```ts
export default function PalaceSVG({
  palace, selectedObjectId, onObjectClick, onRoomClick, onDeselect, onExtendRoom,
}: PalaceSVGProps) {
```

**Step 2: Pass onExtendRoom to RoomGroup**

In the `{palace.rooms.map(room => (` block, add the prop:

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
  onExtendRoom={onExtendRoom}
/>
```

**Step 3: Update RoomGroup signature**

Add `onExtendRoom` to the RoomGroup props type and destructure:

```ts
function RoomGroup({
  room, allRooms, selectedObjectId, onObjectClick, onRoomClick, minX, minY, onExtendRoom,
}: {
  room: Room
  allRooms: Room[]
  selectedObjectId: string | null
  onObjectClick: (roomId: string, objectId: string) => void
  onRoomClick: (roomId: string) => void
  minX: number
  minY: number
  onExtendRoom?: (roomId: string) => void
}) {
```

**Step 4: Determine whether to show the "+" button**

Inside `RoomGroup`, after the existing neighbor detection, add:

```ts
const hasRoomBelow = allRooms.some(
  r => r.gridPosition.x === room.gridPosition.x && r.gridPosition.y === room.gridPosition.y + 1
)
const showExtend = !!onExtendRoom && !hasRoomBelow
```

**Step 5: Render the "+" button inside the RoomGroup `<g>`**

Add this at the end of the `<g>` in RoomGroup, after the objects:

```tsx
{showExtend && (
  <g
    className="room-extend-btn"
    style={{ cursor: 'pointer' }}
    onClick={(e) => { e.stopPropagation(); onExtendRoom!(room.id) }}
  >
    <style>{`
      .room-extend-btn { opacity: 0; transition: opacity 150ms ease; }
      .room-extend-btn:hover { opacity: 1; }
    `}</style>
    <circle
      cx={x + ROOM_WIDTH / 2}
      cy={y + ROOM_HEIGHT + 20}
      r={10}
      fill="none"
      stroke="var(--border)"
      strokeWidth={1.5}
    />
    <text
      x={x + ROOM_WIDTH / 2}
      y={y + ROOM_HEIGHT + 25}
      textAnchor="middle"
      fill="var(--smoke)"
      style={{ fontSize: '14px', pointerEvents: 'none', userSelect: 'none' }}
    >
      +
    </text>
  </g>
)}
```

**Step 6: Manual smoke test**

```bash
npm run dev
```

- Hover a y=1 room — a faint "+" circle should appear below it
- Click it — a new room generates below that branch
- Hovering the new room (y=2) should also show "+"
- A room with a room already below it should NOT show "+"
- During generation (conjuring...) no "+" buttons should be visible

**Step 7: Commit**

```bash
git add app/components/PalaceSVG.tsx
git commit -m "feat: add hover extend button to rooms in SVG"
```

---

### Task 5: Run full test suite and verify

**Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all PASS

**Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors, clean build

**Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any remaining type or test issues"
```
