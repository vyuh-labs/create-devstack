#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { runPrompts } from './prompts';
import { generate, runDxkit } from './generator';
import { printResults } from './files';
import { scanProject } from './detect';
import { runBrownfieldPrompts } from './brownfield';
import { generateDevcontainer } from './generators/devcontainer';
import { writeConfig } from './config';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`create-devstack v${VERSION}`);
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Determine mode: greenfield (name arg) or brownfield (init)
  const isInit = args[0] === 'init';
  const projectName = isInit ? path.basename(process.cwd()) : args[0];

  if (!projectName) {
    printHelp();
    process.exit(1);
  }

  const targetDir = isInit ? process.cwd() : path.resolve(projectName);

  console.log(`\n  ${pc.bold('create-devstack')} v${VERSION}\n`);

  if (isInit) {
    // Brownfield: existing project
    await runBrownfield(targetDir);
  } else {
    // Greenfield: new project
    await runGreenfield(targetDir, projectName);
  }
}

async function runGreenfield(targetDir: string, projectName: string): Promise<void> {
  if (fs.existsSync(targetDir)) {
    console.error(
      pc.red(`  Error: ${targetDir} already exists. Use 'init' for existing projects.`),
    );
    process.exit(1);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const config = await runPrompts(projectName);
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

async function runBrownfield(targetDir: string): Promise<void> {
  const scan = scanProject(targetDir);
  const {
    config,
    strategy,
    generateDevcontainer: genDevcontainer,
    runDxkit: shouldRunDxkit,
  } = await runBrownfieldPrompts(targetDir, scan);

  const results = [];

  // Write .project.yaml (always — it's the config source for dxkit)
  writeConfig(targetDir, config);
  results.push({ path: '.project.yaml', result: 'created' as const });

  // Generate devcontainer if requested
  if (genDevcontainer && config.tools.docker) {
    const devcontainerResults = generateDevcontainer(targetDir, config, strategy);
    results.push(...devcontainerResults);
  }

  printResults(results);

  // Run dxkit if requested
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

  Usage:
    npm create @vyuhlabs/devstack <project-name>   Create a new project
    npx @vyuhlabs/create-devstack init             Add to existing project

  Options:
    --version, -v    Show version
    --help, -h       Show this help
`);
}

main().catch((err: Error) => {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
});
