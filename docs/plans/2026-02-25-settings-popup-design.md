# Settings Popup Design

**Date:** 2026-02-25

## Overview

Replace the API provider dropdown in the header with a gear icon that opens a settings modal. The modal exposes two settings: palace theme and API provider.

## Header Change

- Remove the `<select>` provider dropdown from the header right section in `page.tsx`
- Add a gear button (`⚙`) in its place, styled with `var(--smoke)` color, no border/background, hover brightens to `var(--ash)`
- Clicking the gear sets `settingsOpen` state to `true`

## SettingsModal Component

New file: `app/components/SettingsModal.tsx`

Matches `NewPalaceModal` aesthetic:
- Fixed overlay with `rgba(8,6,4,0.85)` backdrop + `blur(2px)`
- Centered card, `max-width: 480px`, fade+scale animation
- Decorative gold top rule
- Close `×` button top-right (dismisses without saving)
- Clicking backdrop dismisses without saving

### Settings

1. **Palace Theme** — text input pre-filled with `palace.topic`, underline-only style
2. **API Provider** — select styled consistently, options: Claude / OpenAI

### Actions

- **Save** button: applies topic change (calls `savePalace` if changed) + updates `provider` state, then closes modal
- Escape key / backdrop click: close without saving

## Data Flow

`page.tsx`:
- New state: `settingsOpen: boolean`
- New handler: `handleSaveSettings(topic: string, provider: 'claude' | 'openai')` — updates `provider` state, calls `savePalace` if topic changed
- Pass `palace`, `provider`, `settingsOpen`, `onClose`, `onSave` to `SettingsModal`

No new API routes required.

## Files Changed

- `app/page.tsx` — replace dropdown with gear button, add settings state/handler, render SettingsModal
- `app/components/SettingsModal.tsx` — new component (created)
