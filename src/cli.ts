#!/usr/bin/env node

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { runPrompts, buildConfigFromAnswers } from './prompts';
import { generate, runDxkit } from './generator';
import { printResults } from './files';
import { scanProject } from './detect';
import { runBrownfieldPrompts, buildBrownfieldResult } from './brownfield';
import { generateDevcontainer } from './generators/devcontainer';
import { writeConfig } from './config';
import { enableStealth } from './stealth';

const VERSION = '0.5.0';

const VALID_LANGUAGES = ['python', 'go', 'node', 'nextjs', 'rust', 'csharp'];
const VALID_INFRA = ['postgres', 'redis'];

/** Parse --lang python,go into a validated array. */
function parseLangs(raw: string | undefined): string[] {
  if (!raw) return [];
  const langs = raw.split(',').map((l) => l.trim().toLowerCase());
  for (const lang of langs) {
    if (!VALID_LANGUAGES.includes(lang)) {
      console.error(pc.red(`  Error: unknown language '${lang}'`));
      console.error(`  Valid: ${VALID_LANGUAGES.join(', ')}`);
      process.exit(1);
    }
  }
  return langs;
}

/** Parse --infra postgres,redis into a validated array. */
function parseInfra(raw: string | undefined): string[] {
  if (!raw) return [];
  const items = raw.split(',').map((l) => l.trim().toLowerCase());
  for (const item of items) {
    if (!VALID_INFRA.includes(item)) {
      console.error(pc.red(`  Error: unknown infrastructure '${item}'`));
      console.error(`  Valid: ${VALID_INFRA.join(', ')}`);
      process.exit(1);
    }
  }
  return items;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      yes: { type: 'boolean', short: 'y', default: false },
      stealth: { type: 'boolean', default: false },
      preset: { type: 'string', default: 'standard' },
      lang: { type: 'string' },
      infra: { type: 'string' },
      description: { type: 'string', short: 'd' },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    printHelp();
    return;
  }

  if (values.version) {
    console.log(`create-devstack v${VERSION}`);
    return;
  }

  const command = positionals[0];
  const isInit = command === 'init';
  const projectName = isInit ? path.basename(process.cwd()) : command;
  const nonInteractive = !!values.yes;
  const stealth = !!values.stealth;

  if (!projectName) {
    printHelp();
    process.exit(1);
  }

  const targetDir = isInit ? process.cwd() : path.resolve(projectName);

  console.log(`\n  ${pc.bold('create-devstack')} v${VERSION}\n`);

  if (isInit) {
    await runBrownfield(targetDir, nonInteractive, values.preset as string, stealth);
  } else {
    const langs = parseLangs(values.lang as string | undefined);
    const infra = parseInfra(values.infra as string | undefined);
    await runGreenfield(
      targetDir,
      projectName,
      nonInteractive,
      values.preset as string,
      langs,
      infra,
      (values.description as string) ?? '',
      stealth,
    );
  }
}

