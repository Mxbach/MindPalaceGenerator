import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateId } from '@/lib/palace-utils'
import { Room } from '@/lib/types'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { topic, rooms }: { topic: string; rooms: Room[] } = await req.json()

    const existingRoomsText = rooms.length === 0
      ? 'This is the first room. Place it at gridPosition { "x": 0, "y": 0 } with an empty connections array.'
      : `Existing rooms:\n${rooms.map(r =>
          `- "${r.name}" at grid position (${r.gridPosition.x}, ${r.gridPosition.y}) with id "${r.id}"`
        ).join('\n')}\n\nOccupied positions: ${rooms.map(r => `(${r.gridPosition.x},${r.gridPosition.y})`).join(', ')}\n\nPlace the new room adjacent (up/down/left/right) to an existing room at an unoccupied position. Set connections to the id(s) of directly adjacent rooms.`

    const prompt = `Generate a room for a mind palace themed around "${topic}".
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You output ONLY valid JSON with no explanation, markdown, or code blocks.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
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
