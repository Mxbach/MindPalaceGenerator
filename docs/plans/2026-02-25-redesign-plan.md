# Grimoire Codex Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the bland white/amber Tailwind UI with a dark, arcane "Grimoire Codex" aesthetic — deep blacks, gold accents, parchment room cards, serif typography — and swap the HTML canvas for an SVG-based room renderer.

**Architecture:** Six self-contained tasks covering the design system, SVG palace component, and each UI component. No changes to API routes, types, constants, or geometry utilities — only visual layer files are touched. The SVG component uses the same `roomToPixel`/`objectToPixel` math but attaches click handlers directly to SVG elements instead of hit-testing.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, `next/font/google` (Cormorant Garamond, Cinzel, Courier Prime, Lora), inline SVG, CSS custom properties, CSS `@keyframes` animations.

---

## Baseline: run existing tests

Before touching anything, confirm all existing tests pass.

```bash
npm test
```

Expected: all palace-utils tests pass. Keep them green throughout.

---

### Task 1: CSS Design System + Font Loading

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Step 1: Replace `globals.css` with the Grimoire design system**

Replace the full file contents with:

```css
@import "tailwindcss";

:root {
  --ink:            #0d0a07;
  --parchment:      #f2e8d5;
  --parchment-dark: #d9c9a8;
  --gold:           #c8933a;
  --gold-dim:       #7a5820;
  --ember:          #e06420;
  --ash:            #4a3f2f;
  --smoke:          #a89070;
  --void:           #080604;
}

body {
  background: var(--void);
  color: var(--parchment);
  font-family: var(--font-lora), Georgia, serif;
}

/* Keyframe: slow opacity pulse for "Conjuring..." button state */
@keyframes breathe {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

/* Keyframe: new room fade-in + scale */
@keyframes roomEnter {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}

/* Keyframe: connection line draw-in via stroke-dashoffset */
@keyframes lineDraw {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}

.animate-breathe   { animation: breathe 1.5s ease-in-out infinite; }
.animate-roomEnter { animation: roomEnter 300ms ease-out forwards; }
.animate-lineDraw  {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: lineDraw 400ms ease-out forwards;
  pathLength: 1;
}
```

**Step 2: Replace font loading in `layout.tsx`**

Replace the full file contents with:

```tsx
import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  Cinzel,
  Courier_Prime,
  Lora,
} from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
})

const cinzel = Cinzel({
  weight: ['400', '600'],
  subsets: ['latin'],
  variable: '--font-cinzel',
})

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-courier',
})

const lora = Lora({
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-lora',
})

export const metadata: Metadata = {
  title: 'Mind Palace',
  description: 'AI-powered mind palace generator using the loci method',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${cinzel.variable} ${courierPrime.variable} ${lora.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
```

**Step 3: Visual verification**

```bash
npm run dev
```

Open http://localhost:3000. Background should now be near-black (`#080604`). Text will be partially unstyled (that's fine — the rest of the components follow).

**Step 4: Confirm existing tests still pass**

```bash
npm test
```

