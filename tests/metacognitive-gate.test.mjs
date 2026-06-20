import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "bin", "coding-agents.mjs");

const META_ARGS = [
  "--expected-outcome",
  "completed gate-required work records the intended outcome",
  "--actual-result",
  "the parent integration packet includes metacognitive fields",
  "--reproduction-or-evidence",
  "node CLI collect command in a temp git repo",
  "--failure-point",
  "collect completion validation",
  "--hypothesis-branches",
  "missing state gate versus missing completed packet fields",
  "--source-of-truth-boundary",
  "source CLI under test owns bin/coding-agents.mjs",
  "--plugin-contract-boundary",
  "plugin cache and activation are out of scope",
  "--generated-artifact-boundary",
  ".coding-agents runner state is generated workflow state",
  "--before-context-effects",
  "before the fix completed packets could rely on passive debugging prose",
  "--after-context-effects",
  "after the fix completed packets must carry structured fields",
  "--cross-feature-consequences",
  "collect, verify-assignments, doctor, assign, and run share gate semantics",
  "--root-cause",
  "completed collection previously did not require machine-readable metacognitive evidence",
  "--fix-summary",
  "collect rejects completed gate-required packets unless every gate field is present",
  "--verification-evidence",
  "black-box node:test exercised intake, collect, verify-assignments, and doctor",
  "--skipped-checks",
  "No skipped checks; targeted CLI and node:test commands ran.",
  "--unresolved-risks",
  "No unresolved risks observed after targeted verification in temp repos.",
  "--next-investigation",
  "Monitor future runner-result normalization if codex-cli output format changes.",
];

