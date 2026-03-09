/**
 * @jest-environment node
 */
import { POST } from '@/app/api/generate-room/route'
import { NextRequest } from 'next/server'
import { OBJECT_SLOTS } from '@/lib/constants'

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"name":"The Atrium","description":"A grand entrance hall","objects":[{"name":"Fountain","description":"A marble fountain","relativePosition":{"x":0.5,"y":0.5}},{"name":"Statue","description":"A stone guardian","relativePosition":{"x":0.9,"y":0.9}}]}' }],
      }),
    },
  })),
}))

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"name":"The Atrium","description":"A grand entrance hall","objects":[{"name":"Fountain","description":"A marble fountain","relativePosition":{"x":0.5,"y":0.5}},{"name":"Statue","description":"A stone guardian","relativePosition":{"x":0.9,"y":0.9}}]}' } }],
        }),
      },
    },
  })),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/generate-room', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/generate-room', () => {
  test('uses Claude when provider is "claude"', async () => {
    const res = await POST(makeRequest({ topic: 'Ancient Rome', rooms: [], provider: 'claude' }))
    expect(res.status).toBe(200)
    const room = await res.json()
    expect(room.name).toBe('The Atrium')
    expect(typeof room.id).toBe('string')
    expect(room.objects[0].memory).toBe('')
  })

  test('uses Claude when provider is omitted', async () => {
    const res = await POST(makeRequest({ topic: 'Ancient Rome', rooms: [] }))
    expect(res.status).toBe(200)
    const room = await res.json()
    expect(room.name).toBe('The Atrium')
  })

  test('uses OpenAI when provider is "openai"', async () => {
    const res = await POST(makeRequest({ topic: 'Ancient Rome', rooms: [], provider: 'openai' }))
    expect(res.status).toBe(200)
    const room = await res.json()
    expect(room.name).toBe('The Atrium')
    expect(typeof room.id).toBe('string')
    expect(room.objects[0].memory).toBe('')
  })

  test('returns 400 for unknown provider', async () => {
    const res = await POST(makeRequest({ topic: 'Ancient Rome', rooms: [], provider: 'gemini' }))
    expect(res.status).toBe(400)
  })

  test('returns room with server-computed gridPosition and connections', async () => {
    const res = await POST(makeRequest({ topic: 'Ancient Rome', rooms: [], provider: 'claude' }))
    const room = await res.json()
    expect(room.gridPosition).toEqual({ x: 0, y: 0 })
    expect(room.connections).toEqual([])
  })

  test('assigns OBJECT_SLOTS positions to objects, ignoring AI positions', async () => {
    const res = await POST(makeRequest({ topic: 'Ancient Rome', rooms: [], provider: 'claude' }))
    const room = await res.json()
    expect(room.objects[0].relativePosition).toEqual(OBJECT_SLOTS[0])
    expect(room.objects[1].relativePosition).toEqual(OBJECT_SLOTS[1])
  })
})
