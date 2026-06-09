---
name: coding-agents
description: Use when the user wants the Coding Agents workflow or source CLI to intake a jobsite/target cwd, maintain the target git root's <git-root>/.coding-agents/ workflow state even when invoked cross-repo, assign/collect/run scoped specialist work with task_id/epoch/scope/lifecycle isolation, enforce prompt subagent close/retire handling, enforce debugging root-cause integrity for debug or repair work, print a handoff prompt, audit workflow state, or migrate legacy docs/codex material. Trigger for explicit requests to initialize, plan, execute, coordinate, or audit coding work with the coding-agents plugin or source MVP. Do not use for generic coding edits, and do not treat docs/codex as current workflow state.
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

- Treat `invocation_cwd` as the directory where Codex or the source CLI was launched. Treat `jobsite`, `target cwd`, and `target-cwd` as the repository being planned, repaired, edited, or audited.
- When the user does not name another target, `invocation_cwd` is the jobsite. This preserves the default `cwd is jobsite` intake rule.
- When the user names a different repair/edit target, or the source CLI receives `--target-cwd <path>`, the named target is the jobsite. The invocation repository does not own workflow state for that target.
- Resolve the jobsite's Git root before writing workflow state. The active state root is the jobsite repository's `<git-root>/.coding-agents/`, even when `invocation_cwd` is a plugin, tooling, or parent repository.
- If the jobsite, target cwd, or target Git root is ambiguous, missing, outside the active task scope, or cannot be resolved, stop before state writes or edits. Report the ambiguity and ask for the intended target.
- If no Git root can be resolved for the jobsite, do not invent a state path. Report the blocker or ask for the intended repository root.
- Before creating or updating the jobsite repository's `<git-root>/.coding-agents/`, ensure that repository's `.git/info/exclude` ignores `.coding-agents/`. Add only that local exclude entry when it is missing.
- Do not auto-edit the repository's tracked `.gitignore` to hide Coding Agents state. Edit tracked ignore policy only when the user explicitly requests that repository policy change.
- The first action after trigger is target resolution followed by project intake. Determine `invocation_cwd`, resolve the jobsite from the explicit target or default cwd rule, read the local `AGENTS.md` chain that applies to the jobsite when available, inspect the jobsite repository shape, check Git state, resolve `<git-root>`, inspect existing `.coding-agents` state, inspect `.git/info/exclude`, and identify legacy `docs/codex` material only as migration input.
- During source upgrade work, direct execution of the source CLI runs source-tree behavior: `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs ...`. This validates source behavior, not installed plugin activation.
- Installed plugin activation is controlled by refreshing the plugin cache from validated source and then restarting Codex or opening a new thread when required. Do not claim a source CLI run proves cached plugin activation.
- Maintain `<git-root>/.coding-agents/` as the workflow SSOT for the active job.
- When the user confirms a design or operating decision, record it as an accepted decision, convert it into actionable specification, and audit execution against it after implementation.
- The parent agent owns task decomposition, policy decisions, user consultation, conflict resolution, final integration, explicit subagent close/retire handling, and final reporting.
- Subagents own research, implementation material, verification material, and isolated findings. They do not own final policy or final user-facing synthesis.
- After a subagent result is integrated, after timeout/failure/blocker handling, after a stale premise or scope change, and before the final report when no further use is expected, the parent must close or retire each no-longer-needed subagent promptly.

## Debugging Integrity Gate

