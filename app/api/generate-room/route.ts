import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { generateId, nextRoomPosition, computeConnections } from '@/lib/palace-utils'
import { Room } from '@/lib/types'

function buildPrompt(topic: string, rooms: Room[], position: { x: number; y: number }): string {
  const entryRoom = rooms.find(r => r.gridPosition.y === 0)
  const parentRoom = position.y >= 2
    ? rooms.find(r => r.gridPosition.x === position.x && r.gridPosition.y === position.y - 1)
    : null

  let context: string
  if (position.y === 0) {
    context = 'This is the entry hall — the grand first room visitors step into. It should feel like a hub with multiple exits leading deeper into the palace.'
  } else if (position.y === 1) {
    context = `This room branches off from "${entryRoom?.name ?? 'the entry hall'}". It is one of several corridors accessible from the entry.`
  } else {
    context = `This room follows "${parentRoom?.name ?? 'the previous room'}" and leads deeper into the palace.`
  }

  const existingNames = rooms.length > 0
    ? `\nExisting rooms: ${rooms.map(r => `"${r.name}"`).join(', ')}`
    : ''

  return `Generate a room for a mind palace themed around "${topic}".
${context}${existingNames}

Requirements:
- 3 to 5 vivid, memorable objects per room
- Each object should be a strong visual anchor for the loci memory method
- relativePosition x and y are 0.0–1.0 within the room (spread objects out, avoid edges)

Return ONLY valid JSON in this exact format, no explanation:
{
  "name": "Room Name",
  "description": "Brief atmospheric description",
  "objects": [
    {
      "name": "Object Name",
      "description": "Vivid sensory description useful as a memory anchor",
      "relativePosition": { "x": <0.0-1.0>, "y": <0.0-1.0> }
    }
  ]
}`
}

async function generateWithClaude(prompt: string): Promise<string> {
  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: 'You output ONLY valid JSON with no explanation, markdown, or code blocks.',
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const openai = new OpenAI()
  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: 'You output ONLY valid JSON with no explanation, markdown, or code blocks.' },
      { role: 'user', content: prompt },
    ],
    max_completion_tokens: 4096,
  })
  return response.choices[0].message.content ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const {
      topic,
      rooms,
      provider = 'openai',
      parentRoomId,
    }: { topic: string; rooms: Room[]; provider?: string; parentRoomId?: string } = await req.json()

    if (provider !== 'claude' && provider !== 'openai') {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    const position = nextRoomPosition(rooms, parentRoomId)
    const connections = computeConnections(position, rooms)
    const prompt = buildPrompt(topic, rooms, position)

    const text = provider === 'openai'
      ? await generateWithOpenAI(prompt)
      : await generateWithClaude(prompt)

    const roomData = JSON.parse(text)
    const room: Room = {
      ...roomData,
      id: generateId(),
      gridPosition: position,
      connections,
      objects: roomData.objects.map((obj: any) => ({
        ...obj,
        id: generateId(),
        memory: '',
      })),
    }

    return NextResponse.json(room)
  } catch (err) {
    console.error('generate-room error:', err)
    return NextResponse.json({ error: 'Failed to generate room' }, { status: 500 })
  }
}
