# Mind Palace Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js webapp where users generate AI-powered, topic-themed mind palace rooms one at a time on a 2D floor plan canvas, and attach personal memory notes to objects in each room.

**Architecture:** Next.js App Router with TypeScript. The frontend renders a floor plan on an HTML5 canvas. API routes handle Claude room generation and palace JSON file persistence. No database — state lives in `data/palace.json`.

**Tech Stack:** Next.js 15, TypeScript, HTML5 Canvas API, `@anthropic-ai/sdk` (claude-sonnet-4-6), Jest + @testing-library/jest-dom, Tailwind CSS

---

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, etc. (via create-next-app)
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

**Step 1: Scaffold Next.js project**

From `/home/max/Coding/MindPalaceGen`, run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```
Expected: Next.js project scaffolded with TypeScript, Tailwind CSS, App Router.

**Step 2: Install dependencies**
```bash
npm install @anthropic-ai/sdk
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @types/jest
```

**Step 3: Create `jest.config.ts`**
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

**Step 4: Create `jest.setup.ts`**
```typescript
import '@testing-library/jest-dom'
```

**Step 5: Add test scripts to `package.json`**

In the `"scripts"` section add:
```json
"test": "jest",
"test:watch": "jest --watch"
```

**Step 6: Create data directory and update `.gitignore`**
```bash
mkdir -p data
echo 'data/' >> .gitignore
```

**Step 7: Create `.env.local`**
```bash
echo 'ANTHROPIC_API_KEY=your-api-key-here' > .env.local
```
Replace `your-api-key-here` with your real Anthropic API key from https://console.anthropic.com.

**Step 8: Verify setup**
```bash
npm run dev
```
Expected: Next.js dev server starts at http://localhost:3000.

**Step 9: Commit**
```bash
git init
git add -A
git commit -m "feat: initialize Next.js project with Jest"
```

---

### Task 2: Define types and constants

**Files:**
- Create: `lib/types.ts`
- Create: `lib/constants.ts`

**Step 1: Create `lib/types.ts`**
```typescript
export interface GridPosition {
  x: number
  y: number
}

export interface RelativePosition {
  x: number  // 0.0 to 1.0 within room width
  y: number  // 0.0 to 1.0 within room height
}

export interface PalaceObject {
  id: string
  name: string
  description: string
  relativePosition: RelativePosition
  memory: string
}

export interface Room {
  id: string
  name: string
  description: string
  gridPosition: GridPosition
  connections: string[]  // IDs of rooms this room connects to
  objects: PalaceObject[]
}

export interface Palace {
  topic: string
  rooms: Room[]
}
```

**Step 2: Create `lib/constants.ts`**
```typescript
export const ROOM_WIDTH = 180
export const ROOM_HEIGHT = 140
export const GUTTER = 40         // space between rooms on the grid
export const CANVAS_PADDING = 40 // padding around the whole palace
export const OBJ_RADIUS = 8      // radius of object circles on canvas
export const DOOR_SIZE = 30      // width of the doorway gap in a wall
```

**Step 3: Commit**
```bash
git add lib/
git commit -m "feat: add TypeScript types and canvas constants"
```

---

### Task 3: Palace utility functions + tests

**Files:**
- Create: `lib/palace-utils.ts`
- Create: `__tests__/palace-utils.test.ts`

**Step 1: Write failing tests**

Create `__tests__/palace-utils.test.ts`:
```typescript
import {
  roomToPixel,
  objectToPixel,
  hitTestObject,
  hitTestRoom,
  getCanvasSize,
  roomsAreConnected,
  generateId,
} from '@/lib/palace-utils'
import { Room, PalaceObject } from '@/lib/types'
import { ROOM_WIDTH, ROOM_HEIGHT, GUTTER, CANVAS_PADDING, OBJ_RADIUS } from '@/lib/constants'

const makeRoom = (x: number, y: number, overrides: Partial<Room> = {}): Room => ({
  id: 'r1', name: 'Test Room', description: '',
  gridPosition: { x, y }, connections: [], objects: [],
  ...overrides,
})

const makeObj = (rx: number, ry: number): PalaceObject => ({
  id: 'o1', name: 'Test Obj', description: '',
  relativePosition: { x: rx, y: ry }, memory: '',
})

