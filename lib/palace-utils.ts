import { Room, PalaceObject, GridPosition } from './types'
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
