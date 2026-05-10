# Accepted Decisions

## D-001 Source Repository

Accepted: `/Users/suzukimakoto/plugins/coding-agents` is the source repository candidate for the home-local `coding-agents` plugin.

Impact: edit this source repo, not `~/.codex/plugins/cache/`, for plugin source changes.

## D-002 CWD Is Jobsite

Accepted: the plugin treats the current project cwd as the jobsite unless the user explicitly names another root.

Impact: every run starts by resolving and inspecting the jobsite before planning implementation.

## D-003 Project Intake First

Accepted: the first workflow phase is project intake.

Impact: Codex must read applicable instructions, inspect repo shape, check Git state, and identify existing `docs/codex` files before edits.

## D-004 Empty Specialist Warm Pool

Accepted: plugin activation uses an empty specialist warm pool design.

Impact: specialist contexts begin without durable task state and receive scoped assignments before work.

## D-005 Subagent Isolation Keys

Accepted: subagent work is isolated by `task_id`, `epoch`, and `scope`.

Impact: task identity, restart boundary, and allowed work boundary must be explicit in each assignment.

## D-006 Restart Or Retire By Default

Accepted: subagent context reuse is exceptional; restart or retire is the default after meaningful boundaries.

Impact: stale context and scope drift are handled by reset, not silent continuation.

## D-007 Docs/Codex Workflow SSOT

Accepted: `docs/codex/task.md`, `todo.md`, `decisions.md`, and `audit.md` are read and updated during the workflow.

Impact: accepted decisions become specification, TODO drives execution, and audit records verification state.

## D-008 Parent And Subagent Roles

Accepted: the parent owns decisions and integration; subagents provide research, implementation, and verification material.

Impact: subagents do not produce final policy or final user-facing synthesis.

## D-009 Marketplace Deferred

Accepted: `~/.agents/plugins/marketplace.json` is not edited during initial source setup.

Impact: marketplace registration remains a TODO after the initial commit.
