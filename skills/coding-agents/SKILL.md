---
name: coding-agents
description: Use when the user wants Coding Agents to treat the current project cwd as the jobsite and run a coding workflow through project intake, docs/codex planning files, scoped specialist subagents, execution-material collection, and audit. Trigger for requests to initialize, plan, execute, coordinate, or audit coding work with a parent agent plus subagent development team. Do not use for generic coding edits when the user has not asked for this workflow or plugin.
---

# Coding Agents

この `SKILL.md` は、この skill が選択された場合に適用される局所実行契約である。
Codex は、本書の発火前提、作業手順、ツール境界、ファイル境界、出力形式を、この skill のスコープ内で拘束力のある実行条件として扱う。
本書は、システム指示、開発者指示、ユーザーの明示要求、適用される `AGENTS.md`、より局所の実行契約を上書きしない。

## Trigger Boundary

Use this skill only when the user explicitly asks for the `coding-agents` plugin, Coding Agents workflow, subagent development team coordination, or the `docs/codex` planning/audit workflow.
Do not trigger this skill for ordinary one-off code edits, reviews, or explanations unless the user connects the work to Coding Agents.

## Core Contract

- Treat the current working directory as the jobsite. `cwd is jobsite` is the default intake rule unless the user names another project root.
- The first action after trigger is project intake. Read the local `AGENTS.md` chain that applies to the jobsite, inspect the repository shape, check Git state, and identify existing `docs/codex` files before planning edits.
- Maintain `docs/codex/task.md`, `docs/codex/todo.md`, `docs/codex/decisions.md`, and `docs/codex/audit.md` as the workflow SSOT for the active job.
- When the user confirms a design or operating decision, record it as an accepted decision, convert it into actionable specification, and audit execution against it after implementation.
- The parent agent owns task decomposition, policy decisions, user consultation, conflict resolution, final integration, and final reporting.
- Subagents own research, implementation material, verification material, and isolated findings. They do not own final policy or final user-facing synthesis.

## Subagent Operating Model

- Before assigning real work, initialize an empty specialist warm pool for the job. The pool starts with no durable task state and waits for scoped assignments.
- Every subagent assignment must include `task_id`, `epoch`, and `scope`.
- Treat `task_id` as the unit of user-visible work, `epoch` as the restart boundary for stale context, and `scope` as the allowed file, tool, or investigation boundary.
- Reuse of a subagent context is an exception. The default action after a meaningful task boundary, stale premise, scope change, or failed verification is restart or retire.
- A subagent must return concise parent-integration material: findings, changed files or proposed changes, verification notes, blockers, and unresolved assumptions.
- If the current environment has no callable subagent mechanism, state that limitation in the work log, keep the warm-pool design in the plan, and proceed only with parent-side work that the user requested or that the active environment can perform.

## Required `docs/codex` Files

- `docs/codex/README.md`: reader order and role map for Codex-facing workflow files.
- `docs/codex/project.md`: project intake summary for the jobsite itself.
- `docs/codex/task.md`: current task SSOT, including purpose, scope, non-goals, and completion conditions.
- `docs/codex/todo.md`: executable checklist with stable task IDs.
- `docs/codex/decisions.md`: accepted decisions with IDs and implementation impact.
- `docs/codex/audit.md`: audit log, completed checks, skipped checks, and next audit needs.

## Workflow

1. Resolve the jobsite from cwd unless the user explicitly names another root.
2. Run project intake before editing: repository status, applicable instructions, current docs/codex state, likely source/cache boundaries, and risk level.
3. Create or update the required `docs/codex` files before implementation when the workflow state is missing or stale.
4. Initialize the empty specialist warm pool and define the first assignments with `task_id`, `epoch`, and `scope`.
5. Execute or coordinate work according to `docs/codex/todo.md`.
6. Record user-confirmed decisions in `docs/codex/decisions.md` and update `docs/codex/task.md` when scope changes.
7. Verify implementation against the accepted decisions and completion conditions.
8. Append audit results to `docs/codex/audit.md`, including checks not run and why.
9. Report final status with changed files, verification, open risks, and next TODOs.

## File Boundaries

- Edit jobsite files only inside the active task scope.
- Treat plugin source directories as source of truth. Do not patch `~/.codex/plugins/cache/` as the primary edit target.
- Do not edit marketplace files unless the user explicitly includes that in the active task scope.
- Preserve unrelated user or worker changes. If another change appears in scope, work around it or report the conflict; do not revert it.

## Output Shape

Return concise parent-facing status in the user's language. Include changed files, verification or audit results, remaining blockers, and unresolved TODOs. Keep raw subagent logs out of the final answer unless the user asks for them.
