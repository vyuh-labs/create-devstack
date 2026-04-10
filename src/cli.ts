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

const VERSION = '0.2.0';

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      yes: { type: 'boolean', short: 'y', default: false },
      preset: { type: 'string', default: 'standard' },
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

  if (!projectName) {
    printHelp();
    process.exit(1);
  }

  const targetDir = isInit ? process.cwd() : path.resolve(projectName);

  console.log(`\n  ${pc.bold('create-devstack')} v${VERSION}\n`);

  if (isInit) {
    await runBrownfield(targetDir, nonInteractive, values.preset as string);
  } else {
    await runGreenfield(targetDir, projectName, nonInteractive, values.preset as string);
  }
}

async function runGreenfield(
  targetDir: string,
  projectName: string,
  nonInteractive: boolean,
  preset: string,
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
    // Default greenfield: Python + standard preset + all default tools
    config = buildConfigFromAnswers(
      projectName,
      '',
      ['python'],
      [],
      preset as 'strict' | 'standard' | 'relaxed',
      ['docker', 'github_cli', 'precommit', 'claude_code'],
    );
    console.log(`  ${pc.cyan('Non-interactive mode:')} Python, ${preset} preset`);
  } else {
    config = await runPrompts(projectName);
  }

  const results = generate(targetDir, config);
  printResults(results);

  if (config.tools.claude_code) {
    runDxkit(targetDir);
  }

  console.log(`\n  ${pc.green('✓')} Done!\n`);
  console.log(`  Next steps:`);
  console.log(`    cd ${projectName}`);
  console.log(`    git init && git add -A && git commit -m "Initial commit"`);
  console.log(`    make setup`);
  console.log(`    make doctor\n`);
}

async function runBrownfield(
  targetDir: string,
  nonInteractive: boolean,
  preset: string,
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

    console.log(`  ${pc.cyan('Non-interactive mode:')} accepting detected stack, ${preset} preset`);
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

  if (shouldRunDxkit) {
    runDxkit(targetDir);
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
    --yes, -y        Accept defaults, no prompts
    --preset <name>  Quality preset: strict, standard, relaxed (default: standard)
    --version, -v    Show version
    --help, -h       Show this help

  ${pc.bold('Examples:')}
    npm create @vyuhlabs/devstack my-app                    Interactive
    npm create @vyuhlabs/devstack my-app --yes              Non-interactive, defaults
    npx @vyuhlabs/create-devstack init --yes                Auto-detect, accept all
    npx @vyuhlabs/create-devstack init --yes --preset strict  Auto-detect, strict quality
`);
}

main().catch((err: Error) => {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
});
