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
if echo "$COMMAND" | grep -qE 'git[[:space:]]+commit([[:space:]]|$)' && ! echo "$COMMAND" | grep -qE '(^| )--help( |$)'; then
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
