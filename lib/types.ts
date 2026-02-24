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