- When the active task is DEBUG, debug, bug fix, repair, test failure, regression, "not working", "expected result is not produced", or any equivalent failure-correction request, Coding Agents must treat the goal as root-cause discovery and restoration of the intended outcome.
- Coding Agents must not accept log-only, error-message-only, exception-catch-only, skip-only, fallback-only, continue-only, return-to-main-loop-only, or failure-output-only changes as completed debug work.
- Error handling, logging, fallback, and graceful return behavior do not replace root-cause analysis. If they are added before the root cause is identified and fixed, record them as temporary containment, not completion.
- Debug assignments and handoff material must require the worker to identify the expected outcome, actual failure, reproduction path, failure point, root cause, fix, and verification that the intended outcome now works.
- The parent must reject or reassign any subagent result that claims completion without a root cause and outcome verification for a debug or repair task.
- The final Coding Agents report for debug or repair work must separate root cause, fix, and verification. If root cause remains unknown, report the work as unresolved or temporary containment and name the next investigation step.
- Existing `.coding-agents` state created before this gate is stale when `assignments.md`, `handoff.md`, `runner.md`, or runner packets lack the debugging integrity gate. Do not weaken validation to accept it; normalize the state explicitly with `normalize-debugging-integrity --execute` or regenerate it with intake before treating verification as current.

## Subagent Operating Model

- Before assigning real work, initialize an empty specialist warm pool for the job. The pool starts with no durable task state and waits for scoped assignments.
- Every subagent assignment must include `task_id`, `epoch`, `scope`, and `lifecycle`.
- Treat `task_id` as the unit of user-visible work, `epoch` as the restart boundary for stale context, and `scope` as the allowed file, tool, or investigation boundary.
- When a child worker is operating under a parent-managed Coding Agents assignment, the parent has already selected Coding Agents for that scoped assignment. The child worker must not ask `coding-agents を使いますか？ [Y/n]` and must not start a nested Coding Agents workflow. It proceeds directly within the assigned `task_id`, `epoch`, and `scope`, while still stopping before scope expansion, destructive operations, external sending, commits, cache refresh, plugin activation, or unrelated edits.
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
- `<git-root>/.coding-agents/audit.md`: audit log, completed checks, skipped checks, next audit needs, and debug root-cause verification when the task is a debug or repair task.
- `<git-root>/.coding-agents/assignments.md`: 14 role assignments. Each role must include `role`, `status`, `task_id`, `epoch`, `scope`, `assignment`, `expected_output`, and `lifecycle`; debug or repair tasks must also carry the debugging integrity gate.
- `<git-root>/.coding-agents/handoff.md`: prompt material for the next worker to continue the task, including the subagent rule to return concise integration material, close or retire no-longer-needed workers promptly, and reject log-only or fallback-only debug completion.
- `<git-root>/.coding-agents/runner.md`: conditional operational log for `assign`, `collect`, `run`, `orchestrate`, parent-integration packets, and process results. Create or update it only when that activity occurs. Do not require `runner.md` for intake, specification, documentation-only, or audit flows that have no runner activity.

## Legacy `docs/codex`

- Treat `docs/codex` as legacy workflow material and migration source only.
- Read legacy `docs/codex` during intake when present so existing task, decision, assignment, audit, and runner context can be preserved intentionally.
- Do not silently delete, move, rewrite, or continue active workflow state in `docs/codex`.
- Migration apply is a separate workflow. Default to dry-run, create a preflight backup before destructive or move-like actions, and apply only after explicit user confirmation.

## Source CLI MVP Workflow

Use the source CLI when the user wants to test source-tree behavior before plugin cache activation, or when the active task is a source upgrade of the Coding Agents plugin itself.

1. Record `invocation_cwd` as the launch directory.
2. Resolve the target jobsite path. Use `--target-cwd <jobsite>` for explicit cross-repo target selection; if no target is provided, use `invocation_cwd` as the jobsite.
3. Resolve the jobsite Git root. Confirm the jobsite repository's `<git-root>/.coding-agents/` as the workflow state root before state writes.
4. Ensure the jobsite repository's `.git/info/exclude` ignores `.coding-agents/`; do not edit tracked `.gitignore` unless explicitly requested.
5. Run intake with explicit isolation keys:
   `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs intake --target-cwd <jobsite> --task <task> --task-id <id> --epoch <epoch> --scope <scope>`.
6. Run doctor:
   `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs doctor --target-cwd <jobsite>`.
7. Print handoff when needed:
   `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs handoff --target-cwd <jobsite> --task-id <id>`.
