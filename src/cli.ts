#!/usr/bin/env node

const VERSION = '0.1.0';

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`create-devstack v${VERSION}`);
    return;
  }

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
  create-devstack v${VERSION}

  Usage:
    npm create @vyuhlabs/devstack <project-name>   Create a new project
    npx @vyuhlabs/create-devstack init             Add to existing project

  Options:
    --version, -v    Show version
    --help, -h       Show this help
`);
    return;
  }

  // TODO: wire up prompts + generation
  const target = args[0];
  console.log(`Creating project: ${target}`);
  console.log('(not yet implemented)');
}

main();
