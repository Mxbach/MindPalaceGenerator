# Provider Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a provider dropdown (Claude / OpenAI) to the app header; the selected provider is passed in the `generate-room` API request and the route branches to the appropriate SDK.

**Architecture:** React state in `page.tsx` holds the selected provider and passes it in every `/api/generate-room` POST body. The route reads `provider` from the body and calls either the Anthropic SDK or OpenAI SDK. API keys live in `.env.local`.

**Tech Stack:** Next.js 16, React 19, `@anthropic-ai/sdk`, `openai` (new), Jest + jest-environment-node for API route tests.

---

### Task 1: Install the OpenAI SDK

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

```bash
npm install openai
```

**Step 2: Verify it appears in dependencies**

```bash
grep '"openai"' package.json
```
Expected: `"openai": "^4.x.x"` (or similar) in `"dependencies"`.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add openai sdk dependency"
```

---

### Task 2: Update the generate-room route tests

**Files:**
- Modify: `__tests__/api/generate-room.test.ts`

The existing test only covers Claude. We need tests that cover:
1. Claude route (default / explicit `provider: "claude"`)
2. OpenAI route (`provider: "openai"`)
3. Unknown provider returns 400

**Step 1: Replace the test file contents**

Replace `__tests__/api/generate-room.test.ts` with:

```typescript
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/generate-room/route'
import { NextRequest } from 'next/server'

const mockRoomJson = JSON.stringify({
  name: 'The Atrium',
  description: 'A grand entrance hall',
  gridPosition: { x: 0, y: 0 },
  connections: [],
  objects: [
    { name: 'Fountain', description: 'A marble fountain', relativePosition: { x: 0.5, y: 0.5 } },
  ],
})

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: mockRoomJson }],
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
          choices: [{ message: { content: mockRoomJson } }],
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
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/api/generate-room.test.ts
```
Expected: FAIL — the route doesn't accept `provider` yet.

**Step 3: Commit the test**

```bash
git add __tests__/api/generate-room.test.ts
git commit -m "test: update generate-room tests for multi-provider support"
```

---

### Task 3: Update the generate-room API route

**Files:**
- Modify: `app/api/generate-room/route.ts`

**Step 1: Replace the route implementation**

Replace the entire contents of `app/api/generate-room/route.ts` with:

```typescript
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
    max_tokens: 1024,
    system: 'You output ONLY valid JSON with no explanation, markdown, or code blocks.',
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const openai = new OpenAI()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You output ONLY valid JSON with no explanation, markdown, or code blocks.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1024,
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
```

**Step 2: Run tests to confirm they pass**

```bash
npm test -- __tests__/api/generate-room.test.ts
```
Expected: All 4 tests PASS.

**Step 3: Commit**

```bash
git add app/api/generate-room/route.ts
git commit -m "feat: add multi-provider support to generate-room route"
```

---

### Task 4: Add provider dropdown to the UI

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add provider state and update handleGenerateRoom**

In `app/page.tsx`, make the following changes:

1. Add provider state after the existing `useState` declarations:
```typescript
const [provider, setProvider] = useState<'claude' | 'openai'>('claude')
```

2. In `handleGenerateRoom`, add `provider` to the fetch body:
```typescript
body: JSON.stringify({ topic: palace.topic, rooms: palace.rooms, provider }),
```

3. In the header JSX, add a `<select>` dropdown before the error span. Insert it inside the `<div className="flex items-center gap-3">`:
```tsx
<select
  value={provider}
  onChange={e => setProvider(e.target.value as 'claude' | 'openai')}
  className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700"
>
  <option value="claude">Claude</option>
  <option value="openai">OpenAI</option>
</select>
```

The dropdown goes between the `{error && ...}` span and the `{palace && <button>}` block, but inside the same flex div. The full updated header right-side div:
```tsx
<div className="flex items-center gap-3">
  <select
    value={provider}
    onChange={e => setProvider(e.target.value as 'claude' | 'openai')}
    className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700"
  >
    <option value="claude">Claude</option>
    <option value="openai">OpenAI</option>
  </select>
  {error && <span className="text-sm text-red-500">{error}</span>}
  {palace && (
    <button
      onClick={handleGenerateRoom}
      disabled={generating}
      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
    >
      {generating ? 'Generating...' : '+ Room'}
    </button>
  )}
</div>
```

**Step 2: Verify the app runs without TypeScript errors**

```bash
npm run build
```
Expected: Build completes with no errors.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add provider dropdown to app header"
```

---

### Task 5: Add OPENAI_API_KEY to .env.local

**Files:**
- Modify: `.env.local` (user's local file, not committed)

**Step 1: Add the key**

Open `.env.local` and add:
```
OPENAI_API_KEY=sk-your-openai-key-here
```

The existing `ANTHROPIC_API_KEY` stays unchanged.

**Step 2: Verify app works end-to-end**

Start the dev server:
```bash
npm run dev
```

- Select "Claude" from the dropdown, click `+ Room` → room generates via Claude
- Select "OpenAI" from the dropdown, click `+ Room` → room generates via OpenAI

---