test("intake makes the metacognitive gate visible and verifiable for gate-required work", () => {
  const repo = makeTempGitRepo();
  try {
    const intake = runCli([
      "intake",
      "--target-cwd",
      repo,
      "--task",
      "Debug generated-artifact inconsistency and final artifact mismatch",
      "--task-id",
      "meta-intake",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs generated-artifact inconsistency",
    ]);

    assert.equal(intake.status, 0, intake.stderr);
    assert.match(intake.stdout, /ok metacognitive_gate_required: true/);

    const task = readState(repo, "task.md");
    const assignments = readState(repo, "assignments.md");
    assert.match(task, /metacognitive_gate_required: true/);
    assert.match(assignments, /metacognitive_gate_required: true/);
    assert.match(assignments, /metacognitive_gate_fields: .*expected_outcome/);
    assert.match(assignments, /metacognitive_gate_fields: .*cross_feature_consequences/);
    assert.doesNotMatch(getRoleSection(assignments, "Intake"), /^- root_cause:/m);

    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
    assert.equal(runCli(["doctor", "--target-cwd", repo]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("collect rejects completed gate-required packets without metacognitive fields", () => {
  const repo = makeTempGitRepo();
  try {
    intakeGateRequired(repo, "meta-collect");

    const rejected = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-collect",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "completed",
      "--findings",
      "fixed",
      "--changed-files",
      "bin/coding-agents.mjs",
      "--verification",
      "not run",
    ]);

    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /collect --status completed rejected/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    const placeholderEvidence = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-collect",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "completed",
      "--findings",
      "fixed",
      "--changed-files",
      "bin/coding-agents.mjs",
      "--verification",
      "not run",
      ...placeholderMetaArgs("none"),
    ]);
    assert.notEqual(placeholderEvidence.status, 0);
    assert.match(placeholderEvidence.stderr, /expected_outcome/);
    assert.match(placeholderEvidence.stderr, /verification/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    const doneEvidence = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-collect",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "completed",
      "--findings",
      "fixed",
      "--changed-files",
      "bin/coding-agents.mjs",
      "--verification",
      "done",
      ...placeholderMetaArgs("done"),
    ]);
    assert.notEqual(doneEvidence.status, 0);
    assert.match(doneEvidence.stderr, /expected_outcome/);
    assert.match(doneEvidence.stderr, /verification/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    const proseOnlyEvidence = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-collect",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "completed",
      "--findings",
      "fixed",
      "--changed-files",
      "bin/coding-agents.mjs",
      "--verification",
      "I checked it carefully",
      ...placeholderMetaArgs("I reviewed the work carefully"),
    ]);
    assert.notEqual(proseOnlyEvidence.status, 0);
    assert.match(proseOnlyEvidence.stderr, /source_of_truth_boundary|verification/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    const missingContext = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-collect",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "completed",
      "--findings",
      "fixed",
      "--changed-files",
      "bin/coding-agents.mjs",
      "--verification",
      "node --test",
      ...withoutMetaArgs("--before-context-effects", "--after-context-effects", "--cross-feature-consequences"),
    ]);
    assert.notEqual(missingContext.status, 0);
    assert.match(missingContext.stderr, /before_context_effects/);
    assert.match(missingContext.stderr, /after_context_effects/);
    assert.match(missingContext.stderr, /cross_feature_consequences/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    const blocked = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-collect",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "blocked",
      "--findings",
      "root cause not yet isolated",
      "--blockers",
      "need reproduction evidence",
      "--next-investigation",
      "inspect runner packet validation",
    ]);
    assert.equal(blocked.status, 0, blocked.stderr);
    const blockedRunner = readState(repo, "runner.md");
    assert.match(blockedRunner, /status: blocked/);
    assert.match(blockedRunner, /next_investigation: inspect runner packet validation/);
    assert.doesNotMatch(blockedRunner, /root_cause: not completed/);

    const accepted = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-collect",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "completed",
      "--findings",
      "fixed",
      "--changed-files",
      "bin/coding-agents.mjs",
      "--verification",
      "node --test",
      ...META_ARGS,
    ]);

    assert.equal(accepted.status, 0, accepted.stderr);
    const runner = readState(repo, "runner.md");
    assert.match(runner, /status: blocked/);
    assert.match(runner, /status: completed/);
    assert.match(runner, /expected_outcome: completed gate-required work records the intended outcome/);
    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("cache/runtime versus source mismatch triggers the metacognitive gate", () => {
  const repo = makeTempGitRepo();
  try {
    const intake = runCli([
      "intake",
      "--target-cwd",
      repo,
      "--task",
      "Repair cache/runtime versus source mismatch in generated workflow state",
      "--task-id",
      "meta-cache-runtime",
      "--epoch",
      "e1",
      "--scope",
      "cache/runtime versus source mismatch",
    ]);

    assert.equal(intake.status, 0, intake.stderr);
    assert.match(intake.stdout, /ok metacognitive_gate_required: true/);
    assert.match(intake.stdout, /cache\/runtime source mismatch/);
    assert.match(readState(repo, "task.md"), /metacognitive_gate_triggers: .*cache\/runtime source mismatch/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("source-change work triggers the metacognitive gate", () => {
  const repo = makeTempGitRepo();
  try {
    const intake = runCli([
      "intake",
      "--target-cwd",
      repo,
      "--task",
      "Implement source change in bin/coding-agents.mjs and update tests",
      "--task-id",
      "meta-source-change",
      "--epoch",
      "e1",
      "--scope",
      "source-change metacognitive baseline in bin/coding-agents.mjs",
    ]);

    assert.equal(intake.status, 0, intake.stderr);
    assert.match(intake.stdout, /ok metacognitive_gate_required: true/);
    assert.match(intake.stdout, /source change/);
    assert.match(readState(repo, "task.md"), /metacognitive_gate_triggers: .*source change/);

    const rejected = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-source-change",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "completed",
      "--findings",
      "patched source",
      "--changed-files",
      "bin/coding-agents.mjs",
      "--verification",
      "not run",
    ]);

    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /collect --status completed rejected/);
    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("Japanese source edit wording triggers the metacognitive gate", () => {
  const repo = makeTempGitRepo();
  try {
    const intake = runCli([
      "intake",
      "--target-cwd",
      repo,
      "--task",
      "ソース修正依頼なのでパッチファーストを避けて実装変更する",
      "--task-id",
      "meta-japanese-source-change",
      "--epoch",
      "e1",
      "--scope",
      "コード修正: bin/coding-agents.mjs",
    ]);

    assert.equal(intake.status, 0, intake.stderr);
    assert.match(intake.stdout, /ok metacognitive_gate_required: true/);
    assert.match(intake.stdout, /source change/);
    assert.match(readState(repo, "task.md"), /metacognitive_gate_triggers: .*source change/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("assign and run skeletons carry the metacognitive gate for gate-required work", () => {
  const repo = makeTempGitRepo();
  try {
    intakeGateRequired(repo, "meta-run");

    const assigned = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-run",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--assignment",
      "repair source-of-truth contract drift",
      "--expected-output",
      "implementation packet",
    ]);
    assert.equal(assigned.status, 0, assigned.stderr);

    const run = runCli([
      "orchestrate",
      "--target-cwd",
      repo,
      "--role",
      "Test Runner",
      "--task-id",
      "meta-run",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--assignment",
      "verify generated-artifact inconsistency repair",
      "--expected-output",
      "verification packet",
    ]);
    assert.equal(run.status, 0, run.stderr);

    const runner = readState(repo, "runner.md");
    assert.match(runner, /type: assignment/);
    assert.match(runner, /type: process-orchestration-skeleton/);
    assert.match(runner, /metacognitive_gate_required: true/);
    assert.match(runner, /metacognitive_gate_completion_prompt:/);
    assert.doesNotMatch(runner, /before_context_effects: required before completed collection/);
    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("run runner results reject completed metacognitive packets with low-information evidence", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    intakeGateRequired(repo, "meta-run-result");
    const fakeCodex = path.join(fakeBin, "codex");
    writeFileSync(fakeCodex, `#!/usr/bin/env node
const { writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output-last-message");
if (outputIndex !== -1) writeFileSync(args[outputIndex + 1], ${JSON.stringify(metacognitiveResultText("done"))}, "utf8");
process.stdout.write("fake codex completed\\n");
`, "utf8");
    chmodSync(fakeCodex, 0o755);

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-run-result",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--assignment",
      "repair source-of-truth contract drift",
      "--expected-output",
      "metacognitive evidence packet",
      "--runner",
      "codex-cli",
    ], {
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /completed runner result missing metacognitive gate fields/);
    const runner = readState(repo, "runner.md");
    assert.match(runner, /type: process-runner-result/);
    assert.match(runner, /status: failed/);
    assert.match(runner, /failure: completed runner result missing metacognitive gate fields: .*expected_outcome/);
    assert.match(runner, /expected_outcome: done/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("normalization recovers stale pre-gate state without faking completed evidence", () => {
  const repo = makeTempGitRepo();
  try {
    intakeGateRequired(repo, "meta-stale");
    const assignmentsPath = path.join(repo, ".coding-agents", "assignments.md");
    const staleAssignments = stripMetacognitiveLines(readFileSync(assignmentsPath, "utf8"));
    writeFileSync(assignmentsPath, staleAssignments, "utf8");
    writeFileSync(path.join(repo, ".coding-agents", "runner.md"), staleRunner("meta-stale"), "utf8");

    const verify = runCli(["verify-assignments", "--target-cwd", repo]);
    assert.notEqual(verify.status, 0);
    assert.match(verify.stdout, /metacognitive gate missing from assignments|metacognitive assignment fields/);

    const doctor = runCli(["doctor", "--target-cwd", repo]);
    assert.notEqual(doctor.status, 0);
    assert.match(doctor.stdout, /metacognitive gate missing from assignments|metacognitive assignment fields/);

    const dryRun = runCli(["normalize-debugging-integrity", "--target-cwd", repo]);
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.match(dryRun.stdout, /Would update: assignments.md/);
    assert.match(dryRun.stdout, /Would update: runner.md/);

    const normalized = runCli(["normalize-debugging-integrity", "--target-cwd", repo, "--execute"]);
    assert.equal(normalized.status, 0, normalized.stderr);
    assert.match(normalized.stdout, /Updated: assignments.md/);
    assert.match(normalized.stdout, /Updated: runner.md/);

    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
    assert.equal(runCli(["doctor", "--target-cwd", repo]).status, 0);

    const normalizedAssignments = readState(repo, "assignments.md");
    assert.match(getRoleSection(normalizedAssignments, "Implementer"), /metacognitive_gate_fields: .*root_cause/);
    assert.doesNotMatch(getRoleSection(normalizedAssignments, "Implementer"), /^- root_cause:/m);

    const normalizedRunner = readState(repo, "runner.md");
    assert.match(normalizedRunner, /status: unresolved/);
    assert.match(normalizedRunner, /pre-metacognitive-gate packet claimed completion/);
    assert.match(normalizedRunner, /next_investigation: re-run or recollect/);
    assert.doesNotMatch(normalizedRunner, /^- root_cause:/m);

    const cleanDryRun = runCli(["normalize-debugging-integrity", "--target-cwd", repo]);
    assert.equal(cleanDryRun.status, 0, cleanDryRun.stderr);
    assert.match(cleanDryRun.stdout, /No debugging integrity or metacognitive gate normalization needed/);
    assert.doesNotMatch(cleanDryRun.stdout, /Would update:/);

    const assign = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-stale",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--assignment",
      "repair source-of-truth contract drift",
      "--expected-output",
      "implementation notes",
    ]);
    assert.equal(assign.status, 0, assign.stderr);

    const completedWithoutEvidence = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "meta-stale",
      "--epoch",
      "e1",
      "--scope",
      "bin/coding-agents.mjs",
      "--status",
      "completed",
      "--findings",
      "fixed",
      "--changed-files",
      "bin/coding-agents.mjs",
      "--verification",
      "not run",
    ]);
    assert.notEqual(completedWithoutEvidence.status, 0);
    assert.match(completedWithoutEvidence.stderr, /collect --status completed rejected/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("normalization and intake strip stale active-looking preamble from generated workflow state", () => {
  const repo = makeTempGitRepo();
  try {
    intakeGateRequired(repo, "meta-preamble");
    for (const file of ["task.md", "project.md", "decisions.md", "handoff.md"]) {
      const filePath = path.join(repo, ".coding-agents", file);
      writeFileSync(filePath, staleActivePreamble(file) + readFileSync(filePath, "utf8"), "utf8");
    }

    const dryRun = runCli(["normalize-debugging-integrity", "--target-cwd", repo]);
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.match(dryRun.stdout, /Would update: task.md/);
    assert.match(dryRun.stdout, /Would update: project.md/);
    assert.match(dryRun.stdout, /Would update: decisions.md/);
    assert.match(dryRun.stdout, /Would update: handoff.md/);

    const normalized = runCli(["normalize-debugging-integrity", "--target-cwd", repo, "--execute"]);
    assert.equal(normalized.status, 0, normalized.stderr);
    for (const file of ["task.md", "project.md", "decisions.md", "handoff.md"]) {
      const text = readState(repo, file);
      assert.match(text, /^<!-- coding-agents-mvp:start -->/);
      assert.doesNotMatch(text, /T-007\.5|docs\/codex active state|CA-RUNNER-DOCS-FINALIZE-001/);
    }

    for (const file of ["task.md", "project.md", "decisions.md", "handoff.md"]) {
      const filePath = path.join(repo, ".coding-agents", file);
      writeFileSync(filePath, staleActivePreamble(file) + readFileSync(filePath, "utf8"), "utf8");
    }
    const intake = runCli([
      "intake",
      "--target-cwd",
      repo,
      "--task",
      "Debug source-of-truth contract drift after stale docs/codex preamble",
      "--task-id",
      "meta-preamble-next",
      "--epoch",
      "e2",
      "--scope",
      "source CLI generated workflow state",
    ]);
    assert.equal(intake.status, 0, intake.stderr);
    for (const file of ["task.md", "project.md", "decisions.md", "handoff.md"]) {
      const text = readState(repo, file);
      assert.match(text, /^<!-- coding-agents-mvp:start -->/);
      assert.match(text, /meta-preamble-next/);
      assert.doesNotMatch(text, /T-007\.5|docs\/codex active state|CA-RUNNER-DOCS-FINALIZE-001/);
    }
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("commands default the target cwd to process cwd when no cwd flags are provided", () => {
  const repo = makeTempGitRepo();
  try {
    const intake = runCli([
      "intake",
      "--task",
      "Debug generated-artifact inconsistency from default cwd",
      "--task-id",
      "meta-default-cwd",
      "--epoch",
      "e1",
      "--scope",
      "default cwd behavior",
    ], { cwd: repo });
    assert.equal(intake.status, 0, intake.stderr);
    const project = readState(repo, "project.md");
    assert.match(project, /target_cwd: .*coding-agents-meta-/);
    assert.match(project, /task_id: meta-default-cwd/);

    assert.equal(runCli(["verify-assignments"], { cwd: repo }).status, 0);
    assert.equal(runCli(["doctor"], { cwd: repo }).status, 0);

    const handoff = runCli(["handoff", "--task-id", "meta-default-cwd"], { cwd: repo });
    assert.equal(handoff.status, 0, handoff.stderr);
    assert.match(handoff.stdout, /target_cwd:/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("non gate tasks do not require metacognitive completion fields", () => {
  const repo = makeTempGitRepo();
  try {
    const intake = runCli([
      "intake",
      "--target-cwd",
      repo,
      "--task",
      "Add a small documentation note",
      "--task-id",
      "meta-non-gate",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
    ]);
    assert.equal(intake.status, 0, intake.stderr);
    assert.match(intake.stdout, /ok metacognitive_gate_required: false/);

    const collected = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Docs Keeper",
      "--task-id",
      "meta-non-gate",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--status",
      "completed",
      "--findings",
      "done",
      "--changed-files",
      "README.md",
      "--verification",
      "not run",
    ]);
    assert.equal(collected.status, 0, collected.stderr);
    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

function intakeGateRequired(repo, taskId) {
  const result = runCli([
    "intake",
    "--target-cwd",
    repo,
    "--task",
    "Debug source-of-truth contract drift and stale generated state",
    "--task-id",
    taskId,
    "--epoch",
    "e1",
    "--scope",
    "bin/coding-agents.mjs",
  ]);
  assert.equal(result.status, 0, result.stderr);
}

function makeTempGitRepo() {
  const repo = mkdtempSync(path.join(os.tmpdir(), "coding-agents-meta-"));
  const init = spawnSync("git", ["init"], { cwd: repo, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  return repo;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: options.cwd || REPO_ROOT,
    env: options.env || process.env,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
}

function readState(repo, file) {
  return readFileSync(path.join(repo, ".coding-agents", file), "utf8");
}

function withoutMetaArgs(...omittedFlags) {
  const omitted = new Set(omittedFlags);
  const result = [];
  for (let i = 0; i < META_ARGS.length; i += 2) {
    if (omitted.has(META_ARGS[i])) continue;
    result.push(META_ARGS[i], META_ARGS[i + 1]);
  }
  return result;
}

function placeholderMetaArgs(value) {
  const result = [];
  for (let i = 0; i < META_ARGS.length; i += 2) {
    result.push(META_ARGS[i], value);
  }
  return result;
}

function metacognitiveResultText(value) {
  const result = [];
  for (let i = 0; i < META_ARGS.length; i += 2) {
    result.push(`- ${META_ARGS[i].slice(2).replaceAll("-", "_")}: ${value}`);
  }
  return result.join("\n");
}

function staleActivePreamble(file) {
  return `# Stale ${file} docs/codex active state

- task_id: T-007.5
- epoch: 2026-05-11T06
- scope: docs/codex active state and runner smoke notes
- next: continue CA-RUNNER-DOCS-FINALIZE-001

`;
}

function getRoleSection(text, role) {
  const startMatch = new RegExp(`^## ${escapeRegExp(role)}$`, "m").exec(text);
  if (!startMatch) return "";
  const start = startMatch.index;
  const next = text.slice(start + startMatch[0].length).search(/^## /m);
  if (next === -1) return text.slice(start);
  return text.slice(start, start + startMatch[0].length + next);
}

function staleRunner(taskId) {
  return `# Coding Agents Runner

This file records stale pre-gate packets.

## Issued Assignments

### 2026-06-13T00:00:00.000Z Implementer ${taskId}

- type: assignment
- role: Implementer
- status: assigned
- task_id: ${taskId}
- epoch: e1
- scope: bin/coding-agents.mjs
- assignment: repair source-of-truth contract drift
- expected_output: implementation notes
- debugging_integrity: debug work requires root cause and verification
- lifecycle: return concise parent-integration material, then stop

## Parent Integration Packets

### 2026-06-13T00:01:00.000Z Implementer ${taskId}

- type: parent-integration
- role: Implementer
- status: completed
- task_id: ${taskId}
- epoch: e1
- scope: bin/coding-agents.mjs
- findings: older worker claimed completion before metacognitive gate existed
- changed_files: bin/coding-agents.mjs
- verification: not run
- blockers: none
- assumptions: none
- next: parent final verification
- debugging_integrity: debug work requires root cause and verification
- lifecycle: Parent integrates this packet, records any blocker or follow-up, then closes or retires the subagent unless an explicitly scoped continuation is required.
`;
}

function stripMetacognitiveLines(text) {
  const metaFields = [
    "expected_outcome",
    "actual_result",
    "reproduction_or_evidence",
    "failure_point",
    "hypothesis_branches",
    "source_of_truth_boundary",
    "plugin_contract_boundary",
    "generated_artifact_boundary",
    "before_context_effects",
    "after_context_effects",
    "cross_feature_consequences",
    "root_cause",
    "fix_summary",
    "verification_evidence",
    "skipped_checks",
    "unresolved_risks",
    "next_investigation",
  ];
  return text
    .split(/\r?\n/)
    .filter((line) => {
      if (/Meta-Cognitive Debug\/Repair Gate/i.test(line)) return false;
      if (/metacognitive_gate_/i.test(line)) return false;
      return !metaFields.some((field) => line.startsWith(`- ${field}:`));
    })
    .join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
