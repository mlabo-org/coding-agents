import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "bin", "coding-agents.mjs");

test("runner commands require matching intake state before writing runner state", () => {
  const repo = makeTempGitRepo();
  try {
    const beforeIntake = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "state-safety",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--assignment",
      "make a scoped change",
      "--expected-output",
      "implementation packet",
    ]);
    assert.notEqual(beforeIntake.status, 0);
    assert.match(beforeIntake.stderr, /requires current intake state/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    intake(repo, { taskId: "state-safety", epoch: "e1", scope: "README.md" });

    const wrongTask = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "wrong-task",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--assignment",
      "make a scoped change",
      "--expected-output",
      "implementation packet",
    ]);
    assert.notEqual(wrongTask.status, 0);
    assert.match(wrongTask.stderr, /does not match current task state-safety/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    const assigned = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "state-safety",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--assignment",
      "make a scoped change",
      "--expected-output",
      "implementation packet",
    ]);
    assert.equal(assigned.status, 0, assigned.stderr);
    assert.match(readState(repo, "runner.md"), /type: assignment/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("handoff validates requested task id before printing the handoff body", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "handoff-current", epoch: "e1", scope: "README.md" });

    const wrong = runCli(["handoff", "--target-cwd", repo, "--task-id", "wrong-task"]);
    assert.notEqual(wrong.status, 0);
    assert.match(wrong.stderr, /does not match current task handoff-current/);
    assert.doesNotMatch(wrong.stdout, /# Handoff Prompt/);

    const current = runCli(["handoff", "--target-cwd", repo, "--task-id", "handoff-current"]);
    assert.equal(current.status, 0, current.stderr);
    assert.match(current.stdout, /# Handoff Prompt/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("identity isolation fields reject CR/LF injection before state writes", () => {
  const repo = makeTempGitRepo();
  try {
    for (const [field, value] of [
      ["--task-id", "identity\n- epoch: injected"],
      ["--epoch", "e1\r- scope: injected"],
      ["--scope", "README.md\n- task_id: injected"],
    ]) {
      const intakeArgs = [
        "intake",
        "--target-cwd",
        repo,
        "--task",
        "Add a focused workflow-state safety improvement",
        "--task-id",
        "identity-safe",
        "--epoch",
        "e1",
        "--scope",
        "README.md",
      ];
      intakeArgs[intakeArgs.indexOf(field) + 1] = value;
      const rejected = runCli(intakeArgs);
      assert.notEqual(rejected.status, 0, `${field} unexpectedly passed`);
      assert.match(rejected.stderr, /CR\/LF are not allowed/);
    }

    assert.equal(existsSync(path.join(repo, ".coding-agents")), false);

    intake(repo, { taskId: "identity-current", epoch: "e1", scope: "README.md" });
    const commands = [
      [
        "assign",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "identity-current\n- scope: injected",
        "--epoch",
        "e1",
        "--scope",
        "README.md",
        "--assignment",
        "make a scoped change",
        "--expected-output",
        "implementation packet",
      ],
      [
        "collect",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "identity-current",
        "--epoch",
        "e1\r- scope: injected",
        "--scope",
        "README.md",
        "--status",
        "blocked",
        "--blockers",
        "blocked by identity validation test",
        "--next-investigation",
        "retry with clean identity",
      ],
      [
        "run",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "identity-current",
        "--epoch",
        "e1",
        "--scope",
        "README.md\n- task_id: injected",
        "--assignment",
        "make a scoped change",
        "--expected-output",
        "runner packet",
      ],
      ["handoff", "--target-cwd", repo, "--task-id", "identity-current\n- scope: injected"],
    ];

    for (const args of commands) {
      const rejected = runCli(args);
      assert.notEqual(rejected.status, 0, `${args[0]} unexpectedly passed`);
      assert.match(rejected.stderr, /CR\/LF are not allowed/);
    }
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("validation rejects corrupted workflow state with injected identity fields", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "identity-state", epoch: "e1", scope: "README.md" });
    const taskPath = path.join(repo, ".coding-agents", "task.md");
    const task = readFileSync(taskPath, "utf8");
    writeFileSync(taskPath, task.replace("- task_id: identity-state", "- task_id: identity-state\n- task_id: injected"), "utf8");

    const verify = runCli(["verify-assignments", "--target-cwd", repo]);
    assert.notEqual(verify.status, 0);
    assert.match(verify.stdout, /invalid workflow identity fields/);

    const doctor = runCli(["doctor", "--target-cwd", repo]);
    assert.notEqual(doctor.status, 0);
    assert.match(doctor.stdout, /task_id duplicated/);

    const normalize = runCli(["normalize-debugging-integrity", "--target-cwd", repo]);
    assert.notEqual(normalize.status, 0);
    assert.match(normalize.stderr, /requires valid workflow identity fields/);

    const assign = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "identity-state",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--assignment",
      "make a scoped change",
      "--expected-output",
      "implementation packet",
    ]);
    assert.notEqual(assign.status, 0);
    assert.match(assign.stderr, /task_id duplicated/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("doctor verifies the target git info exclude without mutating it", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "exclude-check", epoch: "e1", scope: "README.md" });
    const excludePath = path.join(repo, ".git", "info", "exclude");
    const originalExclude = readFileSync(excludePath, "utf8");
    assert.match(originalExclude, /^\.coding-agents\/$/m);

    writeFileSync(excludePath, originalExclude.replace(/^\.coding-agents\/\n?/m, ""), "utf8");
    const missing = runCli(["doctor", "--target-cwd", repo]);
    assert.notEqual(missing.status, 0);
    assert.match(missing.stdout, /missing \.coding-agents\/ in/);
    assert.doesNotMatch(readFileSync(excludePath, "utf8"), /^\.coding-agents\/$/m);

    writeFileSync(excludePath, originalExclude, "utf8");
    const restored = runCli(["doctor", "--target-cwd", repo]);
    assert.equal(restored.status, 0, restored.stdout + restored.stderr);
    assert.match(restored.stdout, /ok \.coding-agents\/ ignored by git info exclude/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("intake describes fixed roles as scaffold, not resident agents", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "role-scaffold", epoch: "e1", scope: "README.md" });
    const assignments = readState(repo, "assignments.md");
    assert.match(assignments, /# Role Assignment Scaffold/);
    assert.match(assignments, /not resident agents or spawned workers/);
    assert.equal([...assignments.matchAll(/^## (?!Debugging|Meta-Cognitive|Nested)(.+)$/gm)].length, 14);
    assert.match(assignments, /- status: scaffolded/);

    const verify = runCli(["verify-assignments", "--target-cwd", repo]);
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);

    const doctor = runCli(["doctor", "--target-cwd", repo]);
    assert.equal(doctor.status, 0, doctor.stdout + doctor.stderr);
    assert.match(doctor.stdout, /14 role assignment scaffold sections present/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("feature profiles are optional overlays and do not change the fixed 14-role scaffold", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "profile-scaffold", epoch: "e1", scope: "README.md" });

    const assigned = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "profile-scaffold",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--feature-profile",
      "workflow.state-safety",
      "--assignment",
      "check workflow state append safety",
      "--expected-output",
      "assignment packet",
    ]);
    assert.equal(assigned.status, 0, assigned.stderr);

    const assignments = readState(repo, "assignments.md");
    assert.equal([...assignments.matchAll(/^## (?!Debugging|Meta-Cognitive|Nested)(.+)$/gm)].length, 14);
    assert.doesNotMatch(assignments, /workflow\.state-safety/);
    assert.doesNotMatch(assignments, /^## workflow\.state-safety$/m);

    const runner = readState(repo, "runner.md");
    assert.match(runner, /feature_profile: workflow\.state-safety/);
    assert.match(runner, /feature_profile_guidance: .*optional assignment overlay, not a resident agent or spawned worker/);
    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("valid feature profile renders in assignment, collect, and run skeleton packets", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "profile-render", epoch: "e1", scope: "README.md" });

    const assigned = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "profile-render",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--feature-profile",
      "debug.reproducer",
      "--assignment",
      "capture a reproduction",
      "--expected-output",
      "assignment packet",
    ]);
    assert.equal(assigned.status, 0, assigned.stderr);
    assert.match(assigned.stdout, /ok feature_profile: debug\.reproducer/);

    const collected = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "profile-render",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--feature-profile",
      "debug.reproducer",
      "--status",
      "blocked",
      "--findings",
      "reproduction needs a fixture",
      "--blockers",
      "fixture is not available",
      "--next",
      "parent decides fixture source",
    ]);
    assert.equal(collected.status, 0, collected.stderr);
    assert.match(collected.stdout, /ok feature_profile: debug\.reproducer/);

    const run = runCli([
      "orchestrate",
      "--target-cwd",
      repo,
      "--role",
      "Test Runner",
      "--task-id",
      "profile-render",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--feature-profile",
      "debug.reproducer",
      "--assignment",
      "record a runner skeleton",
      "--expected-output",
      "runner skeleton",
    ]);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /ok feature_profile: debug\.reproducer/);

    const runner = readState(repo, "runner.md");
    assert.match(runner, /type: assignment[\s\S]*feature_profile: debug\.reproducer/);
    assert.match(runner, /type: parent-integration[\s\S]*feature_profile: debug\.reproducer/);
    assert.match(runner, /type: process-orchestration-skeleton[\s\S]*feature_profile: debug\.reproducer/);
    assert.match(runner, /type: assignment[\s\S]*feature_profile: debug\.reproducer\n- work_type: auto/);
    assert.match(runner, /type: parent-integration[\s\S]*feature_profile: debug\.reproducer\n- work_type: auto/);
    assert.match(runner, /type: process-orchestration-skeleton[\s\S]*feature_profile: debug\.reproducer\n- work_type: auto/);
    assert.match(runner, /feature_profile_guidance: .*reproduce the expected versus actual behavior/);
    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("codex-cli runner prompt and result carry the feature profile overlay", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    intake(repo, { taskId: "profile-runner", epoch: "e1", scope: "README.md" });
    const fakeCodex = path.join(fakeBin, "codex");
    writeFileSync(fakeCodex, `#!/usr/bin/env node
const { writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
const prompt = args[args.length - 1] || "";
if (!prompt.includes("feature_profile: runner.scope-guard")) process.exit(7);
if (!prompt.includes("optional assignment overlay, not a resident agent or spawned worker")) process.exit(8);
const outputIndex = args.indexOf("--output-last-message");
if (outputIndex !== -1) writeFileSync(args[outputIndex + 1], "runner prompt included feature_profile: runner.scope-guard\\n", "utf8");
process.stdout.write("fake codex completed\\n");
`, "utf8");
    chmodSync(fakeCodex, 0o755);

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Test Runner",
      "--task-id",
      "profile-runner",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--feature-profile",
      "runner.scope-guard",
      "--assignment",
      "verify the prompt carries the feature profile",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /ok feature_profile: runner\.scope-guard/);
    const runner = readState(repo, "runner.md");
    assert.match(runner, /type: assignment[\s\S]*feature_profile: runner\.scope-guard/);
    assert.match(runner, /type: process-runner-result[\s\S]*feature_profile: runner\.scope-guard/);
    assert.match(runner, /summary: runner prompt included feature_profile: runner\.scope-guard/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("unknown feature profiles fail before runner state is appended", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "profile-reject", epoch: "e1", scope: "README.md" });

    for (const args of [
      [
        "assign",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "profile-reject",
        "--epoch",
        "e1",
        "--scope",
        "README.md",
        "--feature-profile",
        "debug.unknown",
        "--assignment",
        "make a scoped change",
        "--expected-output",
        "assignment packet",
      ],
      [
        "collect",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "profile-reject",
        "--epoch",
        "e1",
        "--scope",
        "README.md",
        "--feature-profile",
        "debug.unknown",
        "--status",
        "blocked",
        "--blockers",
        "unknown profile",
        "--next",
        "retry with known profile",
      ],
      [
        "run",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "profile-reject",
        "--epoch",
        "e1",
        "--scope",
        "README.md",
        "--feature-profile",
        "debug.unknown",
        "--assignment",
        "make a scoped change",
        "--expected-output",
        "runner packet",
      ],
    ]) {
      const rejected = runCli(args);
      assert.notEqual(rejected.status, 0, `${args[0]} unexpectedly passed`);
      assert.match(rejected.stderr, /unknown feature profile: debug\.unknown/);
      assert.match(rejected.stderr, /debug\.reproducer/);
      assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
    }
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("unknown work types fail before runner state is appended", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "work-type-reject", epoch: "e1", scope: "README.md" });

    for (const args of [
      [
        "assign",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "work-type-reject",
        "--epoch",
        "e1",
        "--scope",
        "README.md",
        "--work-type",
        "mystery",
        "--assignment",
        "make a scoped change",
        "--expected-output",
        "assignment packet",
      ],
      [
        "collect",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "work-type-reject",
        "--epoch",
        "e1",
        "--scope",
        "README.md",
        "--work-type",
        "mystery",
        "--status",
        "blocked",
        "--blockers",
        "unknown work type",
        "--next",
        "retry with known work type",
      ],
      [
        "run",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        "work-type-reject",
        "--epoch",
        "e1",
        "--scope",
        "README.md",
        "--work-type",
        "mystery",
        "--assignment",
        "make a scoped change",
        "--expected-output",
        "runner packet",
      ],
    ]) {
      const rejected = runCli(args);
      assert.notEqual(rejected.status, 0, `${args[0]} unexpectedly passed`);
      assert.match(rejected.stderr, /unknown work type: mystery/);
      assert.match(rejected.stderr, /auto, documentation, source-change, debug/);
      assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
    }
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("omitted feature profile remains backwards compatible and records none", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "profile-none", epoch: "e1", scope: "README.md" });

    const assigned = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "profile-none",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--assignment",
      "make a scoped change",
      "--expected-output",
      "assignment packet",
    ]);
    assert.equal(assigned.status, 0, assigned.stderr);
    assert.match(assigned.stdout, /ok feature_profile: none/);

    const collected = runCli([
      "collect",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "profile-none",
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
    const runner = readState(repo, "runner.md");
    assert.match(runner, /feature_profile: none/);
    assert.doesNotMatch(runner, /feature_profile_guidance:/);
    assert.equal(runCli(["verify-assignments", "--target-cwd", repo]).status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("runner packets without work_type remain backwards compatible", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "work-type-legacy", epoch: "e1", scope: "README.md" });
    writeFileSync(path.join(repo, ".coding-agents", "runner.md"), legacyRunnerWithoutWorkType("work-type-legacy"), "utf8");

    const verify = runCli(["verify-assignments", "--target-cwd", repo]);
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);
    const doctor = runCli(["doctor", "--target-cwd", repo]);
    assert.equal(doctor.status, 0, doctor.stdout + doctor.stderr);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("doctor does not treat trailing legacy runner packet identity as modern duplicates", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "legacy-boundary", epoch: "e1", scope: "README.md" });
    writeFileSync(path.join(repo, ".coding-agents", "runner.md"), modernPacketFollowedByLegacyRunnerPacket("legacy-boundary"), "utf8");

    const doctor = runCli(["doctor", "--target-cwd", repo]);
    assert.equal(doctor.status, 0, doctor.stdout + doctor.stderr);
    assert.doesNotMatch(doctor.stdout, /duplicated/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("doctor still reports duplicate identity fields inside a modern runner packet", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "runner-duplicate", epoch: "e1", scope: "README.md" });
    const runner = modernRunnerPacket("runner-duplicate")
      .replace("- task_id: runner-duplicate", "- task_id: runner-duplicate\n- task_id: duplicate");
    writeFileSync(path.join(repo, ".coding-agents", "runner.md"), runner, "utf8");

    const doctor = runCli(["doctor", "--target-cwd", repo]);
    assert.notEqual(doctor.status, 0);
    assert.match(doctor.stdout, /task_id duplicated/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("codex-cli runner fails when it writes outside the machine-checkable scope", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    intake(repo, { taskId: "runner-scope", epoch: "e1", scope: "allowed.txt" });
    const fakeCodex = path.join(fakeBin, "codex");
    writeFileSync(fakeCodex, `#!/usr/bin/env node
const { writeFileSync } = require("node:fs");
writeFileSync("outside.txt", "scope drift\\n", "utf8");
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
      "runner-scope",
      "--epoch",
      "e1",
      "--scope",
      "allowed.txt",
      "--assignment",
      "write only the allowed file",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /outside scope allowed\.txt/);
    const runner = readState(repo, "runner.md");
    assert.match(runner, /type: process-runner-result/);
    assert.match(runner, /status: failed/);
    assert.match(runner, /failure: runner changed files outside scope allowed\.txt: outside\.txt/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner refuses pre-existing dirty paths outside scope before appending or launching", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    intake(repo, { taskId: "runner-predirty", epoch: "e1", scope: "allowed.txt" });
    writeFileSync(path.join(repo, "outside.txt"), "already dirty\n", "utf8");
    const fakeCodex = path.join(fakeBin, "codex");
    writeFileSync(fakeCodex, `#!/usr/bin/env node
const { writeFileSync } = require("node:fs");
writeFileSync("launched.txt", "runner launched\\n", "utf8");
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
      "runner-predirty",
      "--epoch",
      "e1",
      "--scope",
      "allowed.txt",
      "--assignment",
      "write only the allowed file",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /dirty files outside scope allowed\.txt: outside\.txt/);
    assert.equal(existsSync(path.join(repo, "launched.txt")), false);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner rejects negative prose scope without blocking intake", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    const scope = "allowed.txt except outside.txt";
    intake(repo, { taskId: "runner-negative-scope", epoch: "e1", scope });
    const fakeCodex = path.join(fakeBin, "codex");
    writeFileSync(fakeCodex, `#!/usr/bin/env node
const { writeFileSync } = require("node:fs");
writeFileSync("launched.txt", "runner launched\\n", "utf8");
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
      "runner-negative-scope",
      "--epoch",
      "e1",
      "--scope",
      scope,
      "--assignment",
      "write only the allowed file",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /negative or exclusion wording is not supported/);
    assert.equal(existsSync(path.join(repo, "launched.txt")), false);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    const assign = runCli([
      "assign",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-negative-scope",
      "--epoch",
      "e1",
      "--scope",
      scope,
      "--assignment",
      "record the prose scope for a human worker",
      "--expected-output",
      "assignment packet",
    ]);
    assert.equal(assign.status, 0, assign.stderr);
    assert.match(readState(repo, "runner.md"), /type: assignment/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner accepts explicit scope:v1 paths grammar", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    const scope = `scope:v1 paths=README.md,${path.join(repo, "bin/coding-agents.mjs")},tests/`;
    intake(repo, { taskId: "runner-v1-paths", epoch: "e1", scope, workType: "documentation" });
    installFakeCodex(fakeBin, "fake codex completed\\n");

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-v1-paths",
      "--epoch",
      "e1",
      "--scope",
      scope,
      "--work-type",
      "documentation",
      "--assignment",
      "validate explicit machine paths grammar",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: pathWithFakeCodex(fakeBin),
    });

    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /ok runner: codex-cli/);
    assert.match(readState(repo, "runner.md"), /type: process-runner-result/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner accepts explicit scope:v1 all grammar as whole repo", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    const scope = "scope:v1 all";
    intake(repo, { taskId: "runner-v1-all", epoch: "e1", scope });
    installFakeCodex(fakeBin, "fake codex completed\\n", 'writeFileSync("anywhere.txt", "whole repo allowed\\n", "utf8");');

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-v1-all",
      "--epoch",
      "e1",
      "--scope",
      scope,
      "--assignment",
      "validate whole-repo machine grammar",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: pathWithFakeCodex(fakeBin),
    });

    assert.equal(run.status, 0, run.stderr);
    assert.equal(readFileSync(path.join(repo, "anywhere.txt"), "utf8"), "whole repo allowed\n");
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner rejects glob scope before appending or launching", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    const scope = "scope:v1 paths=*.md";
    intake(repo, { taskId: "runner-glob-reject", epoch: "e1", scope });
    installFakeCodex(fakeBin, "fake codex completed\\n", 'writeFileSync("launched.txt", "runner launched\\n", "utf8");');

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-glob-reject",
      "--epoch",
      "e1",
      "--scope",
      scope,
      "--assignment",
      "glob scope should fail before launch",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: pathWithFakeCodex(fakeBin),
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /globs, wildcards, or list punctuation are not supported/);
    assert.equal(existsSync(path.join(repo, "launched.txt")), false);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner rejects outside absolute and dot-dot scope before launch", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    installFakeCodex(fakeBin, "fake codex completed\\n", 'writeFileSync("launched.txt", "runner launched\\n", "utf8");');

    for (const [taskId, scope, expected] of [
      ["runner-absolute-reject", `scope:v1 paths=${path.join(os.tmpdir(), "outside-coding-agents.txt")}`, /absolute paths must resolve inside target cwd/],
      ["runner-dotdot-reject", "scope:v1 paths=../outside.txt", /\.\. escapes are not supported/],
    ]) {
      intake(repo, { taskId, epoch: "e1", scope, workType: "documentation" });
      const run = runCli([
        "run",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        taskId,
        "--epoch",
        "e1",
        "--scope",
        scope,
        "--assignment",
        "invalid scope should fail before launch",
        "--expected-output",
        "runner result",
        "--runner",
        "codex-cli",
      ], {
        env: pathWithFakeCodex(fakeBin),
      });

      assert.notEqual(run.status, 0, `${scope} unexpectedly passed`);
      assert.match(run.stderr, expected);
      assert.equal(existsSync(path.join(repo, "launched.txt")), false);
      assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
    }
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner preserves legacy simple path-only scopes", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    installFakeCodex(fakeBin, "fake codex completed\\n");

    for (const [index, scope] of [
      "README.md",
      "allowed/",
      "bin/coding-agents.mjs tests/workflow-state.test.mjs",
      ".",
      "repo",
      "whole repo",
    ].entries()) {
      const taskId = `runner-legacy-scope-${index}`;
      intake(repo, { taskId, epoch: "e1", scope, workType: "documentation" });
      const run = runCli([
        "run",
        "--target-cwd",
        repo,
        "--role",
        "Implementer",
        "--task-id",
        taskId,
        "--epoch",
        "e1",
        "--scope",
        scope,
        "--work-type",
        "documentation",
        "--assignment",
        "validate legacy simple path scope",
        "--expected-output",
        "runner result",
        "--runner",
        "codex-cli",
      ], {
        env: pathWithFakeCodex(fakeBin),
      });

      assert.equal(run.status, 0, `${scope}: ${run.stderr}`);
      assert.match(run.stdout, /ok runner: codex-cli/);
    }
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner rejects ambiguous legacy prose before appending or launching", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    const scope = "please edit README.md";
    intake(repo, { taskId: "runner-prose-reject", epoch: "e1", scope });
    installFakeCodex(fakeBin, "fake codex completed\\n", 'writeFileSync("launched.txt", "runner launched\\n", "utf8");');

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-prose-reject",
      "--epoch",
      "e1",
      "--scope",
      scope,
      "--assignment",
      "ambiguous prose should fail before launch",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: pathWithFakeCodex(fakeBin),
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /requires a machine-checkable path-only scope/);
    assert.equal(existsSync(path.join(repo, "launched.txt")), false);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner rejects legacy list punctuation before appending or launching", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    const scope = "README.md;tests/";
    intake(repo, { taskId: "runner-legacy-punctuation-reject", epoch: "e1", scope });
    installFakeCodex(fakeBin, "fake codex completed\\n", 'writeFileSync("launched.txt", "runner launched\\n", "utf8");');

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-legacy-punctuation-reject",
      "--epoch",
      "e1",
      "--scope",
      scope,
      "--assignment",
      "legacy punctuation should fail before launch",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: pathWithFakeCodex(fakeBin),
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /requires a machine-checkable path-only scope/);
    assert.equal(existsSync(path.join(repo, "launched.txt")), false);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner scope guard treats git rename source and destination as changed paths", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    commitFile(repo, "outside.txt", "tracked outside\n");
    intake(repo, { taskId: "runner-rename", epoch: "e1", scope: "allowed/" });
    const fakeCodex = path.join(fakeBin, "codex");
    writeFileSync(fakeCodex, `#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
mkdirSync("allowed", { recursive: true });
execFileSync("git", ["mv", "outside.txt", "allowed/outside.txt"]);
process.stdout.write("fake codex renamed\\n");
`, "utf8");
    chmodSync(fakeCodex, 0o755);

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-rename",
      "--epoch",
      "e1",
      "--scope",
      "allowed/",
      "--assignment",
      "write only under allowed",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /outside scope allowed\/: outside\.txt/);
    const runner = readState(repo, "runner.md");
    assert.match(runner, /type: process-runner-result/);
    assert.match(runner, /failure: runner changed files outside scope allowed\/: outside\.txt/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner scope guard handles rename paths with spaces", () => {
  const repo = makeTempGitRepo();
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), "coding-agents-fake-codex-"));
  try {
    commitFile(repo, "outside old name.txt", "tracked outside\n");
    intake(repo, { taskId: "runner-rename-spaces", epoch: "e1", scope: "allowed/" });
    const fakeCodex = path.join(fakeBin, "codex");
    writeFileSync(fakeCodex, `#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
mkdirSync("allowed", { recursive: true });
execFileSync("git", ["mv", "outside old name.txt", "allowed/new name.txt"]);
process.stdout.write("fake codex renamed\\n");
`, "utf8");
    chmodSync(fakeCodex, 0o755);

    const run = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-rename-spaces",
      "--epoch",
      "e1",
      "--scope",
      "allowed/",
      "--assignment",
      "write only under allowed",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
    ], {
      env: pathWithFakeCodex(fakeBin),
    });

    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /outside scope allowed\/: outside old name\.txt/);
    const runner = readState(repo, "runner.md");
    assert.match(runner, /failure: runner changed files outside scope allowed\/: outside old name\.txt/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("codex-cli runner validates runner name and timeout before appending assignment state", () => {
  const repo = makeTempGitRepo();
  try {
    intake(repo, { taskId: "runner-validation", epoch: "e1", scope: "README.md" });

    const badRunner = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-validation",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--assignment",
      "write only the readme",
      "--expected-output",
      "runner result",
      "--runner",
      "bad-runner",
    ]);
    assert.notEqual(badRunner.status, 0);
    assert.match(badRunner.stderr, /unknown runner: bad-runner/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);

    const badTimeout = runCli([
      "run",
      "--target-cwd",
      repo,
      "--role",
      "Implementer",
      "--task-id",
      "runner-validation",
      "--epoch",
      "e1",
      "--scope",
      "README.md",
      "--assignment",
      "write only the readme",
      "--expected-output",
      "runner result",
      "--runner",
      "codex-cli",
      "--timeout-ms",
      "0",
    ]);
    assert.notEqual(badTimeout.status, 0);
    assert.match(badTimeout.stderr, /invalid --timeout-ms: expected positive integer/);
    assert.equal(existsSync(path.join(repo, ".coding-agents", "runner.md")), false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

function intake(repo, options) {
  const args = [
    "intake",
    "--target-cwd",
    repo,
    "--task",
    "Add a focused workflow-state safety improvement",
    "--task-id",
    options.taskId,
    "--epoch",
    options.epoch,
    "--scope",
    options.scope,
  ];
  if (options.workType) args.splice(3, 0, "--work-type", options.workType);
  const result = runCli(args);
  assert.equal(result.status, 0, result.stderr);
}

function makeTempGitRepo() {
  const repo = mkdtempSync(path.join(os.tmpdir(), "coding-agents-workflow-"));
  const init = spawnSync("git", ["init"], { cwd: repo, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  return repo;
}

function commitFile(repo, file, contents) {
  writeFileSync(path.join(repo, file), contents, "utf8");
  assert.equal(spawnSync("git", ["config", "user.email", "coding-agents-test@example.com"], { cwd: repo, encoding: "utf8" }).status, 0);
  assert.equal(spawnSync("git", ["config", "user.name", "Coding Agents Test"], { cwd: repo, encoding: "utf8" }).status, 0);
  assert.equal(spawnSync("git", ["add", file], { cwd: repo, encoding: "utf8" }).status, 0);
  const commit = spawnSync("git", ["commit", "-m", `track ${file}`], { cwd: repo, encoding: "utf8" });
  assert.equal(commit.status, 0, commit.stderr);
}

function installFakeCodex(fakeBin, message, extraBody = "") {
  const fakeCodex = path.join(fakeBin, "codex");
  writeFileSync(fakeCodex, `#!/usr/bin/env node
const { writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output-last-message");
if (outputIndex !== -1) writeFileSync(args[outputIndex + 1], "${message}", "utf8");
${extraBody}
process.stdout.write("fake codex completed\\n");
`, "utf8");
  chmodSync(fakeCodex, 0o755);
}

function pathWithFakeCodex(fakeBin) {
  return {
    ...process.env,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
  };
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

function legacyRunnerWithoutWorkType(taskId) {
  return `# Coding Agents Runner

This file records legacy packets without work_type.

## Issued Assignments

### 2026-06-13T00:00:00.000Z Implementer ${taskId}

- type: assignment
- role: Implementer
- status: assigned
- task_id: ${taskId}
- epoch: e1
- scope: README.md
- feature_profile: none
- invocation_cwd: /tmp/legacy
- target_cwd: /tmp/legacy
- assignment: make a scoped documentation change
- expected_output: assignment packet
- nested_coding_agents_preflight: parent already selected Coding Agents
- debugging_integrity: debug work requires root cause and verification
- lifecycle: return concise parent-integration material, then stop

## Parent Integration Packets

### 2026-06-13T00:01:00.000Z Implementer ${taskId}

- type: parent-integration
- role: Implementer
- status: completed
- task_id: ${taskId}
- epoch: e1
- scope: README.md
- feature_profile: none
- invocation_cwd: /tmp/legacy
- target_cwd: /tmp/legacy
- findings: legacy packet completed documentation work
- changed_files: README.md
- verification: not run
- blockers: none
- assumptions: none
- next: parent final verification
- debugging_integrity: debug work requires root cause and verification
- lifecycle: Parent integrates this packet, records any blocker or follow-up, then closes or retires the subagent unless an explicitly scoped continuation is required.
`;
}

function modernRunnerPacket(taskId) {
  return `# Coding Agents Runner

## Issued Assignments

### 2026-06-13T00:00:00.000Z Implementer ${taskId}

- type: assignment
- role: Implementer
- status: assigned
- task_id: ${taskId}
- epoch: e1
- scope: README.md
- feature_profile: none
- work_type: auto
- invocation_cwd: /tmp/modern
- target_cwd: /tmp/modern
- assignment: make a scoped documentation change
- expected_output: assignment packet
- nested_coding_agents_preflight: parent already selected Coding Agents
- debugging_integrity: debug work requires root cause and verification
- lifecycle: return concise parent-integration material, then stop
`;
}

function modernPacketFollowedByLegacyRunnerPacket(taskId) {
  return `${modernRunnerPacket(taskId)}
## runner packet: legacy-import

- type: assignment
- role: Implementer
- task_id: legacy-task
- epoch: legacy-epoch
- scope: legacy-scope
- assignment: legacy docs/codex packet outside the modern section
- expected_output: legacy integration material
- debugging_integrity: legacy text outside modern packet
- lifecycle: legacy lifecycle outside modern packet
`;
}
