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
  const result = runCli([
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
  ]);
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
