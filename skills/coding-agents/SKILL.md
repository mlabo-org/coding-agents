---
name: coding-agents
description: Use when the user wants the Coding Agents workflow or source CLI to intake a project cwd, maintain <git-root>/.coding-agents/ workflow state, assign/collect/run scoped specialist work with task_id/epoch/scope/lifecycle isolation, enforce prompt subagent close/retire handling, print a handoff prompt, audit workflow state, or migrate legacy docs/codex material. Trigger for explicit requests to initialize, plan, execute, coordinate, or audit coding work with the coding-agents plugin or source MVP. Do not use for generic coding edits, and do not treat docs/codex as current workflow state.
---

# Coding Agents

この `SKILL.md` は、この skill が選択された場合に適用される局所実行契約である。
Codex は、本書の発火前提、作業手順、ツール境界、ファイル境界、出力形式を、この skill のスコープ内で拘束力のある実行条件として扱う。
本書は、システム指示、開発者指示、ユーザーの明示要求、適用される `AGENTS.md`、より局所の実行契約を上書きしない。

## Trigger Boundary

- Use this skill only when the user explicitly asks for the `coding-agents` plugin, Coding Agents workflow, source CLI, subagent development team coordination, `.coding-agents` workflow state, task_id/epoch/scope/lifecycle assignments, assign/collect/run orchestration, handoff generation, workflow audit, or legacy `docs/codex` migration.
- Do not trigger this skill for ordinary one-off code edits, reviews, or explanations unless the user connects the work to Coding Agents.
- Do not trigger this skill merely because a repository contains `docs/codex`. Legacy `docs/codex` is a migration source, not proof that the current workflow is active.
- Do not perform legacy migration apply, plugin cache refresh, marketplace updates, or restart/reload actions unless the active user request includes that boundary.

## Core Contract

- Treat the current working directory as the jobsite. `cwd is jobsite` is the default intake rule unless the user names another project root.
- Resolve the target repository Git root before writing workflow state. The active state root is `<git-root>/.coding-agents/`.
- If no Git root can be resolved for the target jobsite, do not invent a state path. Report the blocker or ask for the intended repository root.
- Before creating or updating `<git-root>/.coding-agents/`, ensure the target repository's `.git/info/exclude` ignores `.coding-agents/`. Add only that local exclude entry when it is missing.
- Do not auto-edit the repository's tracked `.gitignore` to hide Coding Agents state. Edit tracked ignore policy only when the user explicitly requests that repository policy change.
- The first action after trigger is project intake. Read the local `AGENTS.md` chain that applies to the jobsite when available, inspect the repository shape, check Git state, resolve `<git-root>`, inspect existing `.coding-agents` state, inspect `.git/info/exclude`, and identify legacy `docs/codex` material only as migration input.
- During source upgrade work, direct execution of the source CLI runs source-tree behavior: `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs ...`. This validates source behavior, not installed plugin activation.
- Installed plugin activation is controlled by refreshing the plugin cache from validated source and then restarting Codex or opening a new thread when required. Do not claim a source CLI run proves cached plugin activation.
- Maintain `<git-root>/.coding-agents/` as the workflow SSOT for the active job.
- When the user confirms a design or operating decision, record it as an accepted decision, convert it into actionable specification, and audit execution against it after implementation.
- The parent agent owns task decomposition, policy decisions, user consultation, conflict resolution, final integration, explicit subagent close/retire handling, and final reporting.
- Subagents own research, implementation material, verification material, and isolated findings. They do not own final policy or final user-facing synthesis.
- After a subagent result is integrated, after timeout/failure/blocker handling, after a stale premise or scope change, and before the final report when no further use is expected, the parent must close or retire each no-longer-needed subagent promptly.

## Subagent Operating Model

- Before assigning real work, initialize an empty specialist warm pool for the job. The pool starts with no durable task state and waits for scoped assignments.
- Every subagent assignment must include `task_id`, `epoch`, `scope`, and `lifecycle`.
- Treat `task_id` as the unit of user-visible work, `epoch` as the restart boundary for stale context, and `scope` as the allowed file, tool, or investigation boundary.
- Reuse of a subagent context is an exception. The default action after a meaningful task boundary, stale premise, scope change, or failed verification is restart or retire.
- A subagent must return concise parent-integration material: findings, changed files or proposed changes, verification notes, blockers, and unresolved assumptions.
- A subagent must stop after returning integration material. It must not stay open waiting for more work; any continuation requires a fresh explicit assignment or an intentional parent-managed reuse decision.
- When a subagent times out, fails, reports a blocker, or becomes stale because the premise or scope changed, retire that context before issuing any replacement assignment.
- If the current environment has no callable subagent mechanism, state that limitation in the work log, keep the warm-pool design in the plan, and proceed only with parent-side work that the user requested or that the active environment can perform.

## Workflow State Files

- `<git-root>/.coding-agents/README.md`: reader order and role map for Codex-facing workflow files.
- `<git-root>/.coding-agents/project.md`: project intake summary for the jobsite itself.
- `<git-root>/.coding-agents/task.md`: current task SSOT, including purpose, scope, non-goals, and completion conditions.
- `<git-root>/.coding-agents/todo.md`: executable checklist with stable task IDs.
- `<git-root>/.coding-agents/decisions.md`: accepted decisions with IDs and implementation impact.
- `<git-root>/.coding-agents/audit.md`: audit log, completed checks, skipped checks, and next audit needs.
- `<git-root>/.coding-agents/assignments.md`: 14 role assignments. Each role must include `role`, `status`, `task_id`, `epoch`, `scope`, `assignment`, `expected_output`, and `lifecycle`.
- `<git-root>/.coding-agents/handoff.md`: prompt material for the next worker to continue the task, including the subagent rule to return concise integration material and close or retire no-longer-needed workers promptly.
- `<git-root>/.coding-agents/runner.md`: conditional operational log for `assign`, `collect`, `run`, `orchestrate`, parent-integration packets, and process results. Create or update it only when that activity occurs. Do not require `runner.md` for intake, specification, documentation-only, or audit flows that have no runner activity.

