/**
 * @jest-environment node
 */
import { POST } from '@/app/api/generate-room/route'
import { NextRequest } from 'next/server'

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            name: 'The Atrium',
            description: 'A grand entrance hall',
            gridPosition: { x: 0, y: 0 },
            connections: [],
            objects: [
              { name: 'Fountain', description: 'A marble fountain', relativePosition: { x: 0.5, y: 0.5 } },
            ],
          }),
        }],
      }),
    },
  })),
}))

const mockRoomData = {
  name: 'The Atrium',
  description: 'A grand entrance hall',
  gridPosition: { x: 0, y: 0 },
  connections: [],
  objects: [
    { name: 'Fountain', description: 'A marble fountain', relativePosition: { x: 0.5, y: 0.5 } },
  ],
}

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
