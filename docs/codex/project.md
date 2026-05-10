# Project Intake Summary

## Project

- Name: `coding-agents`
- Path: `/Users/suzukimakoto/plugins/coding-agents`
- Type: home-local Codex plugin source repository
- Plugin manifest: `.codex-plugin/plugin.json`
- Primary skill: `skills/coding-agents/SKILL.md`

## Purpose

`coding-agents` treats an arbitrary project cwd as the jobsite, performs project intake first, and coordinates a parent agent plus scoped specialist subagents for planning, execution material, verification material, and audit.

## Source Boundaries

- Source of truth: this repository under `/Users/suzukimakoto/plugins/coding-agents`
- Runtime/cache copy: `~/.codex/plugins/cache/` is not an edit target for this task.
- Marketplace registration: `~/.agents/plugins/marketplace.json` is intentionally out of scope for the initial commit and remains a TODO.

## Initial Repository State

At initialization time, the directory existed but was not yet a Git repository and contained no tracked plugin files.

## Current Capability

This initial version provides a manifest, a single operational skill, and Codex-facing planning/audit documents. It does not yet include MCP servers, app connectors, hooks, scripts, or concrete subagent runner code.
