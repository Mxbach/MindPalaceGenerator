# Mind Palace Generator — Design Document
_Date: 2026-02-24_

## Overview

A Next.js webapp for building and using a loci-method mind palace. The palace is AI-generated (via Claude API), rendered as a 2D floor plan on an HTML5 canvas, and stored locally as a JSON file. Rooms are generated one at a time around a user-chosen topic. Users attach personal memory notes to objects in each room.

---

## Data Model

Single file: `data/palace.json`

```json
{
  "topic": "Ancient Rome",
  "rooms": [
    {
      "id": "room-1",
      "name": "The Atrium",
      "description": "A grand entrance hall with marble columns",
      "gridPosition": { "x": 0, "y": 0 },
      "connections": ["room-2"],
      "objects": [
        {
          "id": "obj-1",
          "name": "Marble Fountain",
          "description": "A large fountain in the center, water trickling",
          "relativePosition": { "x": 0.5, "y": 0.5 },
          "memory": ""
        }
      ]
    }
  ]
}
```

- `gridPosition`: integer x/y coordinates on a grid
- `connections`: list of room IDs sharing a doorway
- `relativePosition`: 0–1 within the room (used to position object on canvas)
- `memory`: user-written loci note, starts empty

---

## Architecture

### Stack
- **Next.js** (App Router) + TypeScript
- **HTML5 Canvas API** for rendering
- **Anthropic SDK** (`@anthropic-ai/sdk`) for Claude calls
- **No database** — JSON file on disk

### File Structure

```
app/
  page.tsx                    # Main UI: canvas + sidebar
  components/
    Canvas.tsx                # Canvas rendering logic
    Sidebar.tsx               # Memory note editor
  api/
    generate-room/route.ts    # Calls Claude, returns new room JSON
    palace/route.ts           # GET/POST palace.json
data/
  palace.json                 # Persisted palace state
.env.local                    # ANTHROPIC_API_KEY (never committed)
```

### API Routes

**GET `/api/palace`**
- Reads `data/palace.json` from disk
- Returns `{}` if file does not exist (triggers "create new palace" flow)

**POST `/api/palace`**
- Writes full palace JSON to `data/palace.json`

**POST `/api/generate-room`**
- Receives: `{ topic, rooms[] }` (current palace state)
- Calls Claude with a structured prompt
- Returns: new room object (name, description, gridPosition, connections, objects[])

---

## Canvas Rendering

- Room size: 180×140px per grid cell, with gutters between
- Each room drawn as a rectangle with fill + border
- Room name as text at the top of the room
- Objects as small labeled circles, positioned via `relativePosition`
- Doorways as gaps in shared walls between connected rooms
- Selected object: highlighted circle (different fill color)
- Canvas wrapped in a scrollable container for when the palace grows large

### Interaction
- Click object → select it, open sidebar
- Click room (not object) → highlight room, sidebar stays closed
- Click empty canvas → deselect everything

---

## Claude API Integration

Model: `claude-sonnet-4-6`

Prompt structure sent to Claude:
```
You are generating a room for a mind palace themed around {topic}.
The palace already has these rooms: {existing room names and positions}.
Generate a new room adjacent to an existing one that fits the theme.
Return JSON only, no explanation.
```

Expected response shape:
```json
{
  "name": "The Senate Hall",
  "description": "A semicircular chamber with tiered marble seats",
  "gridPosition": { "x": 1, "y": 0 },
  "connections": ["room-1"],
  "objects": [
    { "name": "Speaker's Podium", "description": "...", "relativePosition": { "x": 0.5, "y": 0.8 } },
    { "name": "Bronze Eagle", "description": "...", "relativePosition": { "x": 0.2, "y": 0.3 } },
    { "name": "Wax Tablet", "description": "...", "relativePosition": { "x": 0.8, "y": 0.4 } }
  ]
}
```

- ~3–5 vivid, memorable objects per room
- Claude picks grid position adjacent to existing rooms
- API key stored in `.env.local` as `ANTHROPIC_API_KEY`

---

## UI Layout

```
┌─────────────────────────────────┬──────────────────┐
│  [Topic: Ancient Rome]  [+ Room]│  SIDEBAR         │
│                                 │                  │
│  ┌──────────┐  ┌──────────┐    │  Object:         │
│  │  Atrium  │  │ Library  │    │  Marble Fountain │
│  │   ●  ●  │══│   ● ●   │    │                  │
│  │    ●    │  │          │    │  Memory note:    │
│  └──────────┘  └──────────┘    │  [__________]   │
│                                 │                  │
│  Canvas (scrollable)            │  [Save]          │
└─────────────────────────────────┴──────────────────┘
```

- On first load with no palace: show a "Create New Palace" modal (enter topic)
- "+ Room" button triggers generation and appends the new room to the canvas

---

## Out of Scope (Prototype)

- Authentication / hosting
- Multiple palaces
- Pan/zoom on canvas
- Room deletion or editing
- Mobile layout