describe('roomToPixel', () => {
  test('grid (0,0) maps to canvas padding offset', () => {
    expect(roomToPixel(makeRoom(0, 0))).toEqual({ x: CANVAS_PADDING, y: CANVAS_PADDING })
  })
  test('grid (1,0) offsets x by ROOM_WIDTH + GUTTER', () => {
    expect(roomToPixel(makeRoom(1, 0))).toEqual({
      x: CANVAS_PADDING + ROOM_WIDTH + GUTTER,
      y: CANVAS_PADDING,
    })
  })
  test('grid (0,1) offsets y by ROOM_HEIGHT + GUTTER', () => {
    expect(roomToPixel(makeRoom(0, 1))).toEqual({
      x: CANVAS_PADDING,
      y: CANVAS_PADDING + ROOM_HEIGHT + GUTTER,
    })
  })
})

describe('objectToPixel', () => {
  test('center object (0.5, 0.5) maps to center of room', () => {
    expect(objectToPixel(makeRoom(0, 0), makeObj(0.5, 0.5))).toEqual({
      x: CANVAS_PADDING + ROOM_WIDTH * 0.5,
      y: CANVAS_PADDING + ROOM_HEIGHT * 0.5,
    })
  })
})

describe('hitTestObject', () => {
  test('click exactly on object center → true', () => {
    const room = makeRoom(0, 0)
    const obj = makeObj(0.5, 0.5)
    const { x, y } = objectToPixel(room, obj)
    expect(hitTestObject(x, y, room, obj)).toBe(true)
  })
  test('click just inside radius → true', () => {
    const room = makeRoom(0, 0)
    const obj = makeObj(0.5, 0.5)
    const { x, y } = objectToPixel(room, obj)
    expect(hitTestObject(x + OBJ_RADIUS - 1, y, room, obj)).toBe(true)
  })
  test('click just outside radius → false', () => {
    const room = makeRoom(0, 0)
    const obj = makeObj(0.5, 0.5)
    const { x, y } = objectToPixel(room, obj)
    expect(hitTestObject(x + OBJ_RADIUS + 2, y, room, obj)).toBe(false)
  })
})

describe('hitTestRoom', () => {
  test('click inside room bounds → true', () => {
    expect(hitTestRoom(CANVAS_PADDING + 10, CANVAS_PADDING + 10, makeRoom(0, 0))).toBe(true)
  })
  test('click outside room bounds → false', () => {
    expect(hitTestRoom(0, 0, makeRoom(0, 0))).toBe(false)
  })
})

describe('getCanvasSize', () => {
  test('single room at (0,0) → minimal canvas', () => {
    const { width, height } = getCanvasSize([makeRoom(0, 0)])
    expect(width).toBe(CANVAS_PADDING * 2 + ROOM_WIDTH)
    expect(height).toBe(CANVAS_PADDING * 2 + ROOM_HEIGHT)
  })
  test('two rooms at (0,0) and (1,0) → wider canvas', () => {
    const { width, height } = getCanvasSize([makeRoom(0, 0), makeRoom(1, 0)])
    expect(width).toBe(CANVAS_PADDING * 2 + ROOM_WIDTH * 2 + GUTTER)
    expect(height).toBe(CANVAS_PADDING * 2 + ROOM_HEIGHT)
  })
  test('empty rooms → minimum fallback size', () => {
    const { width, height } = getCanvasSize([])
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })
})

describe('roomsAreConnected', () => {
  test('A has B in connections → true', () => {
    const a = makeRoom(0, 0, { id: 'a', connections: ['b'] })
    const b = makeRoom(1, 0, { id: 'b', connections: [] })
    expect(roomsAreConnected(a, b)).toBe(true)
  })
  test('B has A in connections → true (bidirectional check)', () => {
    const a = makeRoom(0, 0, { id: 'a', connections: [] })
    const b = makeRoom(1, 0, { id: 'b', connections: ['a'] })
    expect(roomsAreConnected(a, b)).toBe(true)
  })
  test('no connections → false', () => {
    const a = makeRoom(0, 0, { id: 'a', connections: [] })
    const b = makeRoom(1, 0, { id: 'b', connections: [] })
    expect(roomsAreConnected(a, b)).toBe(false)
  })
})

