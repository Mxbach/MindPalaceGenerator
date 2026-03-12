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
import { ROOM_WIDTH, ROOM_HEIGHT, GUTTER, CANVAS_PADDING, OBJ_RADIUS, ENTRY_TOP_MARGIN, OBJECT_SLOTS } from '@/lib/constants'

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

describe('objectToPixel', () => {
  test('center object (0.5, 0.5) maps to centre of room', () => {
    expect(objectToPixel(makeRoom(0, 0), makeObj(0.5, 0.5))).toEqual({
      x: CANVAS_PADDING + ROOM_WIDTH * 0.5,
      y: CANVAS_PADDING + ENTRY_TOP_MARGIN + ROOM_HEIGHT * 0.5,
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
    expect(hitTestRoom(CANVAS_PADDING + 10, CANVAS_PADDING + ENTRY_TOP_MARGIN + 10, makeRoom(0, 0))).toBe(true)
  })
  test('click outside room bounds → false', () => {
    expect(hitTestRoom(0, 0, makeRoom(0, 0))).toBe(false)
  })
})

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

import { nextRoomPosition, computeConnections } from '@/lib/palace-utils'

function makeRoomWithId(id: string, x: number, y: number, connections: string[] = []): Room {
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
    const rooms = [makeRoomWithId('entry', 0, 0)]
    expect(nextRoomPosition(rooms)).toEqual({ x: 0, y: 1 })
  })

  test('returns (-1,1) after first y=1 room', () => {
    const rooms = [makeRoomWithId('entry', 0, 0), makeRoomWithId('r1', 0, 1)]
    expect(nextRoomPosition(rooms)).toEqual({ x: -1, y: 1 })
  })

  test('returns (1,1) after two y=1 rooms', () => {
    const rooms = [makeRoomWithId('entry', 0, 0), makeRoomWithId('r1', 0, 1), makeRoomWithId('r2', -1, 1)]
    expect(nextRoomPosition(rooms)).toEqual({ x: 1, y: 1 })
  })

  test('returns (-2,1) after three y=1 rooms', () => {
    const rooms = [
      makeRoomWithId('entry', 0, 0),
      makeRoomWithId('r1', 0, 1), makeRoomWithId('r2', -1, 1), makeRoomWithId('r3', 1, 1),
    ]
    expect(nextRoomPosition(rooms)).toEqual({ x: -2, y: 1 })
  })

  test('returns (2,1) after four y=1 rooms', () => {
    const rooms = [
      makeRoomWithId('entry', 0, 0),
      makeRoomWithId('r1', 0, 1), makeRoomWithId('r2', -1, 1), makeRoomWithId('r3', 1, 1), makeRoomWithId('r4', -2, 1),
    ]
    expect(nextRoomPosition(rooms)).toEqual({ x: 2, y: 1 })
  })

  test('uses parentRoomId to place below a specific room', () => {
    const rooms = [
      makeRoomWithId('entry', 0, 0),
      makeRoomWithId('r1', 0, 1), makeRoomWithId('r2', -1, 1),
    ]
    expect(nextRoomPosition(rooms, 'r2')).toEqual({ x: -1, y: 2 })
  })

  test('parentRoomId works for deeper rooms', () => {
    const rooms = [
      makeRoomWithId('entry', 0, 0),
      makeRoomWithId('r1', 0, 1),
      makeRoomWithId('r2', 0, 2),
    ]
    expect(nextRoomPosition(rooms, 'r2')).toEqual({ x: 0, y: 3 })
  })
})

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

  test('slot positions match the designed layout', () => {
    expect(OBJECT_SLOTS).toEqual([
      { x: 0.22, y: 0.22 },
      { x: 0.78, y: 0.30 },
      { x: 0.50, y: 0.52 },
      { x: 0.22, y: 0.68 },
      { x: 0.78, y: 0.78 },
    ])
  })

  test('no two slots share the same y (prevents label row overlap)', () => {
    const ys = OBJECT_SLOTS.map(s => s.y)
    expect(new Set(ys).size).toBe(OBJECT_SLOTS.length)
  })
})

describe('computeConnections', () => {
  test('entry room has no connections', () => {
    expect(computeConnections({ x: 0, y: 0 }, [])).toEqual([])
  })

  test('y=1 room connects to entry', () => {
    const rooms = [makeRoomWithId('entry', 0, 0)]
    expect(computeConnections({ x: 0, y: 1 }, rooms)).toEqual(['entry'])
  })

  test('y=1 room with no entry returns empty', () => {
    expect(computeConnections({ x: 0, y: 1 }, [])).toEqual([])
  })

  test('y=2 room connects to parent at same x', () => {
    const rooms = [makeRoomWithId('entry', 0, 0), makeRoomWithId('branch', 0, 1)]
    expect(computeConnections({ x: 0, y: 2 }, rooms)).toEqual(['branch'])
  })

  test('y=2 room picks correct parent by x', () => {
    const rooms = [
      makeRoomWithId('entry', 0, 0),
      makeRoomWithId('b0', 0, 1),
      makeRoomWithId('b1', -1, 1),
    ]
    expect(computeConnections({ x: -1, y: 2 }, rooms)).toEqual(['b1'])
  })
})
