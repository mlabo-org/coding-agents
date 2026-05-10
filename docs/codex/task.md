# Current Task SSOT

## Objective

Implement a directly runnable coding-agents MVP in `/Users/suzukimakoto/plugins/coding-agents` without marketplace registration or plugin cache refresh.

## Scope

- Add `bin/coding-agents.mjs` using Node.js standard libraries only.
- Update `skills/coding-agents/SKILL.md` with source CLI workflow and boundaries.
- Update `docs/codex` workflow files for the MVP.
- Commit only this task's source changes.

## Non-Goals

- Do not edit `~/.codex/plugins/cache/`.
- Do not edit `~/.agents/plugins/marketplace.json`.
- Do not add dependencies.
- Do not run `npm install`, `pip`, `python`, or `python3`.
- Do not implement MCP servers, hooks, or real subagent runtime code in this task.
- Do not touch files outside `/Users/suzukimakoto/plugins/coding-agents`.

## Completion Conditions

- `node bin/coding-agents.mjs --help` works.
- `intake` creates or updates target `docs/codex` files.
- `doctor` reports required files, 14 role assignments, isolation keys, and Git state.
- `handoff` prints the generated handoff prompt.
- Re-running `intake` is idempotent for generated sections.
- `SKILL.md` passes `skill-md-clarifier` criteria for trigger, workflow, boundaries, and output shape.
- Marketplace/cache activation remains deferred.
