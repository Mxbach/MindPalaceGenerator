# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

Always implement features directly on the `main` branch. Do not create separate git worktrees or feature branches.

## Commands

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint (flat config, Next.js + TypeScript rules)
npm run test      # Jest tests
npm run test:watch  # Jest in watch mode
```

Run a single test file: `npm run test -- __tests__/palace-utils.test.ts`

## What This App Does

AI-powered mind palace generator using the classical loci memory method. Users create a "palace" around a topic; AI generates an entry hall and up to 5 branching rooms with vivid, memorable objects. Users click objects to attach personal memory notes.

**Generation flow:**
1. User creates palace with a topic → generates entry hall (grid position y=0)
2. User extends → generates up to 5 rooms at y=1, spreading horizontally at x=0, -1, 1, -2, 2
3. Each y=1 room has an "extend" button to generate deeper rooms (y≥2), stacking vertically

## Architecture

**State management:** All app state lives in `app/page.tsx` via `useState`. No Redux or Context. Palace data persists to `/data/palace.json` via API calls (file-based, no database).

**AI integration:** `app/api/generate-room/route.ts` handles both Claude (Sonnet 4.6) and OpenAI (GPT-5-mini). Provider is user-selectable at runtime. Prompts are context-aware based on room depth (y=0 vs y=1 vs y≥2). API keys come from `.env.local`.

**Visualization:** Entirely SVG-based in `app/components/PalaceSVG.tsx`. No canvas or charting libraries. Rooms are rendered in a grid coordinate system converted to pixels via `lib/palace-utils.ts` (`roomToPixel()`, `objectToPixel()`).

**Grid layout constants** (`lib/constants.ts`): `ROOM_WIDTH=180`, `ROOM_HEIGHT=140`, `GUTTER=40`. Room connections computed from grid adjacency; walls have door gaps where connections exist.

## Key Files

| File | Role |
|------|------|
| `lib/types.ts` | Core types: `Palace`, `Room`, `PalaceObject`, `GridPosition` |
| `lib/palace-utils.ts` | Coordinate transforms, hit-testing, `nextRoomPosition()`, `computeConnections()` |
| `lib/constants.ts` | Canvas layout and visual constants |
| `app/page.tsx` | Root component — all app state, event handlers |
| `app/components/PalaceSVG.tsx` | SVG renderer: `RoomGroup`, `ObjectNode`, `WallLines` subcomponents |
| `app/api/generate-room/route.ts` | LLM generation: position calc → prompt → parse → return `Room` |
| `app/api/palace/route.ts` | GET/POST to `/data/palace.json` |

## Styling

Medieval/parchment aesthetic. CSS custom properties for the color palette in `app/globals.css`. Tailwind CSS for utilities. Google Fonts: Cormorant Garamond, Cinzel, Courier Prime, Lora (loaded via `app/layout.tsx`). Key animations: `breathe` (loading pulse), `roomEnter` (fade-in + scale), `lineDraw` (connection lines).
