'use client'

import { Palace, Room, PalaceObject } from '@/lib/types'
import {
  roomToPixel, objectToPixel, getCanvasSize, roomsAreConnected,
} from '@/lib/palace-utils'
import {
  ROOM_WIDTH, ROOM_HEIGHT, OBJ_RADIUS, DOOR_SIZE,
} from '@/lib/constants'

interface PalaceSVGProps {
  palace: Palace
  selectedObjectId: string | null
  onObjectClick: (roomId: string, objectId: string) => void
  onRoomClick: (roomId: string) => void
  onDeselect: () => void
}

export default function PalaceSVG({
  palace, selectedObjectId, onObjectClick, onRoomClick, onDeselect,
}: PalaceSVGProps) {
  const { width, height } = getCanvasSize(palace.rooms)

  // Collect unique connections to draw corridor lines (avoid duplicates)
  const drawnConnections = new Set<string>()
  const connectionLines: { x1: number; y1: number; x2: number; y2: number }[] = []

  for (const room of palace.rooms) {
    for (const connId of room.connections) {
      const key = [room.id, connId].sort().join('|')
      if (drawnConnections.has(key)) continue
      drawnConnections.add(key)

      const neighbor = palace.rooms.find(r => r.id === connId)
      if (!neighbor) continue

      const { x: ax, y: ay } = roomToPixel(room)
      const { x: bx, y: by } = roomToPixel(neighbor)

      const dx = neighbor.gridPosition.x - room.gridPosition.x
      const dy = neighbor.gridPosition.y - room.gridPosition.y

      let x1 = 0, y1 = 0, x2 = 0, y2 = 0
      if (dy === 1) {
        // room is north of neighbor
        x1 = ax + ROOM_WIDTH / 2; y1 = ay + ROOM_HEIGHT
        x2 = bx + ROOM_WIDTH / 2; y2 = by
      } else if (dy === -1) {
        x1 = ax + ROOM_WIDTH / 2; y1 = ay
        x2 = bx + ROOM_WIDTH / 2; y2 = by + ROOM_HEIGHT
      } else if (dx === 1) {
        x1 = ax + ROOM_WIDTH; y1 = ay + ROOM_HEIGHT / 2
        x2 = bx;              y2 = by + ROOM_HEIGHT / 2
      } else if (dx === -1) {
        x1 = ax;              y1 = ay + ROOM_HEIGHT / 2
        x2 = bx + ROOM_WIDTH; y2 = by + ROOM_HEIGHT / 2
      }
      connectionLines.push({ x1, y1, x2, y2 })
    }
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block' }}
      onClick={onDeselect}
    >
      {/* Connection corridor lines — drawn beneath rooms */}
      {connectionLines.map((ln, i) => (
        <line
          key={i}
          x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
          stroke="var(--border)"
          strokeWidth={1}
          strokeOpacity={0.7}
          className="animate-lineDraw"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Rooms */}
      {palace.rooms.map(room => (
        <RoomGroup
          key={room.id}
          room={room}
          allRooms={palace.rooms}
          selectedObjectId={selectedObjectId}
          onObjectClick={onObjectClick}
          onRoomClick={onRoomClick}
        />
      ))}
    </svg>
  )
}

function RoomGroup({
  room, allRooms, selectedObjectId, onObjectClick, onRoomClick,
}: {
  room: Room
  allRooms: Room[]
  selectedObjectId: string | null
  onObjectClick: (roomId: string, objectId: string) => void
  onRoomClick: (roomId: string) => void
}) {
  const { x, y } = roomToPixel(room)

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

  return (
    <g className="animate-roomEnter" style={{ transformOrigin: `${x + ROOM_WIDTH / 2}px ${y + ROOM_HEIGHT / 2}px` }}>
      {/* Room background */}
      <rect
        x={x} y={y}
        width={ROOM_WIDTH} height={ROOM_HEIGHT}
        fill="var(--page)"
        stroke="none"
        onClick={(e) => { e.stopPropagation(); onRoomClick(room.id) }}
        style={{ cursor: 'default' }}
      />

      {/* Walls with door gaps */}
      <WallLines x={x} y={y} northNeighbor={!!northNeighbor} southNeighbor={!!southNeighbor} westNeighbor={!!westNeighbor} eastNeighbor={!!eastNeighbor} />

      {/* Room name */}
      <text
        x={x + ROOM_WIDTH / 2}
        y={y + 18}
        textAnchor="middle"
        fill="var(--ash)"
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize: '13px',
          fontWeight: '700',
          pointerEvents: 'none',
        }}
      >
        {room.name}
      </text>

      {/* Objects */}
      {room.objects.map(obj => (
        <ObjectNode
          key={obj.id}
          room={room}
          obj={obj}
          isSelected={obj.id === selectedObjectId}
          onObjectClick={onObjectClick}
        />
      ))}
    </g>
  )
}

