# MVP Build Plan

## T-001 Plugin Source Initialization

- [x] T-001.1 Create minimal `.codex-plugin/plugin.json` for `coding-agents`.
- [x] T-001.2 Create `skills/coding-agents/SKILL.md` as an execution contract.
- [x] T-001.3 Create `docs/codex` workflow files.
- [x] T-001.4 Add `.gitignore` for cache, runtime, logs, secrets, and bytecode.
- [x] T-001.5 Initialize Git and create initial commit.

## T-002 Marketplace Registration

- [ ] T-002.1 Add `coding-agents` to `~/.agents/plugins/marketplace.json` only after explicit user approval.
- [ ] T-002.2 Confirm marketplace entry uses source path `./plugins/coding-agents`.

## T-003 Cache Refresh

- [ ] T-003.1 Refresh plugin cache from source using the approved refresh workflow.
- [ ] T-003.2 Tell the user whether Codex restart or a new thread is needed.

## T-004 Subagent Runtime Design

- [ ] T-004.1 Define warm-pool lifecycle states.
- [ ] T-004.2 Define `task_id`, `epoch`, and `scope` assignment schema.
- [ ] T-004.3 Define restart/retire rules and the narrow reuse exception.
- [ ] T-004.4 Define parent integration output format for subagent results.

## T-005 Workflow Audit

- [x] T-005.1 Audit initial `SKILL.md` wording against `skill-md-clarifier` criteria.
- [ ] T-005.2 Audit the first real Coding Agents run against `SKILL.md`.
- [ ] T-005.3 Record missing runner, hook, MCP, or app support as implementation backlog.
