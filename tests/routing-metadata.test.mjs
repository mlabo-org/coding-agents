import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function yamlScalar(document, key) {
  const match = document.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  assert.ok(match, `${key} must be a single-line YAML scalar`);
  return match[1].trim();
}

test("discovery metadata keeps Coding Agents explicit-only", () => {
  const manifest = JSON.parse(read(".codex-plugin/plugin.json"));
  const skill = read("skills/coding-agents/SKILL.md");
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(frontmatter, "SKILL.md must have YAML frontmatter");
  const frontmatterLines = frontmatter[1].split("\n");
  const descriptionStart = frontmatterLines.indexOf("description: >-");
  assert.notEqual(descriptionStart, -1, "SKILL.md must use a folded description");
  const frontmatterDescription = frontmatterLines
    .slice(descriptionStart + 1)
    .filter((line) => line.startsWith("  "))
    .map((line) => line.trim())
    .join(" ");

  assert.match(manifest.description, /Coding Agents explicit-only legacy workflow/i);
  assert.match(manifest.description, /Primary route:/);
  assert.match(manifest.description, /Fallback:/);
  assert.match(
    manifest.description,
    /generic coding, debug, source changes, delegation, or subagent coordination/i,
  );
  assert.deepEqual(manifest.keywords, [
    "coding-agents",
    ".coding-agents",
    "coding-agents-cli",
    "coding-agents-continuation",
    "coding-agents-audit",
    "coding-agents-repair",
    "legacy-coding-agents",
  ]);
  assert.deepEqual(manifest.interface.capabilities, [
    "Coding Agents State",
    "Coding Agents CLI",
    "Coding Agents Continuation",
    "Coding Agents Audit/Repair",
  ]);
  assert.match(manifest.interface.shortDescription, /Explicit-only legacy Coding Agents state\/CLI workflow/i);
  assert.match(manifest.interface.longDescription, /Do not auto-route generic coding/i);
  assert.match(manifest.interface.longDescription, /record-only run\/orchestrate remain available/i);
  assert.match(manifest.interface.longDescription, /only through official Codex subagent spawn tools/i);
  assert.match(manifest.interface.longDescription, /never launches codex exec/i);
  assert.ok(
    manifest.interface.defaultPrompt.every((prompt) =>
      /Coding Agents|\.coding-agents/.test(prompt),
    ),
    "every manifest prompt must name the explicit legacy workflow",
  );

  assert.ok(frontmatterDescription.length <= 320, "skill description must stay routing-budget concise");
  assert.match(frontmatterDescription.slice(0, 180), /\.coding-agents state\/CLI/i);
  assert.match(frontmatterDescription, /^Coding Agents explicit-only legacy workflow\./);
  assert.match(frontmatterDescription, /Use only when named or continuing, auditing, or repairing/i);
  assert.match(frontmatterDescription, /official Codex subagent spawn tools; never CLI runners/i);
  assert.match(frontmatterDescription, /Never auto-route generic coding, debugging, source edits, delegation, or subagent coordination/i);

  const triggerBoundary = skill.match(/## Trigger Boundary\n\n([\s\S]*?)\n## Core Contract/);
  assert.ok(triggerBoundary, "SKILL.md must define Trigger Boundary before Core Contract");
  assert.match(triggerBoundary[1], /only when the user explicitly names `Coding Agents` or `coding-agents`/i);
  assert.match(triggerBoundary[1], /asks to continue, audit, or repair existing `\.coding-agents` workflow state or the Coding Agents source CLI/i);
  assert.match(triggerBoundary[1], /Never auto-route this skill for generic coding/i);
  assert.match(triggerBoundary[1], /changes discovery and selection only/i);
  assert.match(triggerBoundary[1], /record workflow packets and never launch a worker process/i);
  assert.doesNotMatch(triggerBoundary[1], /subagent development team coordination/i);
});

test("agents metadata uses a concise explicit-only prompt", () => {
  const metadata = read("agents/openai.yaml");
  const skillMetadata = read("skills/coding-agents/agents/openai.yaml");
  const shortDescription = yamlScalar(metadata, "short_description");
  const defaultPrompt = yamlScalar(metadata, "default_prompt");

  assert.match(shortDescription, /^Explicit-only legacy Coding Agents state\/CLI workflow/i);
  assert.ok(defaultPrompt.length <= 240, "default_prompt must stay concise");
  assert.match(defaultPrompt, /Use Coding Agents when I name it or continue, audit, or repair \.coding-agents state or its CLI/i);
  assert.match(defaultPrompt, /official Codex subagent spawn tools; never use a CLI runner/i);
  assert.match(defaultPrompt, /Never auto-route generic coding or delegation/i);

  assert.match(skillMetadata, /^interface:\n/m);
  assert.match(skillMetadata, /^  short_description: Explicit-only Coding Agents state and CLI workflow$/m);
  assert.match(skillMetadata, /^  default_prompt: Use \$coding-agents only when explicitly named/m);
  assert.match(skillMetadata, /official Codex subagent spawn tools; never use a CLI runner/i);
  assert.match(skillMetadata, /^  allow_implicit_invocation: false$/m);
});

test("source CLI has no Codex process-runner route", () => {
  const cli = read("bin/coding-agents.mjs");

  assert.doesNotMatch(cli, /(?:spawnSync|execFileSync)\s*\(\s*["']codex["']/);
  assert.doesNotMatch(cli, /\brunCodexCli\b|\brenderRunnerPrompt\b|--output-last-message/);
  assert.match(cli, /--runner and --timeout-ms are unsupported/);
  assert.match(cli, /this CLI never launches Codex workers; use the official Codex subagent spawn tools/);
  assert.match(cli, /record-only; dispatch subagents through the official Codex spawn tools outside this CLI/);
});