8. If pre-existing `.coding-agents` state lacks the debugging integrity gate, run dry-run first:
   `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs normalize-debugging-integrity --target-cwd <jobsite>`.
   Apply only after confirming the target state directory:
   `node /Users/suzukimakoto/plugins/coding-agents/bin/coding-agents.mjs normalize-debugging-integrity --target-cwd <jobsite> --execute`.
9. For `assign`, `collect`, `run`, or `orchestrate`, record operational packets in the jobsite repository's `.coding-agents/runner.md`.
10. Ensure generated assignments, runner prompts, runner packets, and handoff material carry the nested Coding Agents preflight suppression rule, lifecycle rule, and debugging integrity gate: child workers do not ask `coding-agents を使いますか？ [Y/n]` or start nested Coding Agents workflows inside a parent-managed scoped assignment; subagents return concise integration material, stop waiting for more work, are closed or retired promptly when no longer needed, and do not claim debug completion through log-only, fallback-only, skip-only, or return-to-main-loop-only changes.
11. Treat marketplace registration, `~/.codex/plugins/cache/` refresh, and Codex restart/new-thread activation as separate work unless the user explicitly includes them.

If source CLI output still names legacy `docs/codex`, treat that as source implementation drift to report or fix under the active task scope. Do not let legacy output redefine the current skill contract.

## Workflow

1. Record `invocation_cwd`, then resolve the jobsite from the explicit target (`--target-cwd`, user-named project root, or task-owned target path) or from cwd when no target is named.
2. If target selection remains ambiguous, stop before edits or workflow state writes and ask for the intended jobsite.
3. Resolve the jobsite repository's `<git-root>` and run project intake before editing: repository status, applicable instructions, current `.coding-agents` state, `.git/info/exclude` status, legacy `docs/codex` migration input, source/cache boundaries, and risk level.
4. Before workflow state writes, create or update the jobsite repository's local `.git/info/exclude` entry for `.coding-agents/` when missing. Do not update tracked `.gitignore`.
5. Create or update the active `.coding-agents` files before implementation when workflow state is missing or stale.
6. Initialize the empty specialist warm pool and define the first 14 role assignments with `task_id`, `epoch`, `scope`, and `lifecycle`.
7. Execute or coordinate work according to `.coding-agents/todo.md`.
8. Record user-confirmed decisions in `.coding-agents/decisions.md` and update `.coding-agents/task.md` when scope changes.
9. Create or update `.coding-agents/runner.md` only for `assign`, `collect`, `run`, `orchestrate`, parent-integration packet, or process-result activity.
10. Normalize stale pre-gate `.coding-agents` state with `normalize-debugging-integrity` before relying on `verify-assignments` or `doctor` results.
11. After every completed result integration, timeout/failure/blocker handling, stale premise, or scope change, close or retire subagents that are no longer needed before issuing new assignments.
12. Verify implementation against the accepted decisions and completion conditions. For debug or repair work, verification must include root cause, fix, and evidence that the intended outcome now succeeds; otherwise mark the task unresolved or temporarily contained.
13. Before the final report, confirm no subagent remains open unless the user explicitly asked to keep it for a continued assignment.
14. Append audit results to `.coding-agents/audit.md`, including checks not run and why.
15. Report final status with changed files, verification, open risks, and next TODOs.

## File Boundaries

- Edit jobsite files only inside the active task scope.
- In cross-repo invocation, do not edit the invocation repository merely because Codex or the source CLI was launched there. Edit the invocation repository only when it is also the resolved jobsite or is explicitly inside the active task scope.
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

Return concise parent-facing status in the user's language. Include changed files, verification or audit results, remaining blockers, unresolved TODOs, and any subagent lifecycle exception that remains open. For debug or repair work, explicitly separate root cause, fix, and verification; do not report completion when only logging, fallback, skipping, or failure-return behavior was added. Keep raw subagent logs out of the final answer unless the user asks for them.
