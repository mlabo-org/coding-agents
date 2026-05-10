# Codex Workflow Files

Codex reads these files in this order when operating the `coding-agents` plugin:

1. `project.md`: stable project intake summary for this plugin repo.
2. `task.md`: current task SSOT, including objective, scope, non-goals, and completion conditions.
3. `todo.md`: executable checklist with stable task IDs.
4. `decisions.md`: accepted user/project decisions that implementation must satisfy.
5. `audit.md`: completed checks, skipped checks, and next audit needs.

These files are operational planning records for this repository. They do not override system instructions, developer instructions, user requests, applicable `AGENTS.md`, or the active `SKILL.md`.
