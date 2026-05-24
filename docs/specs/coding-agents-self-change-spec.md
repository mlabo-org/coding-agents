# Coding Agents Self-Change And Legacy Cleanup Spec

This document is a tracked source specification for confirmed Coding Agents
behavior. It is not workflow state and must not be treated as a generated
`docs/codex` log.

## Confirmed Boundary

Items 1-5 are Coding Agents self changes. Item 6 is external legacy cleanup.

1. State directory
   - Coding Agents runtime/workflow state belongs under `<git-root>/.coding-agents/`.
   - The state directory is resolved from the jobsite/target repository git root,
     not from the invocation repository or plugin source repository unless that
     repository is also the target.
   - `invocation_cwd` is the directory where Codex or the source CLI was launched.
     `jobsite`, `target cwd`, and `target-cwd` identify the repository being
     planned, repaired, edited, or audited.
   - If no target is named, `invocation_cwd` remains the jobsite. This preserves
     the default `cwd is jobsite` behavior.
   - If the user names another target, or the CLI receives `--target-cwd <path>`,
     the named target becomes the jobsite and owns `.coding-agents/`.
   - If target selection or the target git root is ambiguous, missing, outside
     the active scope, or unresolved, stop before edits or workflow state writes
     and ask for the intended target.

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

5. Debugging integrity
   - Debug or repair work is complete only when the root cause is identified,
     fixed, and verified against the intended outcome.
   - Log-only, error-message-only, exception-catch-only, skip-only,
     fallback-only, failure-output-only, and return-to-main-loop-only changes are
     temporary containment at most and must not be accepted as debug completion.
   - Generated assignments, runner prompts, runner packets, audit material, and
     handoff material must carry this debugging integrity rule so delegated work
     preserves it.

6. Legacy migration and cleanup
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
- Cross-repo source invocation must keep source/cache files separate from the
  target repository's generated `.coding-agents/` state. Running the source CLI
  from the plugin repository does not make the plugin repository the state owner
  when `--target-cwd` or an explicit target points elsewhere.
- Generated job state must preserve subagent lifecycle closure, concise
  integration-output rules, and debug root-cause completion requirements.
- Legacy cleanup work may inspect external target repositories but must remain
  dry-run until the user explicitly requests apply.
- Migration apply and plugin cache refresh are separate user-confirmed steps.
