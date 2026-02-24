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