async function runGreenfield(
  targetDir: string,
  projectName: string,
  nonInteractive: boolean,
  preset: string,
  langs: string[],
  infra: string[],
  description: string,
  stealth: boolean,
): Promise<void> {
  if (fs.existsSync(targetDir)) {
    console.error(
      pc.red(`  Error: ${targetDir} already exists. Use 'init' for existing projects.`),
    );
    process.exit(1);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  let config;
  if (nonInteractive) {
    if (langs.length === 0) {
      console.error(pc.red('  Error: --yes requires --lang to specify languages.'));
      console.error(`  Example: --yes --lang python,go`);
      console.error(`  Valid: ${VALID_LANGUAGES.join(', ')}`);
      // Clean up the directory we just created
      fs.rmdirSync(targetDir);
      process.exit(1);
    }

    config = buildConfigFromAnswers(
      projectName,
      description,
      langs,
      infra,
      preset as 'strict' | 'standard' | 'relaxed',
      ['docker', 'github_cli', 'precommit', 'claude_code'],
    );
    console.log(`  ${pc.cyan('Non-interactive:')} ${langs.join(', ')}, ${preset} preset`);
  } else {
    config = await runPrompts(projectName);
  }

  const results = generate(targetDir, config);
  printResults(results);

  const dxkitRan = config.tools.claude_code ? runDxkit(targetDir, stealth) : false;

  if (stealth) {
    enableStealth(targetDir, results, dxkitRan);
  }

  console.log(`\n  ${pc.green('✓')} Done!\n`);
  console.log(`  Next steps:`);
  console.log(`    cd ${projectName}`);
  if (!stealth) {
    console.log(`    git init && git add -A && git commit -m "Initial commit"`);
  } else {
    console.log(`    git init  ${pc.dim('(generated files are gitignored)')}`);
  }
  console.log(`    make setup`);
  console.log(`    make doctor\n`);
}

async function runBrownfield(
  targetDir: string,
  nonInteractive: boolean,
  preset: string,
  stealth: boolean,
): Promise<void> {
  const scan = scanProject(targetDir);

  let config, strategy, genDevcontainer, shouldRunDxkit;

  if (nonInteractive) {
    const result = buildBrownfieldResult(
      targetDir,
      scan,
      preset as 'strict' | 'standard' | 'relaxed',
    );
    config = result.config;
    strategy = result.strategy;
    genDevcontainer = result.generateDevcontainer;
    shouldRunDxkit = result.runDxkit;

    const detectedLangs = Object.entries(config.languages ?? {})
      .filter(([, v]) => v?.enabled)
      .map(([k]) => k);
    console.log(
      `  ${pc.cyan('Non-interactive:')} detected ${detectedLangs.join(', ') || 'no languages'}, ${preset} preset`,
    );
  } else {
    const result = await runBrownfieldPrompts(targetDir, scan);
    config = result.config;
    strategy = result.strategy;
    genDevcontainer = result.generateDevcontainer;
    shouldRunDxkit = result.runDxkit;
  }

  const results = [];

  writeConfig(targetDir, config);
  results.push({ path: '.project.yaml', result: 'created' as const });

  if (genDevcontainer && config.tools.docker) {
    const devcontainerResults = generateDevcontainer(targetDir, config, strategy);
    results.push(...devcontainerResults);
  }

  printResults(results);

  const dxkitRan = shouldRunDxkit ? runDxkit(targetDir, stealth) : false;

  if (stealth) {
    enableStealth(targetDir, results, dxkitRan);
  }

  console.log(`\n  ${pc.green('✓')} Done!\n`);
  console.log(`  Next steps:`);
  console.log(`    make setup`);
  console.log(`    make doctor\n`);
}

function printHelp(): void {
  console.log(`
  ${pc.bold('create-devstack')} v${VERSION}

  ${pc.bold('Usage:')}
    npm create @vyuhlabs/devstack <project-name>   Create a new project
    npx @vyuhlabs/create-devstack init             Add to existing project

  ${pc.bold('Options:')}
    --yes, -y              Accept defaults, no prompts
    --lang <languages>     Languages: python,go,node,nextjs,rust,csharp
    --infra <services>     Infrastructure: postgres,redis
    --preset <name>        Quality preset: strict, standard (default), relaxed
    --stealth              Gitignore generated files (local-only, not committed)
    -d, --description <s>  Project description
    --version, -v          Show version
    --help, -h             Show this help

  ${pc.bold('Examples:')}
    npm create @vyuhlabs/devstack my-app                          Interactive
    npm create @vyuhlabs/devstack my-app --yes --lang python      Python project
    npm create @vyuhlabs/devstack my-app --yes --lang python,go --infra postgres
    npm create @vyuhlabs/devstack my-app --yes --lang node --preset strict
    npx @vyuhlabs/create-devstack init --yes                      Auto-detect
    npx @vyuhlabs/create-devstack init --yes --stealth            Local-only
`);
}

main().catch((err: Error) => {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
});