Expected: all pass (globals.css and layout.tsx don't affect utility tests).

**Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add Grimoire design system — CSS variables and font loading"
```

---

### Task 2: SVG Palace Component (replaces Canvas)

**Files:**
- Create: `app/components/PalaceSVG.tsx`
- Delete: `app/components/Canvas.tsx` (do this last, after `page.tsx` is updated)

This is the core visual change. The SVG component accepts the same props as Canvas but renders using inline SVG elements instead of the canvas API. Click handlers are attached directly to SVG elements — no hit-testing needed.

**Step 1: Create `app/components/PalaceSVG.tsx`**

```tsx
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
          stroke="var(--gold)"
          strokeWidth={1}
          strokeOpacity={0.4}
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
        fill="var(--parchment)"
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
    stroke: 'var(--gold-dim)',
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
  const fill = isSelected ? 'var(--ember)' : (obj.memory ? 'var(--gold)' : 'var(--gold-dim)')
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
        stroke={isSelected ? 'var(--ember)' : 'var(--gold-dim)'}
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
```

**Step 2: Update `page.tsx` to import `PalaceSVG` instead of `Canvas`**

Replace the dynamic import at the top of `page.tsx`:

```tsx
// OLD:
const Canvas = dynamic(() => import('./components/Canvas'), { ssr: false })
// NEW:
import PalaceSVG from './components/PalaceSVG'
```

(Remove the `dynamic` import from `next/dynamic` as well — SVG doesn't need it. Keep the `dynamic` import of `next/dynamic` only if it's used elsewhere.)

Then in the JSX, replace `<Canvas ...>` with `<PalaceSVG ...>` (same props, same names):

```tsx
// OLD:
<Canvas
  palace={palace}
  selectedObjectId={selected?.objectId ?? null}
  onObjectClick={(roomId, objectId) => setSelected({ roomId, objectId })}
  onRoomClick={() => setSelected(null)}
  onDeselect={() => setSelected(null)}
/>
// NEW:
<PalaceSVG
  palace={palace}
  selectedObjectId={selected?.objectId ?? null}
  onObjectClick={(roomId, objectId) => setSelected({ roomId, objectId })}
  onRoomClick={() => setSelected(null)}
  onDeselect={() => setSelected(null)}
/>
```

Also remove the `import dynamic from 'next/dynamic'` line if it's no longer used.

**Step 3: Visual verification**

```bash
npm run dev
```

With an existing palace (or after generating rooms): rooms should appear as parchment rectangles on the dark void, with gold wall lines, gold-dim object dots, and Cormorant Garamond room names. Clicking an object should open the sidebar. Clicking the background should deselect.

**Step 4: Delete the old Canvas.tsx**

```bash
rm app/components/Canvas.tsx
```

**Step 5: Run tests**

```bash
npm test
```

Expected: all pass (Canvas.tsx had no tests; utility tests are unaffected).

**Step 6: Commit**

```bash
git add app/components/PalaceSVG.tsx app/page.tsx app/components/Canvas.tsx
git commit -m "feat: replace HTML canvas with SVG palace renderer (Grimoire style)"
```

---

### Task 3: Redesign the Header

**Files:**
- Modify: `app/page.tsx`

Replace the `<header>` block in `page.tsx`. Find the existing header JSX and replace it entirely:

**OLD:**
```tsx
<header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
  ...
</header>
```

**NEW:**
```tsx
<header style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 1.5rem',
  height: '56px',
  background: 'var(--ink)',
  borderBottom: '1px solid var(--gold-dim)',
  flexShrink: 0,
}}>
  {/* Left: sigil + palace name + topic */}
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
    <span style={{
      fontFamily: 'var(--font-cinzel), serif',
      fontSize: '15px',
      fontWeight: '600',
      letterSpacing: '0.12em',
      color: 'var(--gold)',
    }}>
      ⬡ MIND PALACE
    </span>
    {palace && (
      <>
        <span style={{ color: 'var(--gold-dim)', margin: '0 0.25rem' }}>—</span>
        <span style={{
          fontFamily: 'var(--font-courier), monospace',
          fontSize: '13px',
          fontStyle: 'italic',
          color: 'var(--smoke)',
        }}>
          {palace.topic}
        </span>
      </>
    )}
  </div>

  {/* Right: provider select + error + generate button */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <select
      value={provider}
      onChange={e => setProvider(e.target.value as 'claude' | 'openai')}
      style={{
        fontFamily: 'var(--font-courier), monospace',
        fontSize: '12px',
        color: 'var(--smoke)',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--gold-dim)',
        outline: 'none',
        cursor: 'pointer',
        padding: '2px 4px',
      }}
    >
      <option value="claude" style={{ background: 'var(--ink)' }}>Claude</option>
      <option value="openai" style={{ background: 'var(--ink)' }}>OpenAI</option>
    </select>

    {error && (
      <span style={{
        fontFamily: 'var(--font-courier), monospace',
        fontSize: '12px',
        color: '#f87171',
      }}>
        {error}
      </span>
    )}

    {palace && (
      <button
        onClick={handleGenerateRoom}
        disabled={generating}
        className={generating ? 'animate-breathe' : ''}
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: '12px',
          fontWeight: '600',
          letterSpacing: '0.1em',
          color: 'var(--parchment)',
          background: generating ? 'var(--gold-dim)' : 'var(--ember)',
          border: 'none',
          padding: '6px 16px',
          cursor: generating ? 'not-allowed' : 'pointer',
          transition: 'background 200ms ease',
        }}
      >
        {generating ? 'CONJURING...' : '+ ROOM'}
      </button>
    )}
  </div>
