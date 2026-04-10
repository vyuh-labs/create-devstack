# Contributing to create-devstack

## Getting Started

```bash
git clone https://github.com/vyuh-labs/create-devstack.git
cd create-devstack
npm install
```

## Development Workflow

```bash
npm run build          # Compile TypeScript
npm run typecheck      # Type-check without emitting
npm run lint           # ESLint (--max-warnings 0)
npm run format:check   # Prettier check
npm run test:run       # Run tests once
npm test               # Run tests in watch mode
```

## Architecture

```
src/
  cli.ts                 # Entry point, argument parsing
  index.ts               # Public API exports
  types.ts               # Type definitions (.project.yaml schema)
  prompts.ts             # Interactive wizard
  config.ts              # .project.yaml read/write
  presets.ts              # Quality presets (strict/standard/relaxed)
  template-engine.ts     # Wrapper over dxkit's processTemplate
  generator.ts           # Orchestrates generation pipeline
  files.ts               # File write utilities (skip/overwrite)
  generators/
    devcontainer.ts      # .devcontainer/ generation

templates/
  devcontainer/          # Template files with {{VAR}} + {{#IF_X}} syntax

test/
  smoke.test.ts          # End-to-end greenfield test
  devcontainer.test.ts   # Devcontainer generator tests
  template-engine.test.ts
  config.test.ts
  presets.test.ts
  prompts.test.ts
```

## How Generation Works

1. Interactive wizard collects user choices
2. `buildConfigFromAnswers()` creates a `ProjectConfig`
3. `generate()` writes `.project.yaml` + runs devcontainer generator
4. `runDxkit()` calls `dxkit init --full` which reads `.project.yaml`

## Git Hooks

Pre-commit and pre-push hooks are configured via husky:

- **Pre-commit**: `lint-staged` (eslint + prettier on staged files) + `tsc --noEmit`
- **Pre-push**: `vitest run --changed` (only tests affected by your changes)

## Adding a Template

Template files go in `templates/devcontainer/` and use:

- `{{VAR_NAME}}` — variable substitution
- `{{#IF_CONDITION}}...{{/IF_CONDITION}}` — conditional blocks
- `{{#IF_CONDITION}}...{{#ELSE}}...{{/IF_CONDITION}}` — if/else

Variables and conditions are built from `ProjectConfig` in `template-engine.ts`.

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes with tests
3. Ensure `npm run typecheck && npm run lint && npm run test:run` passes
4. Submit a PR with a clear description

## Code Style

- TypeScript strict mode
- ESLint flat config with `typescript-eslint`
- Prettier (single quotes, trailing commas, 100 char width)
- No runtime dependencies beyond the four listed in package.json
