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