</header>
```

**Visual verification:** Header should show gold `⬡ MIND PALACE` sigil on ink background, with ember generate button.

**Commit:**

```bash
git add app/page.tsx
git commit -m "feat: redesign header with Grimoire typography and gold accents"
```

---

### Task 4: Redesign Loading & Empty States

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace the loading state**

Find:
```tsx
return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>
```

Replace with:
```tsx
return (
  <div style={{
    display: 'flex',
    height: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--void)',
  }}>
    <span style={{
      fontFamily: 'var(--font-courier), monospace',
      fontSize: '14px',
      color: 'var(--smoke)',
      fontStyle: 'italic',
    }}>
      consulting the archive...
    </span>
  </div>
)
```

**Step 2: Replace the empty palace state**

Find:
```tsx
<div className="flex h-full items-center justify-center text-gray-400 text-sm">
  Click &quot;+ Room&quot; to generate your first room
</div>
```

Replace with:
```tsx
<div style={{
  display: 'flex',
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center',
}}>
  <span style={{
    fontFamily: 'var(--font-cormorant), Georgia, serif',
    fontSize: '20px',
    fontStyle: 'italic',
    color: 'var(--smoke)',
  }}>
    The palace awaits its first room.
  </span>
</div>
```

**Step 3: Update the outer container background**

Find:
```tsx
<div className="flex flex-col h-screen bg-stone-50">
```

Replace with:
```tsx
<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--void)' }}>
```

**Step 4: Update the canvas area container**

Find:
```tsx
<div className="flex-1 overflow-auto p-4">
```

Replace with:
```tsx
<div style={{ flex: 1, overflow: 'auto', padding: '2rem', background: 'var(--void)' }}>
```

**Visual verification:** Loading screen should show italic monospace text on near-black. Empty palace state should show italic serif text.

**Commit:**

```bash
git add app/page.tsx
git commit -m "feat: restyle loading and empty palace states in Grimoire aesthetic"
```

---

### Task 5: Redesign the Sidebar

**Files:**
- Modify: `app/components/Sidebar.tsx`

Replace the full file contents:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { PalaceObject, Room } from '@/lib/types'

interface SidebarProps {
  room: Room | null
  object: PalaceObject | null
  onSave: (memory: string) => void
  onClose: () => void
}

export default function Sidebar({ room, object, onSave, onClose }: SidebarProps) {
  const [memory, setMemory] = useState('')
  const prevObject = useRef<PalaceObject | null>(null)

  useEffect(() => {
    setMemory(object?.memory ?? '')
    prevObject.current = object
  }, [object])

  if (!room || !object) return null

  return (
    <div style={{
      width: '300px',
      flexShrink: 0,
      background: 'var(--parchment)',
      borderLeft: '1px solid var(--gold)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1.25rem',
      gap: '1rem',
      animation: 'slideIn 250ms ease-out',
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Header: room label + object name + close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: '10px',
            fontWeight: '600',
            letterSpacing: '0.15em',
            color: 'var(--smoke)',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            {room.name}
          </p>
          <h2 style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize: '22px',
            fontWeight: '700',
            color: 'var(--ash)',
            lineHeight: 1.2,
          }}>
            {object.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: 'var(--smoke)',
            cursor: 'pointer',
            lineHeight: 1,
            padding: '0 0 0 8px',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ash)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--smoke)')}
        >
          ×
        </button>
      </div>

      {/* Object description */}
      <p style={{
        fontFamily: 'var(--font-lora), Georgia, serif',
        fontSize: '14px',
        fontStyle: 'italic',
        color: 'var(--ash)',
        lineHeight: 1.6,
      }}>
        {object.description}
      </p>

      {/* Memory textarea */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <label style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: '10px',
          fontWeight: '600',
          letterSpacing: '0.15em',
          color: 'var(--smoke)',
          textTransform: 'uppercase',
        }}>
          Memory Note
        </label>
        <textarea
          value={memory}
          onChange={(e) => setMemory(e.target.value)}
          placeholder="What do you want to remember here? Visualize it vividly..."
          style={{
            flex: 1,
            minHeight: '120px',
            background: 'var(--parchment-dark)',
            border: '1px solid transparent',
            outline: 'none',
            padding: '10px 12px',
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontSize: '14px',
            color: 'var(--ash)',
            lineHeight: 1.6,
            resize: 'none',
            borderRadius: 0,
            transition: 'border-color 150ms ease',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
        />
      </div>

      {/* Save button */}
      <button
        onClick={() => onSave(memory)}
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize: '16px',
          fontWeight: '700',
          letterSpacing: '0.05em',
          color: 'var(--ink)',
          background: 'var(--gold)',
          border: 'none',
          padding: '10px',
          cursor: 'pointer',
          width: '100%',
          transition: 'background 200ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ember)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold)')}
      >
        Save
      </button>
    </div>
  )
}
```

