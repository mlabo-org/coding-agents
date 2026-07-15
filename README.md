# Coding Agents

Coding Agents is an explicit-only Codex plugin for inspectable coding workflow state. It records intake, bounded assignments, collection, finalization, audit, and handoff packets under `.coding-agents/`. Actual workers are dispatched only through official Codex subagent tools; the source CLI is record-only and never launches `codex exec` or a custom process runner.

It is designed to operate beneath [Agentic Runner](https://github.com/mlabo-org/agentic-runner), which owns the higher-level route, scope, lifecycle, supervision, and audit trail.

## Install

The Agentic Runner repository publishes the shared marketplace:

```sh
codex plugin marketplace add mlabo-org/agentic-runner --ref main
codex plugin add agentic-runner@agentic-control-plane
codex plugin add coding-agents@agentic-control-plane
```

Restart Codex or start a new task after installation.

## Trigger Explicitly

Use the plugin by name:

> Use Coding Agents explicitly to audit this repository. Inspect README.md and package.json, run npm test, make no source changes or commits, and return the workflow-state and verification evidence.

Generic coding, debugging, source changes, delegation, or subagent requests do not automatically select Coding Agents.

## From Specification To Execution

You can begin before a detailed implementation specification exists. Use Codex as a specification partner to discuss desired behavior, users, constraints, interfaces, edge cases, acceptance criteria, validation commands, and forbidden changes. The Coding Agents parent workflow owns this consultation and the resulting decisions.

Once the decisions are confirmed, ask Codex to turn them into an actionable instruction document such as `docs/implementation-brief.md`. A useful brief includes:

- goal and non-goals
- accepted decisions and unresolved questions
- in-scope and out-of-scope files
- functional and nonfunctional requirements
- acceptance criteria and required tests
- permissions, stop conditions, and commit policy

Then execute that contract explicitly:

> Use Coding Agents explicitly. Treat `docs/implementation-brief.md` as the implementation contract. Create the intake and bounded assignments, dispatch workers only through official Codex subagent tools, implement within the declared scope, run every listed validation, and do not commit until I approve.

Coding Agents records confirmed decisions, converts them into actionable specification, and audits the implementation against the source/spec contract before task finalization. This creates a direct path from an early design conversation to verified implementation without losing the decisions made along the way.

## Execution Boundary

- The Codex main thread owns decomposition, policy, safety, integration, verification, and the final response.
- Coding Agents records task identity, epoch, declared scope, scaffold contracts, assignments, results, lifecycle, and handoff state.
- Official Codex subagent tools are the only worker-dispatch route.
- If official subagents are unavailable, execution remains in the parent thread. The CLI does not fall back to an OS child Codex process.
- Runtime state and installed plugin cache are not source.

## Run From Source

The repository has no third-party runtime dependencies. A recent Node.js release and Git are required.

```sh
git clone https://github.com/mlabo-org/coding-agents.git
cd coding-agents
npm test
npm run doctor:self
```

Additional checks:

```sh
npm run test:cli
```

`doctor:self` validates the source-tree CLI. It does not claim that a separately installed plugin cache has been refreshed.

## Build Week Extension

The workflow baseline existed before the 2026 OpenAI Build Week eligibility window. The submission asks judges to evaluate only these later extensions:

- [`a68c1b6`](https://github.com/mlabo-org/coding-agents/commit/a68c1b6585c79c11d0a5d89673659cd4d3c4c050) — removed the CLI-spawned Codex worker path and established official Codex subagents as the only worker-dispatch route.
- [`678f9a9`](https://github.com/mlabo-org/coding-agents/commit/678f9a9224a562098f5909ee1037dd7677d79a96) — centralized shared scaffold contracts and reduced workflow-state overhead while retaining lifecycle, packet, and historical-compatibility checks.

The current source suite contains 61 passing tests.

## Platform

Verified on macOS 26.5.2 with Codex CLI 0.144.2, Node.js 24.18.0, and Git 2.55.0. The implementation uses Node.js standard-library APIs and Git, but other operating systems have not yet been verified.

## License

MIT License. Copyright (c) 2026 Makoto Suzuki.
