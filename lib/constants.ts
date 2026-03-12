import type { RelativePosition } from './types'

export const ROOM_WIDTH = 180
export const ROOM_HEIGHT = 140
export const GUTTER = 40         // space between rooms on the grid
export const CANVAS_PADDING = 40 // padding around the whole palace
export const OBJ_RADIUS = 8      // radius of object circles on canvas
export const DOOR_SIZE = 30      // width of the doorway gap in a wall
export const ENTRY_DOT_RADIUS = 6      // radius of the entry point dot
export const ENTRY_TOP_MARGIN = 60     // vertical space above first room for entry dot + line

export const OBJECT_SLOTS: RelativePosition[] = [
  { x: 0.22, y: 0.22 }, // top-left
  { x: 0.78, y: 0.30 }, // top-right
  { x: 0.50, y: 0.52 }, // center
  { x: 0.22, y: 0.68 }, // bottom-left
  { x: 0.78, y: 0.78 }, // bottom-right
]