describe('generateId', () => {
  test('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string')
    expect(generateId().length).toBeGreaterThan(0)
  })
  test('generates unique values', () => {
    expect(generateId()).not.toBe(generateId())
  })
})
```

**Step 2: Run test to verify it fails**
```bash
npm test -- --testPathPattern="palace-utils" --no-coverage
```
Expected: FAIL — "Cannot find module '@/lib/palace-utils'"

**Step 3: Implement `lib/palace-utils.ts`**
```typescript
import { Room, PalaceObject } from './types'
import { ROOM_WIDTH, ROOM_HEIGHT, GUTTER, CANVAS_PADDING, OBJ_RADIUS } from './constants'

export function roomToPixel(room: Room): { x: number; y: number } {
  return {
    x: CANVAS_PADDING + room.gridPosition.x * (ROOM_WIDTH + GUTTER),
    y: CANVAS_PADDING + room.gridPosition.y * (ROOM_HEIGHT + GUTTER),
  }
}

export function objectToPixel(room: Room, obj: PalaceObject): { x: number; y: number } {
  const { x, y } = roomToPixel(room)
  return {
    x: x + obj.relativePosition.x * ROOM_WIDTH,
    y: y + obj.relativePosition.y * ROOM_HEIGHT,
  }
}

export function hitTestObject(clickX: number, clickY: number, room: Room, obj: PalaceObject): boolean {
  const { x, y } = objectToPixel(room, obj)
  const dx = clickX - x
  const dy = clickY - y
  return Math.sqrt(dx * dx + dy * dy) <= OBJ_RADIUS
}

export function hitTestRoom(clickX: number, clickY: number, room: Room): boolean {
  const { x, y } = roomToPixel(room)
  return clickX >= x && clickX <= x + ROOM_WIDTH && clickY >= y && clickY <= y + ROOM_HEIGHT
}

export function getCanvasSize(rooms: Room[]): { width: number; height: number } {
  if (rooms.length === 0) {
    return { width: CANVAS_PADDING * 2 + ROOM_WIDTH, height: CANVAS_PADDING * 2 + ROOM_HEIGHT }
  }
  const maxX = Math.max(...rooms.map(r => r.gridPosition.x))
  const maxY = Math.max(...rooms.map(r => r.gridPosition.y))
  return {
    width: CANVAS_PADDING * 2 + (maxX + 1) * ROOM_WIDTH + maxX * GUTTER,
    height: CANVAS_PADDING * 2 + (maxY + 1) * ROOM_HEIGHT + maxY * GUTTER,
  }
}

export function roomsAreConnected(a: Room, b: Room): boolean {
  return a.connections.includes(b.id) || b.connections.includes(a.id)
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
```

**Step 4: Run test to verify it passes**
```bash
npm test -- --testPathPattern="palace-utils" --no-coverage
```
Expected: PASS — all tests pass.

**Step 5: Commit**
```bash
git add lib/palace-utils.ts __tests__/palace-utils.test.ts
git commit -m "feat: add palace utility functions with tests"
```

---

### Task 4: Palace API route + tests

**Files:**
- Create: `app/api/palace/route.ts`
- Create: `__tests__/api/palace.test.ts`

**Step 1: Write failing tests**

Create `__tests__/api/palace.test.ts`:
```typescript
import { GET, POST } from '@/app/api/palace/route'
import { NextRequest } from 'next/server'

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined),
}))

import { readFile, writeFile } from 'fs/promises'
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>

const mockPalace = { topic: 'Ancient Rome', rooms: [] }

describe('GET /api/palace', () => {
  test('returns {} when file does not exist', async () => {
    mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({})
  })
  test('returns palace data when file exists', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(mockPalace) as any)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(mockPalace)
  })
})

