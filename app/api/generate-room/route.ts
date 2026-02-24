import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { generateId } from '@/lib/palace-utils'
import { Room } from '@/lib/types'

function buildPrompt(topic: string, rooms: Room[]): string {
  const existingRoomsText = rooms.length === 0
    ? 'This is the first room. Place it at gridPosition { "x": 0, "y": 0 } with an empty connections array.'
    : `Existing rooms:\n${rooms.map(r =>
        `- "${r.name}" at grid position (${r.gridPosition.x}, ${r.gridPosition.y}) with id "${r.id}"`
      ).join('\n')}\n\nOccupied positions: ${rooms.map(r => `(${r.gridPosition.x},${r.gridPosition.y})`).join(', ')}\n\nPlace the new room adjacent (up/down/left/right) to an existing room at an unoccupied position. Set connections to the id(s) of directly adjacent rooms.`

  return `Generate a room for a mind palace themed around "${topic}".
${existingRoomsText}

Requirements:
- 3 to 5 vivid, memorable objects per room
- Each object should be a strong visual anchor for the loci memory method
- relativePosition x and y are 0.0–1.0 within the room (spread objects out, avoid edges)

Return ONLY valid JSON in this exact format, no explanation:
{
  "name": "Room Name",
  "description": "Brief atmospheric description",
  "gridPosition": { "x": <integer>, "y": <integer> },
  "connections": ["<existing room id>"],
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
    const { topic, rooms, provider = 'claude' }: { topic: string; rooms: Room[]; provider?: string } = await req.json()

    if (provider !== 'claude' && provider !== 'openai') {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    const prompt = buildPrompt(topic, rooms)
    const text = provider === 'openai'
      ? await generateWithOpenAI(prompt)
      : await generateWithClaude(prompt)

    const roomData = JSON.parse(text)
    const room: Room = {
      ...roomData,
      id: generateId(),
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
