# Provider Selection Design

**Date:** 2026-02-24
**Status:** Approved

## Problem

The `generate-room` API route hardcodes the Anthropic Claude SDK. Users have no way to switch to a different LLM provider from within the app.

## Solution

Add a provider dropdown to the app header. The selected provider is passed in the API request body, and the server branches to the appropriate SDK.

## Architecture

### UI

- A `<select>` element in the header, right side next to `+ Room`
- Options: `Claude` (value `"claude"`) and `OpenAI` (value `"openai"`)
- State: `useState<"claude" | "openai">("claude")` in `page.tsx`
- Resets to `"claude"` on page refresh (no persistence needed)

### API Contract

`POST /api/generate-room` request body gains a `provider` field:

```json
{ "topic": "...", "rooms": [...], "provider": "claude" | "openai" }
```

### Server

`generate-room/route.ts` branches on `provider`:

- `"claude"` → Anthropic SDK, model `claude-sonnet-4-6`
- `"openai"` → OpenAI SDK, model `gpt-4o`

Both branches use the same prompt and return the same `Room` JSON shape.

### Environment Variables

`.env.local` gains:

```
OPENAI_API_KEY=sk-...
```

`ANTHROPIC_API_KEY` stays unchanged.

## Files Changed

| File | Change |
|------|--------|
| `app/page.tsx` | Add `provider` state, dropdown in header, pass provider in fetch body |
| `app/api/generate-room/route.ts` | Accept `provider`, branch to Anthropic or OpenAI SDK |
| `package.json` | Add `openai` npm dependency |

## Future Extensibility

Adding a third provider requires: adding an option to the dropdown, installing its SDK, and adding a branch in the route. The `provider` type can be widened from a union to a string to avoid repeated type changes.
