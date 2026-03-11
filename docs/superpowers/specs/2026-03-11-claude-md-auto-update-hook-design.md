# Design: CLAUDE.md Auto-Update Hook

**Date:** 2026-03-11
**Status:** Approved

## Overview

A Claude Code hook that automatically checks whether `CLAUDE.md` is still accurate after a git commit. When a commit is made, a PostToolUse hook fires, collects the changed files via `git show --stat HEAD`, and injects a structured message into Claude's session. Claude then reviews and updates `CLAUDE.md` in-session if anything is outdated.

## Trigger & Configuration

- **Hook type:** `PostToolUse` on the `Bash` tool
- **Location:** `.claude/settings.local.json` (project-scoped, not global)
- **Condition:** The executed bash command contains `git commit`

## Components

### 1. Hook Script — `.claude/hooks/check-claude-md.sh`

Responsibilities:
1. Read the bash command from JSON input on stdin
2. Check whether the command contains `git commit` (and is not e.g. `git commit --help`)
3. Run `git show --stat HEAD` to get the commit message and changed file names
4. Print a structured message to stdout for Claude to act on

Output format:
```
[CLAUDE.md Check] Git commit detected.

Changed in this commit:
<git show --stat HEAD output>

Please review CLAUDE.md and update any sections that no longer accurately
describe the codebase. Only change what is actually outdated — do not
restructure or expand unnecessarily.
```

### 2. Hook Configuration — `.claude/settings.local.json`

Add a `hooks` section to the existing settings file:
```json
{
  "permissions": { ... },
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

## Claude's Behavior After Hook Fires

Claude reads the injected message and:
1. Identifies which sections of `CLAUDE.md` relate to the changed files
2. Checks each relevant section for accuracy against the current codebase
3. Edits only what is actually outdated — no structural changes, no additions unless genuinely missing
4. Makes no changes if everything is still accurate (no "all good" comment)

## Edge Cases

| Scenario | Behavior |
|---|---|
| `git commit --amend` | Hook fires — correct, amend can change relevant files |
| `git commit --help` | Filtered out — script checks for actual commit execution |
| First commit in repo | `git show --stat HEAD` works fine on initial commit |
| Hook script error | Script exits 0 silently — no crash, Claude continues normally |
| No relevant CLAUDE.md sections | Claude makes no changes |

## File Layout

```
.claude/
  settings.local.json       ← updated with hooks config
  hooks/
    check-claude-md.sh      ← new hook script
```
