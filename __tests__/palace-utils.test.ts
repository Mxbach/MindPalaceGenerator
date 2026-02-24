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
