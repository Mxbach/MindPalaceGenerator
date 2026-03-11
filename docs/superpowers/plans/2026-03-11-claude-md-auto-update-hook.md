# CLAUDE.md Auto-Update Hook Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a PostToolUse Claude Code hook that fires after every `git commit`, collects changed files via `git show --stat HEAD`, and injects a message into Claude's session asking it to review and update `CLAUDE.md` if anything is outdated.

**Architecture:** A bash script at `.claude/hooks/check-claude-md.sh` reads the tool input from stdin JSON, filters for actual git commits, and prints a structured review prompt to stdout. Claude Code injects hook stdout into the session context. The hook is registered in `.claude/settings.local.json` under `PostToolUse`.

**Tech Stack:** Bash, Python 3 (for JSON parsing), Claude Code hooks API

---

## Chunk 1: Hook Script + Configuration

### Task 1: Create the hook script

**Files:**
- Create: `.claude/hooks/check-claude-md.sh`

- [ ] **Step 1: Create the hooks directory and write the script**

Create `.claude/hooks/check-claude-md.sh` with this exact content:

```bash
#!/bin/bash
# PostToolUse hook: check CLAUDE.md accuracy after git commits
# Reads tool_input.command from stdin JSON (Claude Code hook format)

COMMAND=$(python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null)

# Match actual git commits; exclude --help
if echo "$COMMAND" | grep -qE 'git\s+commit' && ! echo "$COMMAND" | grep -q -- '--help'; then
    STAT=$(git show --stat HEAD 2>/dev/null)

    cat <<EOF
[CLAUDE.md Check] Git commit detected.

Changed in this commit:
$STAT

Please review CLAUDE.md and update any sections that no longer accurately
describe the codebase. Only change what is actually outdated — do not
restructure or expand unnecessarily.
EOF
fi
```

- [ ] **Step 2: Make the script executable**

```bash
chmod +x .claude/hooks/check-claude-md.sh
```

- [ ] **Step 3: Test the script with a simulated git commit input**

```bash
echo '{"tool_input":{"command":"git commit -m \"test\""}}' | .claude/hooks/check-claude-md.sh
```

Expected output: The `[CLAUDE.md Check]` message with `git show --stat HEAD` output appended.

- [ ] **Step 4: Test that non-commit commands produce no output**

```bash
echo '{"tool_input":{"command":"git status"}}' | .claude/hooks/check-claude-md.sh
echo '{"tool_input":{"command":"git commit --help"}}' | .claude/hooks/check-claude-md.sh
echo '{"tool_input":{"command":"npm run build"}}' | .claude/hooks/check-claude-md.sh
```

Expected output: empty for all three commands.

- [ ] **Step 5: Test that git commit --amend triggers the hook**

```bash
echo '{"tool_input":{"command":"git commit --amend --no-edit"}}' | .claude/hooks/check-claude-md.sh
```

Expected output: The `[CLAUDE.md Check]` message (amend should fire the hook).

- [ ] **Step 6: Commit the script**

```bash
git add .claude/hooks/check-claude-md.sh
git commit -m "feat: add CLAUDE.md review hook script"
```

---

### Task 2: Register the hook in settings.local.json

**Files:**
- Modify: `.claude/settings.local.json`

Current content of `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(npx jest:*)"
    ]
  }
}
```

- [ ] **Step 1: Add the hooks configuration**

Update `.claude/settings.local.json` to:

```json
{
  "permissions": {
    "allow": [
      "Bash(npx jest:*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/check-claude-md.sh"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('.claude/settings.local.json')); print('valid')"
```

Expected output: `valid`

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.local.json
git commit -m "feat: register CLAUDE.md review hook in settings"
```

---

### Task 3: End-to-end smoke test

- [ ] **Step 1: Make a trivial change and commit it**

```bash
echo "# test" >> /tmp/throwaway.txt
git add /tmp/throwaway.txt 2>/dev/null || true
# Or just amend with no changes to trigger the hook
git commit --allow-empty -m "test: trigger CLAUDE.md hook"
```

- [ ] **Step 2: Verify hook output appears in session**

After the commit, the `[CLAUDE.md Check]` message should appear in the Claude Code session. Claude should then review `CLAUDE.md` and either make targeted updates or confirm it's still accurate.

- [ ] **Step 3: Clean up the test commit**

```bash
git reset --soft HEAD~1
```
