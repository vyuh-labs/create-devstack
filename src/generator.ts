import { execSync } from 'child_process';
import pc from 'picocolors';
import { ProjectConfig, GenerationResult, ConflictStrategy } from './types';
import { writeConfig } from './config';
import { generateDevcontainer } from './generators/devcontainer';
import { printResults } from './files';

/** Run the full generation pipeline. */
export function generate(
  targetDir: string,
  config: ProjectConfig,
  strategy: ConflictStrategy = 'skip',
): GenerationResult[] {
  const results: GenerationResult[] = [];

  // 1. Write .project.yaml
  writeConfig(targetDir, config);
  results.push({ path: '.project.yaml', result: 'created' });

  // 2. Generate devcontainer (if docker enabled)
  if (config.tools.docker) {
    const devcontainerResults = generateDevcontainer(targetDir, config, strategy);
    results.push(...devcontainerResults);
  }

  return results;
}

/** Call dxkit init --full to generate Makefile, scripts, configs, .claude/, etc. */
export function runDxkit(targetDir: string, stealth = false): boolean {
  const flags = ['--full', '--detect', '--yes'];
  if (stealth) flags.push('--stealth');

  const cmd = `npx @vyuhlabs/dxkit init ${flags.join(' ')}`;
  console.log(`\n  Running ${pc.cyan(cmd)}...`);

  try {
    execSync(cmd, {
      cwd: targetDir,
      stdio: 'pipe',
    });
    console.log(`  ${pc.green('✓')} dxkit initialized (.claude/, Makefile, configs, scripts)`);
    return true;
  } catch {
    console.log(
      `  ${pc.yellow('⚠')} dxkit init failed — run manually: npx @vyuhlabs/dxkit init --full`,
    );
    return false;
  }
}

/** Run generation and print results. */
export function runGeneration(
  targetDir: string,
  config: ProjectConfig,
  strategy: ConflictStrategy = 'skip',
): void {
  const results = generate(targetDir, config, strategy);
  printResults(results);
}