describe('POST /api/palace', () => {
  test('writes palace to file and returns ok', async () => {
    mockWriteFile.mockResolvedValueOnce(undefined)
    const req = new NextRequest('http://localhost/api/palace', {
      method: 'POST',
      body: JSON.stringify(mockPalace),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('palace.json'),
      JSON.stringify(mockPalace, null, 2),
      'utf-8'
    )
  })
})
```

**Step 2: Run test to verify it fails**
```bash
npm test -- --testPathPattern="api/palace" --no-coverage
```
Expected: FAIL — "Cannot find module"

**Step 3: Implement `app/api/palace/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

const PALACE_PATH = path.join(process.cwd(), 'data', 'palace.json')

export async function GET() {
  try {
    const content = await readFile(PALACE_PATH, 'utf-8')
    return NextResponse.json(JSON.parse(content))
  } catch (err: any) {
    if (err.code === 'ENOENT') return NextResponse.json({})
    return NextResponse.json({ error: 'Failed to read palace' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const palace = await req.json()
    await mkdir(path.dirname(PALACE_PATH), { recursive: true })
    await writeFile(PALACE_PATH, JSON.stringify(palace, null, 2), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to write palace' }, { status: 500 })
  }
}
```

**Step 4: Run test to verify it passes**
```bash
npm test -- --testPathPattern="api/palace" --no-coverage
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/api/palace/ __tests__/api/palace.test.ts
git commit -m "feat: add palace GET/POST API route with tests"
```

---

### Task 5: Generate-room API route + tests

**Files:**
- Create: `app/api/generate-room/route.ts`
- Create: `__tests__/api/generate-room.test.ts`

**Step 1: Write failing tests**

Create `__tests__/api/generate-room.test.ts`:
```typescript
import { POST } from '@/app/api/generate-room/route'
import { NextRequest } from 'next/server'

const mockRoomData = {
  name: 'The Atrium',
  description: 'A grand entrance hall',
  gridPosition: { x: 0, y: 0 },
  connections: [],
  objects: [
    { name: 'Fountain', description: 'A marble fountain', relativePosition: { x: 0.5, y: 0.5 } },
  ],
}

jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockRoomData) }],
      }),
    },
  })),
}))