**Visual verification:** Click an object — sidebar should slide in from the right with parchment background, gold border, Cormorant heading, Lora body text. Save button should be gold with ink text.

**Commit:**

```bash
git add app/components/Sidebar.tsx
git commit -m "feat: redesign sidebar with parchment/gold Grimoire aesthetic"
```

---

### Task 6: Redesign NewPalaceModal

**Files:**
- Modify: `app/components/NewPalaceModal.tsx`

Replace the full file contents:

```tsx
'use client'

import { useState } from 'react'

interface NewPalaceModalProps {
  onConfirm: (topic: string) => void
}

export default function NewPalaceModal({ onConfirm }: NewPalaceModalProps) {
  const [topic, setTopic] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (topic.trim()) onConfirm(topic.trim())
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(8, 6, 4, 0.85)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      animation: 'modalFadeIn 250ms ease-out',
    }}>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalCardIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{
        background: 'var(--parchment)',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '480px',
        animation: 'modalCardIn 250ms ease-out',
      }}>
        {/* Decorative top rule */}
        <div style={{
          borderTop: '2px solid var(--gold)',
          borderBottom: '1px solid var(--gold-dim)',
          height: '5px',
          marginBottom: '2rem',
        }} />

        <h1 style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize: '28px',
          fontWeight: '700',
          color: 'var(--ash)',
          marginBottom: '0.5rem',
          lineHeight: 1.2,
        }}>
          Begin Your Palace
        </h1>

        <p style={{
          fontFamily: 'var(--font-lora), Georgia, serif',
          fontSize: '14px',
          fontStyle: 'italic',
          color: 'var(--smoke)',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}>
          Choose a theme. Rooms will be conjured one by one, each filled with vivid
          objects to anchor your memories.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Ancient Rome, Deep Ocean, Haunted Mansion..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{
              fontFamily: 'var(--font-lora), Georgia, serif',
              fontSize: '15px',
              color: 'var(--ash)',
              background: 'var(--parchment-dark)',
              border: 'none',
              borderBottom: '1px solid var(--gold-dim)',
              outline: 'none',
              padding: '10px 4px',
              width: '100%',
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--gold)')}
            onBlur={e => (e.currentTarget.style.borderBottomColor = 'var(--gold-dim)')}
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.12em',
              color: topic.trim() ? 'var(--parchment)' : 'var(--smoke)',
              background: topic.trim() ? 'var(--ember)' : 'var(--gold-dim)',
              border: 'none',
              padding: '12px',
              cursor: topic.trim() ? 'pointer' : 'not-allowed',
              width: '100%',
              transition: 'background 200ms ease, color 200ms ease',
            }}
          >
            BEGIN
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Visual verification:** On first load (no palace), the modal should appear with parchment card, gold double-rule at top, Cormorant title, Lora subtitle, and an ember BEGIN button.

**Commit:**

```bash
git add app/components/NewPalaceModal.tsx
git commit -m "feat: redesign NewPalaceModal with Grimoire parchment card aesthetic"
```

---

## Final: Smoke Test

```bash
npm test
```

All utility tests should still pass.

```bash
npm run build
```

Should build without errors.

Then do a full manual walkthrough:
1. Open http://localhost:3000 — see NewPalaceModal on dark scrim
2. Type a topic and click BEGIN — modal closes, empty palace state shows
3. Click "+ ROOM" — button shows "CONJURING..." with breathing animation, room appears with slide-in animation
4. Generate 2-3 more rooms — connection lines draw between rooms
5. Click an object — sidebar slides in with parchment aesthetic
6. Edit memory note, click Save
7. Click another object — sidebar updates smoothly
8. Click background — sidebar closes
