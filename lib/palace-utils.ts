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
