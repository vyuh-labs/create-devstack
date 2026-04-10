# @vyuhlabs/create-devstack

[![CI](https://github.com/vyuh-labs/create-devstack/actions/workflows/ci.yml/badge.svg)](https://github.com/vyuh-labs/create-devstack/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@vyuhlabs/create-devstack)](https://www.npmjs.com/package/@vyuhlabs/create-devstack)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Scaffold production-ready development environments for any project. Generates devcontainers, then delegates to [@vyuhlabs/dxkit](https://github.com/vyuh-labs/dxkit) for Makefiles, quality presets, CI workflows, and AI DX.

## Quick Start

```bash
# New project (greenfield)
npm create @vyuhlabs/devstack my-project

# Existing project (brownfield)
cd existing-project
npx @vyuhlabs/create-devstack init
```

## What It Does

An interactive wizard asks you to choose:

- **Languages** — Python, Go, Node.js, Next.js, Rust, C#
- **Infrastructure** — PostgreSQL, Redis
- **Quality preset** — Strict (95%), Standard (80%), Relaxed (60%)
- **Tools** — Devcontainer, GitHub Actions, Pre-commit, Claude Code, gcloud, Pulumi, Infisical

Then generates:

| What                      | Owner           | Description                                                   |
| ------------------------- | --------------- | ------------------------------------------------------------- |
| `.project.yaml`           | create-devstack | Your choices as config-as-code                                |
| `.devcontainer/`          | create-devstack | Dockerfile, docker-compose, devcontainer.json, post-create.sh |
| `Makefile`                | dxkit           | ~45 targets (test, quality, build, deploy, etc.)              |
| `.project/`               | dxkit           | Runtime scripts (quality, test, setup, session)               |
| Language configs          | dxkit           | pyproject.toml, go.mod, tsconfig.json, etc.                   |
| `.github/workflows/`      | dxkit           | CI and quality workflows                                      |
| `.pre-commit-config.yaml` | dxkit           | Language-conditional hooks                                    |
| `.claude/`                | dxkit           | AI agents, commands, skills, rules                            |

## How It Works

```
create-devstack
    │
    ├─ Interactive wizard → .project.yaml
    ├─ Devcontainer generator → .devcontainer/
    │
    └─ Calls: dxkit init --full
                 │
                 ├─ Reads .project.yaml
                 └─ Generates everything else
```

`create-devstack` handles the dev environment (containers). `dxkit` handles everything else (build system, quality, CI, AI DX). The handoff is via `.project.yaml` — create-devstack writes it, dxkit reads it.

## .project.yaml

The generated config file looks like:

```yaml
project:
  name: my-project
  description: A web API for managing inventory
languages:
  python:
    enabled: true
    version: '3.12'
    quality:
      coverage: 80
      lint: true
      typecheck: true
  go:
    enabled: true
    version: '1.24.0'
    quality:
      coverage: 80
      lint: true
infrastructure:
  postgres:
    enabled: true
    version: '16'
tools:
  claude_code: true
  docker: true
  precommit: true
  gcloud: false
```

## Brownfield (Existing Projects)

```bash
cd existing-project
npx @vyuhlabs/create-devstack init
```

The brownfield flow:

1. **Scans** your project — detects languages, versions, frameworks, test runners, infrastructure, and tools
2. **Shows** what it found and lets you confirm or adjust
3. **Respects** existing files — won't overwrite your `.devcontainer/`, `.claude/`, or configs
4. **Generates** only what's missing (`.project.yaml`, devcontainer, then delegates to dxkit)

If `.project.yaml` already exists, you can keep it or reconfigure. If it's malformed, create-devstack falls back to detection.

## Devcontainer

The generated `.devcontainer/` is fully conditional:

- **Dockerfile.dev** — Only installs languages you selected (Python, Go, Node, Rust)
- **docker-compose.yml** — Only includes services you need (PostgreSQL, Redis)
- **devcontainer.json** — VS Code extensions matched to your stack
- **post-create.sh** — Setup scripts for selected languages and tools

Works in GitHub Codespaces, local Docker, VS Code Remote Containers, JetBrains Gateway, or the devcontainer CLI.

## CLI Options

| Flag                  | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| `--yes`, `-y`         | Accept defaults, no prompts                                                     |
| `--lang <languages>`  | Languages: `python`, `go`, `node`, `nextjs`, `rust`, `csharp` (comma-separated) |
| `--infra <services>`  | Infrastructure: `postgres`, `redis` (comma-separated)                           |
| `--preset <name>`     | Quality preset: `strict`, `standard` (default), `relaxed`                       |
| `--stealth`           | Gitignore generated files (local-only, not committed)                           |
| `-d`, `--description` | Project description                                                             |
| `--version`, `-v`     | Show version                                                                    |
| `--help`, `-h`        | Show help                                                                       |

For greenfield, `--yes` requires `--lang` to specify at least one language. For brownfield (`init`), `--yes` auto-detects from the filesystem.

### Stealth Mode

Use `--stealth` to keep generated files local — they're added to `.gitignore` so they won't be committed. Only files actually created in this run are gitignored (existing files are never touched). Consistent with dxkit's `/stealth-mode`.

```bash
npx @vyuhlabs/create-devstack init --yes --stealth
```

### Examples

```bash
# Interactive
npm create @vyuhlabs/devstack my-app

# Python project, standard quality
npm create @vyuhlabs/devstack my-app --yes --lang python

# Multi-language with postgres
npm create @vyuhlabs/devstack my-app --yes --lang python,go --infra postgres

# Node project with strict quality
npm create @vyuhlabs/devstack my-app --yes --lang node --preset strict

# Brownfield — auto-detect, accept all
npx @vyuhlabs/create-devstack init --yes

# Brownfield — local-only (stealth)
npx @vyuhlabs/create-devstack init --yes --stealth
```

## After Setup

Once create-devstack and dxkit have generated your project, you get:

```bash
make help          # See all available commands
make doctor        # Verify your setup
make setup         # Install language tools + authenticate cloud services
make test          # Run tests
make quality       # Run linters + quality checks
make fix           # Auto-fix formatting and lint issues
make check         # Full pre-commit validation (quality + tests)
make session-start # Start an AI-assisted dev session (requires Claude Code)
```

Use Claude Code for AI-powered analysis:

```bash
/health            # 6-dimension codebase health audit
/vulnerabilities   # CWE-classified security scan
/quality           # Lint + AI review
/test-gaps         # Find untested critical code
/dev-report        # Developer activity report
```

See the [dxkit README](https://github.com/vyuh-labs/dxkit#readme) for the full list of 30+ commands and 20 agents.

## Requirements

- Node.js >= 18
- npm >= 9

## Development

```bash
git clone https://github.com/vyuh-labs/create-devstack.git
cd create-devstack
npm install
npm run build
npm test
```

### Scripts

| Script              | Description                 |
| ------------------- | --------------------------- |
| `npm run build`     | Compile TypeScript          |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint`      | ESLint                      |
| `npm run format`    | Prettier                    |
| `npm test`          | Vitest (watch mode)         |
| `npm run test:run`  | Vitest (single run)         |

### Git Hooks

- **Pre-commit**: lint + format staged files + typecheck
- **Pre-push**: run tests affected by changes (`vitest --changed`)

## Related

- [@vyuhlabs/dxkit](https://github.com/vyuh-labs/dxkit) — AI-native developer experience toolkit
- [codespaces-ai-template-v2](https://github.com/vyuh-labs/codespaces-ai-template-v2) — Legacy template (being replaced by this package)

## License

MIT
