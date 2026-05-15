# Coding Agents Self-Change And Legacy Cleanup Spec

This document is a tracked source specification for confirmed Coding Agents
behavior. It is not workflow state and must not be treated as a generated
`docs/codex` log.

## Confirmed Boundary

Items 1-4 are Coding Agents self changes. Item 5 is external legacy cleanup.

1. State directory
   - Coding Agents runtime/workflow state belongs under `<git-root>/.coding-agents/`.
   - The state directory is resolved from the target repository git root, not from
     the plugin source repository unless the plugin source repo is the target.

2. Git non-pollution
   - Generated local state must avoid polluting the target repository.
   - Use the target repository's `.git/info/exclude` for local ignore rules.
   - Do not broaden tracked `.gitignore` files just to hide Coding Agents local
     state unless the user explicitly asks for that repository policy change.

3. Conditional runner log
   - `runner.md` is an operational log, not a universal required source document.
   - Create or update it only when runner, assignment dispatch, parent-integration
     packet, or process-result activity actually occurs.
   - Do not require `runner.md` for unrelated intake/spec/documentation flows.

4. Subagent lifecycle closure
   - Subagents must return concise parent-integration material and must not stay
     open waiting for more work after returning it.
   - The parent is responsible for promptly closing or retiring no-longer-needed
     subagents after completed result integration, timeout/failure/blocker
     handling, stale premise or scope change, and before final report when no
     further use is expected.
   - Generated assignments, runner prompts, runner packets, and handoff material
     must carry this lifecycle rule so future job state preserves it.

5. Legacy migration and cleanup
   - Existing legacy locations are cleaned through an explicit migration workflow,
     not by silent deletion or broad automatic rewriting.
   - The migration workflow must perform a preflight backup before destructive or
     move-like actions.
   - Dry-run is the default.
   - Apply mode runs only when the user explicitly requests it.
   - Broad migration apply requires user confirmation.

## Cache Refresh Timing

- Refreshing the plugin cache is separate from source editing.
- Cache refresh must be cautious and happen only after source validation.
- When the source change is intended for publication, commit the validated source
  change before refreshing cache.
- Broad cache refresh requires user confirmation.
- Do not edit `~/.codex/plugins/cache/` as the primary source of truth.

## Operational Instruction

Future implementation work should preserve this split:

- Source self-change work may update the Coding Agents source repository.
- Generated job state must preserve subagent lifecycle closure and concise
  integration-output rules.
- Legacy cleanup work may inspect external target repositories but must remain
  dry-run until the user explicitly requests apply.
- Migration apply and plugin cache refresh are separate user-confirmed steps.