function WallLines({
  x, y, northNeighbor, southNeighbor, westNeighbor, eastNeighbor,
}: {
  x: number; y: number
  northNeighbor: boolean; southNeighbor: boolean
  westNeighbor: boolean; eastNeighbor: boolean
}) {
  const strokeProps = {
    stroke: 'var(--border)',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
  }

  function hSegments(wx1: number, wy: number, wx2: number, hasDoor: boolean) {
    if (!hasDoor) return <line x1={wx1} y1={wy} x2={wx2} y2={wy} {...strokeProps} />
    const mid = (wx1 + wx2) / 2
    const half = DOOR_SIZE / 2
    return (
      <>
        <line x1={wx1} y1={wy} x2={mid - half} y2={wy} {...strokeProps} />
        <line x1={mid + half} y1={wy} x2={wx2} y2={wy} {...strokeProps} />
      </>
    )
  }

  function vSegments(wx: number, wy1: number, wy2: number, hasDoor: boolean) {
    if (!hasDoor) return <line x1={wx} y1={wy1} x2={wx} y2={wy2} {...strokeProps} />
    const mid = (wy1 + wy2) / 2
    const half = DOOR_SIZE / 2
    return (
      <>
        <line x1={wx} y1={wy1} x2={wx} y2={mid - half} {...strokeProps} />
        <line x1={wx} y1={mid + half} x2={wx} y2={wy2} {...strokeProps} />
      </>
    )
  }

  return (
    <>
      {hSegments(x, y, x + ROOM_WIDTH, northNeighbor)}
      {hSegments(x, y + ROOM_HEIGHT, x + ROOM_WIDTH, southNeighbor)}
      {vSegments(x, y, y + ROOM_HEIGHT, westNeighbor)}
      {vSegments(x + ROOM_WIDTH, y, y + ROOM_HEIGHT, eastNeighbor)}
    </>
  )
}

function ObjectNode({
  room, obj, isSelected, onObjectClick,
}: {
  room: Room
  obj: PalaceObject
  isSelected: boolean
  onObjectClick: (roomId: string, objectId: string) => void
}) {
  const { x, y } = objectToPixel(room, obj)
  const fill = isSelected ? 'var(--ember)' : (obj.memory ? 'var(--gold)' : 'var(--border)')
  const glowColor = isSelected ? 'var(--ember)' : 'var(--gold)'

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onObjectClick(room.id, obj.id) }}
      style={{ cursor: 'pointer' }}
      className="palace-object"
    >
      <style>{`
        .palace-object circle { transition: filter 150ms ease, fill 200ms ease; }
        .palace-object:hover circle { filter: drop-shadow(0 0 6px ${glowColor}); }
      `}</style>
      <circle
        cx={x} cy={y}
        r={OBJ_RADIUS}
        fill={fill}
        stroke={isSelected ? 'var(--ember)' : 'var(--border)'}
        strokeWidth={1.5}
        filter={isSelected ? `drop-shadow(0 0 8px var(--ember))` : undefined}
      />
      <text
        x={x} y={y + OBJ_RADIUS + 11}
        textAnchor="middle"
        fill="var(--ash)"
        style={{
          fontFamily: 'var(--font-courier), monospace',
          fontSize: '9px',
          pointerEvents: 'none',
        }}
      >
        {obj.name}
      </text>
    </g>
  )
}
