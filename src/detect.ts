import * as fs from 'fs';
import * as path from 'path';
import { detect, DetectedStack } from '@vyuhlabs/dxkit';

/** Extended detection results for brownfield — includes existing file checks. */
export interface BrownfieldScan {
  /** Stack detection from dxkit (languages, infra, tools, versions, etc.) */
  stack: DetectedStack;
  /** Files/directories that already exist in the project */
  existing: {
    devcontainer: boolean;
    makefile: boolean;
    projectYaml: boolean;
    projectDir: boolean;
    githubWorkflows: boolean;
    precommit: boolean;
    gitignore: boolean;
    readme: boolean;
    editorconfig: boolean;
    claudeDir: boolean;
  };
}

/** Scan an existing project for brownfield init. */
export function scanProject(cwd: string): BrownfieldScan {
  const stack = detect(cwd);

  return {
    stack,
    existing: {
      devcontainer: fs.existsSync(path.join(cwd, '.devcontainer')),
      makefile: fs.existsSync(path.join(cwd, 'Makefile')),
      projectYaml: fs.existsSync(path.join(cwd, '.project.yaml')),
      projectDir: fs.existsSync(path.join(cwd, '.project')),
      githubWorkflows: fs.existsSync(path.join(cwd, '.github', 'workflows')),
      precommit: fs.existsSync(path.join(cwd, '.pre-commit-config.yaml')),
      gitignore: fs.existsSync(path.join(cwd, '.gitignore')),
      readme: fs.existsSync(path.join(cwd, 'README.md')),
      editorconfig: fs.existsSync(path.join(cwd, '.editorconfig')),
      claudeDir: fs.existsSync(path.join(cwd, '.claude')),
    },
  };
}

/** Format detected stack as a human-readable summary. */
export function formatDetection(scan: BrownfieldScan): string {
  const lines: string[] = [];
  const { stack, existing } = scan;

  // Languages
  const langs = Object.entries(stack.languages)
    .filter(([, v]) => v)
    .map(([k]) => {
      const version = stack.versions[k as keyof typeof stack.versions];
      return version ? `${k} ${version}` : k;
    });
  if (langs.length) lines.push(`  Languages:  ${langs.join(', ')}`);

  // Framework
  if (stack.framework) lines.push(`  Framework:  ${stack.framework}`);

  // Test runner
  if (stack.testRunner) lines.push(`  Tests:      ${stack.testRunner.framework}`);

  // Infrastructure
  const infra = Object.entries(stack.infrastructure)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (infra.length) lines.push(`  Infra:      ${infra.join(', ')}`);

  // Tools
  const tools = Object.entries(stack.tools)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (tools.length) lines.push(`  Tools:      ${tools.join(', ')}`);

  // Existing files
  const existingFiles = Object.entries(existing)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (existingFiles.length) lines.push(`  Existing:   ${existingFiles.join(', ')}`);

  return lines.join('\n');
}
