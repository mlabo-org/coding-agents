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
    /generic coding, debug, source changes, delegation, and subagent coordination/i,
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
  assert.match(manifest.interface.shortDescription, /Explicit-only legacy Coding Agents workflow/i);
  assert.match(manifest.interface.longDescription, /Do not auto-route generic coding/i);
  assert.match(manifest.interface.longDescription, /CLI functionality remains unchanged/i);
  assert.ok(
    manifest.interface.defaultPrompt.every((prompt) =>
      /Coding Agents|\.coding-agents/.test(prompt),
    ),
    "every manifest prompt must name the explicit legacy workflow",
  );

  assert.ok(frontmatterDescription.length <= 320, "skill description must stay routing-budget concise");
  assert.match(frontmatterDescription.slice(0, 160), /names Coding Agents\/coding-agents/i);
  assert.match(frontmatterDescription.slice(0, 220), /\.coding-agents state/i);
  assert.match(frontmatterDescription, /^Coding Agents explicit-only legacy workflow\./);
  assert.match(frontmatterDescription, /Use only when the user names Coding Agents\/coding-agents/i);
  assert.match(frontmatterDescription, /Never auto-route generic coding, debug, source changes, delegation, or subagent coordination/i);

  const triggerBoundary = skill.match(/## Trigger Boundary\n\n([\s\S]*?)\n## Core Contract/);
  assert.ok(triggerBoundary, "SKILL.md must define Trigger Boundary before Core Contract");
  assert.match(triggerBoundary[1], /only when the user explicitly names `Coding Agents` or `coding-agents`/i);
  assert.match(triggerBoundary[1], /asks to continue, audit, or repair existing `\.coding-agents` workflow state or the Coding Agents source CLI/i);
  assert.match(triggerBoundary[1], /Never auto-route this skill for generic coding/i);
  assert.match(triggerBoundary[1], /changes discovery and selection only, not source CLI functionality/i);
  assert.doesNotMatch(triggerBoundary[1], /subagent development team coordination/i);
});

test("agents metadata uses a concise explicit-only prompt", () => {
  const metadata = read("agents/openai.yaml");
  const shortDescription = yamlScalar(metadata, "short_description");
  const defaultPrompt = yamlScalar(metadata, "default_prompt");

  assert.match(shortDescription, /^Explicit-only legacy Coding Agents workflow/i);
  assert.ok(defaultPrompt.length <= 240, "default_prompt must stay concise");
  assert.match(defaultPrompt, /Use Coding Agents only when I name Coding Agents\/coding-agents/i);
  assert.match(defaultPrompt, /continue, audit, or repair existing \.coding-agents state or its CLI/i);
  assert.match(defaultPrompt, /never auto-route generic coding, debug, source changes, delegation, or subagent coordination/i);
});