## Legacy `docs/codex`

- Treat `docs/codex` as legacy workflow material and migration source only.
- Read legacy `docs/codex` during intake when present so existing task, decision, assignment, audit, and runner context can be preserved intentionally.
- Do not silently delete, move, rewrite, or continue active workflow state in `docs/codex`.
- Migration apply is a separate workflow. Default to dry-run, create a preflight backup before destructive or move-like actions, and apply only after explicit user confirmation.

## Source CLI MVP Workflow

Use the source CLI when the user wants to test source-tree behavior before plugin cache activation, or when the active task is a source upgrade of the Coding Agents plugin itself.

1. Resolve the target jobsite path.
2. Resolve the target Git root. Confirm `<git-root>/.coding-agents/` as the workflow state root before state writes.
3. Ensure `.git/info/exclude` ignores `.coding-agents/`; do not edit tracked `.gitignore` unless explicitly requested.
4. Run intake with explicit isolation keys:
   `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs intake --cwd <jobsite> --task <task> --task-id <id> --epoch <epoch> --scope <scope>`.
5. Run doctor:
   `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs doctor --cwd <jobsite>`.
6. Print handoff when needed:
   `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs handoff --cwd <jobsite> --task-id <id>`.
7. For `assign`, `collect`, `run`, or `orchestrate`, record operational packets in `.coding-agents/runner.md`.
8. Ensure generated assignments, runner prompts, runner packets, and handoff material carry the lifecycle rule: subagents return concise integration material, stop waiting for more work, and are closed or retired promptly when no longer needed.
9. Treat marketplace registration, `~/.codex/plugins/cache/` refresh, and Codex restart/new-thread activation as separate work unless the user explicitly includes them.

If source CLI output still names legacy `docs/codex`, treat that as source implementation drift to report or fix under the active task scope. Do not let legacy output redefine the current skill contract.

## Workflow

1. Resolve the jobsite from cwd unless the user explicitly names another root.
2. Resolve `<git-root>` and run project intake before editing: repository status, applicable instructions, current `.coding-agents` state, `.git/info/exclude` status, legacy `docs/codex` migration input, source/cache boundaries, and risk level.
3. Before workflow state writes, create or update the local `.git/info/exclude` entry for `.coding-agents/` when missing. Do not update tracked `.gitignore`.
4. Create or update the active `.coding-agents` files before implementation when workflow state is missing or stale.
5. Initialize the empty specialist warm pool and define the first 14 role assignments with `task_id`, `epoch`, `scope`, and `lifecycle`.
6. Execute or coordinate work according to `.coding-agents/todo.md`.
7. Record user-confirmed decisions in `.coding-agents/decisions.md` and update `.coding-agents/task.md` when scope changes.
8. Create or update `.coding-agents/runner.md` only for `assign`, `collect`, `run`, `orchestrate`, parent-integration packet, or process-result activity.
9. After every completed result integration, timeout/failure/blocker handling, stale premise, or scope change, close or retire subagents that are no longer needed before issuing new assignments.
10. Verify implementation against the accepted decisions and completion conditions.
11. Before the final report, confirm no subagent remains open unless the user explicitly asked to keep it for a continued assignment.
12. Append audit results to `.coding-agents/audit.md`, including checks not run and why.
13. Report final status with changed files, verification, open risks, and next TODOs.

## File Boundaries

- Edit jobsite files only inside the active task scope.
- Treat plugin source directories as source of truth. Do not patch `~/.codex/plugins/cache/` as the primary edit target.
- Do not edit `~/.codex/plugins/cache/`, marketplace files, or plugin activation state unless the user explicitly includes that in the active task scope.
- Do not auto-edit tracked `.gitignore` to hide `.coding-agents/`. Use target `.git/info/exclude` for the local workflow-state ignore rule.
- Do not edit legacy `docs/codex` as active workflow state. Edit it only when the active task is an explicit migration, cleanup, or legacy-document maintenance task.
- Preserve unrelated user or worker changes. If another change appears in scope, work around it or report the conflict; do not revert it.
- The MVP CLI uses Node.js standard libraries only. Do not add dependencies to run intake, handoff, or doctor.

## Source And Cache Boundary

- Source repository changes take effect for direct source CLI runs immediately.
- Installed plugin behavior uses the cached plugin copy under `~/.codex/plugins/cache/` and may require a refresh plus Codex restart or a new thread before the updated skill, agent metadata, CLI, or assets are active.
- Refresh cache only from validated source and only for the named plugin in scope. Do not refresh broadly or edit cache files directly.
- When cache activation is out of scope, report that source is updated but plugin activation is pending cache refresh/restart.

## Output Shape

Return concise parent-facing status in the user's language. Include changed files, verification or audit results, remaining blockers, unresolved TODOs, and any subagent lifecycle exception that remains open. Keep raw subagent logs out of the final answer unless the user asks for them.