describe('POST /api/generate-room', () => {
  test('returns a room with generated id and objects with ids', async () => {
    const req = new NextRequest('http://localhost/api/generate-room', {
      method: 'POST',
      body: JSON.stringify({ topic: 'Ancient Rome', rooms: [] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const room = await res.json()
    expect(typeof room.id).toBe('string')
    expect(room.name).toBe('The Atrium')
    expect(room.gridPosition).toEqual({ x: 0, y: 0 })
    expect(room.objects).toHaveLength(1)
    expect(typeof room.objects[0].id).toBe('string')
    expect(room.objects[0].memory).toBe('')
  })
})
```

**Step 2: Run test to verify it fails**
```bash
npm test -- --testPathPattern="generate-room" --no-coverage
```
Expected: FAIL — "Cannot find module"

**Step 3: Implement `app/api/generate-room/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateId } from '@/lib/palace-utils'
import { Room } from '@/lib/types'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { topic, rooms }: { topic: string; rooms: Room[] } = await req.json()

    const existingRoomsText = rooms.length === 0
      ? 'This is the first room. Place it at gridPosition { "x": 0, "y": 0 } with an empty connections array.'
      : `Existing rooms:\n${rooms.map(r =>
          `- "${r.name}" at grid position (${r.gridPosition.x}, ${r.gridPosition.y}) with id "${r.id}"`
        ).join('\n')}\n\nOccupied positions: ${rooms.map(r => `(${r.gridPosition.x},${r.gridPosition.y})`).join(', ')}\n\nPlace the new room adjacent (up/down/left/right) to an existing room at an unoccupied position. Set connections to the id(s) of directly adjacent rooms.`

    const prompt = `Generate a room for a mind palace themed around "${topic}".
${existingRoomsText}

Requirements:
- 3 to 5 vivid, memorable objects per room
- Each object should be a strong visual anchor for the loci memory method
- relativePosition x and y are 0.0–1.0 within the room (spread objects out, avoid edges)

Return ONLY valid JSON in this exact format, no explanation:
{
  "name": "Room Name",
  "description": "Brief atmospheric description",
  "gridPosition": { "x": <integer>, "y": <integer> },
  "connections": ["<existing room id>"],
  "objects": [
    {
      "name": "Object Name",
      "description": "Vivid sensory description useful as a memory anchor",
      "relativePosition": { "x": <0.0-1.0>, "y": <0.0-1.0> }
    }
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You output ONLY valid JSON with no explanation, markdown, or code blocks.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const roomData = JSON.parse(text)

    const room: Room = {
      ...roomData,
      id: generateId(),
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

**Step 4: Run test to verify it passes**
```bash
npm test -- --testPathPattern="generate-room" --no-coverage
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/api/generate-room/ __tests__/api/generate-room.test.ts
git commit -m "feat: add generate-room API route with Claude integration and tests"
```

---

### Task 6: Canvas component

**Files:**
- Create: `app/components/Canvas.tsx`

No automated tests — visual rendering verified by running the app in Task 9.

**Step 1: Create `app/components/Canvas.tsx`**
```typescript
'use client'

import { useEffect, useRef } from 'react'
import { Palace, Room, PalaceObject } from '@/lib/types'
import { ROOM_WIDTH, ROOM_HEIGHT, OBJ_RADIUS, DOOR_SIZE } from '@/lib/constants'
import {
  roomToPixel, objectToPixel, hitTestObject, hitTestRoom,
  getCanvasSize, roomsAreConnected,
} from '@/lib/palace-utils'

interface CanvasProps {
  palace: Palace
  selectedObjectId: string | null
  onObjectClick: (roomId: string, objectId: string) => void
  onRoomClick: (roomId: string) => void
  onDeselect: () => void
}

export default function Canvas({ palace, selectedObjectId, onObjectClick, onRoomClick, onDeselect }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { width, height } = getCanvasSize(palace.rooms)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    for (const room of palace.rooms) {
      drawRoom(ctx, room, palace.rooms, selectedObjectId)
    }
  }, [palace, selectedObjectId, width, height])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    for (const room of palace.rooms) {
      for (const obj of room.objects) {
        if (hitTestObject(clickX, clickY, room, obj)) {
          onObjectClick(room.id, obj.id)
          return
        }
      }
    }
    for (const room of palace.rooms) {
      if (hitTestRoom(clickX, clickY, room)) {
        onRoomClick(room.id)
        return
      }
    }
    onDeselect()
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      className="cursor-pointer"
      style={{ display: 'block' }}
    />
  )
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  allRooms: Room[],
  selectedObjectId: string | null,
) {
  const { x, y } = roomToPixel(room)

  // Background
  ctx.fillStyle = '#f9f6f0'
  ctx.fillRect(x, y, ROOM_WIDTH, ROOM_HEIGHT)

  // Determine which walls have doorways
  const northNeighbor = allRooms.find(r =>
    roomsAreConnected(room, r) &&
    r.gridPosition.x === room.gridPosition.x &&
    r.gridPosition.y === room.gridPosition.y - 1
  )
  const southNeighbor = allRooms.find(r =>
    roomsAreConnected(room, r) &&
    r.gridPosition.x === room.gridPosition.x &&
    r.gridPosition.y === room.gridPosition.y + 1
  )
  const westNeighbor = allRooms.find(r =>
    roomsAreConnected(room, r) &&
    r.gridPosition.y === room.gridPosition.y &&
    r.gridPosition.x === room.gridPosition.x - 1
  )
  const eastNeighbor = allRooms.find(r =>
    roomsAreConnected(room, r) &&
    r.gridPosition.y === room.gridPosition.y &&
    r.gridPosition.x === room.gridPosition.x + 1
  )

  ctx.strokeStyle = '#5a4a3a'
  ctx.lineWidth = 2

  // North wall
  drawWall(ctx, x, y, x + ROOM_WIDTH, y, !!northNeighbor, false)
  // South wall
  drawWall(ctx, x, y + ROOM_HEIGHT, x + ROOM_WIDTH, y + ROOM_HEIGHT, !!southNeighbor, false)
  // West wall
  drawWall(ctx, x, y, x, y + ROOM_HEIGHT, !!westNeighbor, true)
  // East wall
  drawWall(ctx, x + ROOM_WIDTH, y, x + ROOM_WIDTH, y + ROOM_HEIGHT, !!eastNeighbor, true)

  // Room name
  ctx.fillStyle = '#3a2a1a'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(room.name, x + ROOM_WIDTH / 2, y + 18, ROOM_WIDTH - 10)

  // Objects
  for (const obj of room.objects) {
    drawObject(ctx, room, obj, obj.id === selectedObjectId)
  }
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  hasDoor: boolean, isVertical: boolean,
) {
  if (!hasDoor) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    return
  }
  // Draw wall with a centered gap for the doorway
  const len = isVertical ? (y2 - y1) : (x2 - x1)
  const mid = len / 2
  const halfDoor = DOOR_SIZE / 2
  ctx.beginPath()
  if (isVertical) {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1, y1 + mid - halfDoor)
    ctx.moveTo(x1, y1 + mid + halfDoor)
    ctx.lineTo(x2, y2)
  } else {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 + mid - halfDoor, y1)
    ctx.moveTo(x1 + mid + halfDoor, y1)
    ctx.lineTo(x2, y2)
  }
  ctx.stroke()
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  room: Room,
  obj: PalaceObject,
  isSelected: boolean,
) {
  const { x, y } = objectToPixel(room, obj)

  ctx.beginPath()
  ctx.arc(x, y, OBJ_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = isSelected ? '#e06020' : (obj.memory ? '#4a8f4a' : '#8a6a4a')
  ctx.fill()
  ctx.strokeStyle = isSelected ? '#a03000' : '#5a3a2a'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Label below the circle
  ctx.fillStyle = '#3a2a1a'
  ctx.font = '9px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(obj.name, x, y + OBJ_RADIUS + 10)
}
```

**Step 2: Commit**
```bash
git add app/components/Canvas.tsx
git commit -m "feat: add Canvas component with room and object rendering"
```

---

### Task 7: Sidebar component

**Files:**
- Create: `app/components/Sidebar.tsx`

**Step 1: Create `app/components/Sidebar.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { PalaceObject, Room } from '@/lib/types'

interface SidebarProps {
  room: Room | null
  object: PalaceObject | null
  onSave: (memory: string) => void
  onClose: () => void
}

export default function Sidebar({ room, object, onSave, onClose }: SidebarProps) {
  const [memory, setMemory] = useState('')

  useEffect(() => {
    setMemory(object?.memory ?? '')
  }, [object])

  if (!room || !object) return null

  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col p-4 gap-3 shrink-0">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{room.name}</p>
          <h2 className="font-semibold text-gray-900">{object.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <p className="text-sm text-gray-600 italic">{object.description}</p>

      <div className="flex flex-col gap-2 flex-1">
        <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          Memory note
        </label>
        <textarea
          className="flex-1 min-h-[120px] border border-gray-200 rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="What do you want to remember here? Visualize it vividly..."
          value={memory}
          onChange={(e) => setMemory(e.target.value)}
        />
      </div>

      <button
        onClick={() => onSave(memory)}
        className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 rounded transition-colors"
      >
        Save
      </button>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add app/components/Sidebar.tsx
git commit -m "feat: add Sidebar component for memory note editing"
```

---

### Task 8: NewPalaceModal component

**Files:**
- Create: `app/components/NewPalaceModal.tsx`

**Step 1: Create `app/components/NewPalaceModal.tsx`**
```typescript
'use client'

import { useState } from 'react'

interface NewPalaceModalProps {
  onConfirm: (topic: string) => void
}

export default function NewPalaceModal({ onConfirm }: NewPalaceModalProps) {
  const [topic, setTopic] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (topic.trim()) onConfirm(topic.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Create Your Mind Palace</h1>
        <p className="text-sm text-gray-500 mb-6">
          Choose a theme. Claude will generate rooms one at a time, each filled with vivid
          objects you can anchor your memories to.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            autoFocus
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. Ancient Rome, Deep Ocean, Haunted Mansion..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
          >
            Begin
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add app/components/NewPalaceModal.tsx
git commit -m "feat: add NewPalaceModal for palace creation"
```

---

### Task 9: Main page

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Step 1: Update title in `app/layout.tsx`**

Find the `metadata` export and replace it with:
```typescript
export const metadata: Metadata = {
  title: 'Mind Palace',
  description: 'AI-powered mind palace generator using the loci method',
}
```

**Step 2: Replace `app/page.tsx`**

Delete all existing content and replace with:
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from './components/Sidebar'
import NewPalaceModal from './components/NewPalaceModal'
import { Palace, Room } from '@/lib/types'

// Canvas uses browser APIs — load client-side only
const Canvas = dynamic(() => import('./components/Canvas'), { ssr: false })

interface SelectedItem {
  roomId: string
  objectId: string
}

export default function Home() {
  const [palace, setPalace] = useState<Palace | null>(null)
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/palace')
      .then(r => r.json())
      .then(data => {
        setPalace(Object.keys(data).length > 0 ? data : null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const savePalace = useCallback(async (updated: Palace) => {
    setPalace(updated)
    await fetch('/api/palace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }, [])

  async function handleCreatePalace(topic: string) {
    await savePalace({ topic, rooms: [] })
  }

  async function handleGenerateRoom() {
    if (!palace) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: palace.topic, rooms: palace.rooms }),
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

  function handleSaveMemory(memory: string) {
    if (!palace || !selected) return
    const updated: Palace = {
      ...palace,
      rooms: palace.rooms.map(room =>
        room.id !== selected.roomId ? room : {
          ...room,
          objects: room.objects.map(obj =>
            obj.id !== selected.objectId ? obj : { ...obj, memory }
          ),
        }
      ),
    }
    savePalace(updated)
  }

  const selectedRoom = palace?.rooms.find(r => r.id === selected?.roomId) ?? null
  const selectedObject = selectedRoom?.objects.find(o => o.id === selected?.objectId) ?? null

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-gray-900">Mind Palace</h1>
          {palace && <span className="text-sm text-gray-500 italic">— {palace.topic}</span>}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-500">{error}</span>}
          {palace && (
            <button
              onClick={handleGenerateRoom}
              disabled={generating}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
            >
              {generating ? 'Generating...' : '+ Room'}
            </button>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-4">
          {palace && palace.rooms.length === 0 && (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              Click &quot;+ Room&quot; to generate your first room
            </div>
          )}
          {palace && palace.rooms.length > 0 && (
            <Canvas
              palace={palace}
              selectedObjectId={selected?.objectId ?? null}
              onObjectClick={(roomId, objectId) => setSelected({ roomId, objectId })}
              onRoomClick={() => setSelected(null)}
              onDeselect={() => setSelected(null)}
            />
          )}
        </div>

        {/* Sidebar */}
        <Sidebar
          room={selectedRoom}
          object={selectedObject}
          onSave={handleSaveMemory}
          onClose={() => setSelected(null)}
        />
      </div>

      {/* New palace modal */}
      {!palace && <NewPalaceModal onConfirm={handleCreatePalace} />}
    </div>
  )
}
```

**Step 3: Run all tests**
```bash
npm test --no-coverage
```
Expected: All tests pass.

**Step 4: Run the app and verify the full flow**
```bash
npm run dev
```
Open http://localhost:3000 and verify:
1. "Create Your Mind Palace" modal appears
2. Enter a topic (e.g. "Ancient Rome") and click Begin
3. Click "+ Room" — spinner shows, then a room appears on the canvas
4. Click an object circle → sidebar opens with the object name and description
5. Type a memory note and click Save → object circle turns green
6. Click "+ Room" again → a second room appears connected to the first via a doorway
7. Stop and restart `npm run dev` — the palace is still there (persisted in `data/palace.json`)

**Step 5: Commit**
```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: wire up main page with canvas, sidebar, and palace creation"
```

---

### Task 10: Final cleanup

**Files:**
- Modify: `.gitignore`

**Step 1: Verify `data/` is in `.gitignore`**
```bash
cat .gitignore | grep data
```
Expected output: `data/`
If missing, run: `echo 'data/' >> .gitignore`

**Step 2: Confirm `.env.local` has your API key**
```bash
cat .env.local
```
Expected: `ANTHROPIC_API_KEY=sk-ant-...` (your real key)

**Step 3: Run full test suite one final time**
```bash
npm test --no-coverage
```
Expected: All tests pass.

**Step 4: Final commit**
```bash
git add .gitignore
git commit -m "chore: finalize gitignore and project setup"
```

The app is complete. Run `npm run dev` and open http://localhost:3000 to start building your mind palace.
