# Current Task SSOT

## Objective

Initialize `/Users/suzukimakoto/plugins/coding-agents` as the source repository for the home-local `coding-agents` Codex plugin and convert the agreed workflow into implementation-start TODO and instructions.

## Scope

- Create `.codex-plugin/plugin.json`.
- Create `skills/coding-agents/SKILL.md`.
- Create initial `docs/codex` workflow files.
- Create `.gitignore`.
- Initialize Git if needed.
- Commit only the source files created for this initialization.

## Non-Goals

- Do not edit `~/.codex/plugins/cache/`.
- Do not edit `~/.agents/plugins/marketplace.json`.
- Do not add dependencies.
- Do not implement MCP servers, hooks, scripts, or subagent runtime code in this task.
- Do not touch files outside `/Users/suzukimakoto/plugins/coding-agents`.

## Completion Conditions

- Plugin manifest exists and is schema-plausible for a minimal local plugin.
- `SKILL.md` has aligned frontmatter/body trigger contract and includes the agreed Coding Agents operating model.
- `docs/codex` contains README, project, task, todo, decisions, and audit files.
- `.gitignore` excludes cache, runtime, logs, secrets, and Python bytecode artifacts.
- Repository is initialized and one initial commit records this plugin specification.
- Remaining marketplace/cache activation work is captured as TODO, not performed.
