# Object Label Overlap Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stagger `OBJECT_SLOTS` y values so no two slots share the same row, eliminating object label overlap in rooms.

**Architecture:** Single constant change in `lib/constants.ts`. The new y values create a zigzag pattern (left-high, right-low per pair) that structurally prevents same-baseline label collisions. One test update to match the new pinned coordinates; one new test to enforce the no-shared-y invariant.

**Tech Stack:** TypeScript, Jest (`npm run test`)

---

## Chunk 1: Update tests and constants

### Task 1: Update the pinned slot test and add no-shared-y invariant test

**Files:**
- Modify: `__tests__/palace-utils.test.ts:234-242`

- [ ] **Step 1: Update the pinned layout test to the new values**

In `__tests__/palace-utils.test.ts`, find the `'slot positions match the designed layout'` test (lines 234–242) and replace the expected values:

```ts
test('slot positions match the designed layout', () => {
  expect(OBJECT_SLOTS).toEqual([
    { x: 0.22, y: 0.22 },
    { x: 0.78, y: 0.30 },
    { x: 0.50, y: 0.52 },
    { x: 0.22, y: 0.68 },
    { x: 0.78, y: 0.78 },
  ])
})
```

- [ ] **Step 2: Add a no-shared-y test immediately after the pinned test**

```ts
test('no two slots share the same y (prevents label row overlap)', () => {
  const ys = OBJECT_SLOTS.map(s => s.y)
  expect(new Set(ys).size).toBe(OBJECT_SLOTS.length)
})
```

- [ ] **Step 3: Run tests — expect failures**

```bash
npm run test -- __tests__/palace-utils.test.ts
```

Expected: 2 failures — `'slot positions match the designed layout'` and `'no two slots share the same y'` (current constants still have old values).

---

### Task 2: Update OBJECT_SLOTS constants

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: Update OBJECT_SLOTS in `lib/constants.ts`**

Replace the `OBJECT_SLOTS` array:

```ts
export const OBJECT_SLOTS: RelativePosition[] = [
  { x: 0.22, y: 0.22 }, // top-left
  { x: 0.78, y: 0.30 }, // top-right
  { x: 0.50, y: 0.52 }, // center
  { x: 0.22, y: 0.68 }, // bottom-left
  { x: 0.78, y: 0.78 }, // bottom-right
]
```

- [ ] **Step 2: Run tests — expect all passing**

```bash
npm run test -- __tests__/palace-utils.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 4: Delete stale palace data (if present)**

If `/data/palace.json` exists, delete it — saved objects carry old slot coordinates that won't auto-update.

```bash
rm -f data/palace.json
```

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts __tests__/palace-utils.test.ts
git commit -m "fix: stagger OBJECT_SLOTS y values to eliminate label row overlap"
```
