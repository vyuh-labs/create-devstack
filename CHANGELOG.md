# Changelog

All notable changes to `@vyuhlabs/create-devstack` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-04-09

### Added
- **`--lang` flag** — specify languages for greenfield: `--lang python,go`
- **`--infra` flag** — specify infrastructure: `--infra postgres,redis`
- **`-d`/`--description` flag** — set project description
- Validation: `--yes` now requires `--lang` for greenfield (no more
  surprising defaults). Brownfield `--yes` still auto-detects.
- Clear error messages for invalid language/infra names.

## [0.3.0] - 2026-04-09

### Added
- **`--yes` flag** for non-interactive mode. Greenfield defaults to
  Python + standard preset + default tools. Brownfield auto-accepts
  detected stack. Both support `--preset` flag (strict/standard/relaxed).
- Proper argument parsing via `parseArgs`.
- CLI `--help` with usage examples.
- Documentation: CLI Options section in README, updated CONTRIBUTING
  architecture diagram.

## [0.2.0] - 2026-04-09

### Added
- **Brownfield flow** — `npx @vyuhlabs/create-devstack init` on existing
  projects. Detects languages, frameworks, infrastructure, and tools via
  dxkit's `detect()`. Presents detected stack for user confirmation.
  Handles existing `.project.yaml` (keep/reconfigure), existing
  `.devcontainer/` (skip), and malformed configs (fallback to detection).
- **Detection module** — wraps dxkit's `detect()` with file-exists checks
  for devcontainer, Makefile, CI workflows, .claude/, etc.
- **Brownfield prompts** — confirm/adjust detected stack, conflict strategy,
  selective generation (skip existing devcontainer/.claude/).

## [0.1.0] - 2026-04-09

### Added
- **Greenfield flow** — `npm create @vyuhlabs/devstack <project-name>`.
  Interactive wizard for language, infrastructure, quality preset, and
  tool selection.
- **Devcontainer generator** — Dockerfile.dev, docker-compose.yml,
  devcontainer.json, post-create.sh with conditional language/infra/tool
  blocks. Supports Python, Go, Node.js, Next.js, Rust, C#, PostgreSQL,
  Redis.
- **`.project.yaml` generation** — config-as-code from wizard answers.
  Quality presets: strict (95%), standard (80%), relaxed (60%).
- **dxkit integration** — calls `dxkit init --full` after generation.
  dxkit reads `.project.yaml` and generates Makefile, scripts, CI, configs,
  `.claude/`.
- **Template engine** — imports `processTemplate()` from `@vyuhlabs/dxkit`.
- Package skeleton: TypeScript, ESLint, Prettier, Vitest, husky + lint-staged.
- CI workflow + publish workflow (GitHub Actions, npm provenance).
