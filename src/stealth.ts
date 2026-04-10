import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { GenerationResult } from './types';

const STEALTH_HEADER = '# create-devstack (stealth mode — local only, not committed)';

/**
 * Add only the files that were actually created in this run to .gitignore.
 * Skipped files (already existed) are not added.
 */
export function enableStealth(
  targetDir: string,
  results: GenerationResult[],
  dxkitRan: boolean,
): void {
  const gitignorePath = path.join(targetDir, '.gitignore');

  let existing = '';
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, 'utf-8');
  }

  // Collect paths that were created (not skipped)
  const createdPaths = results.filter((r) => r.result === 'created').map((r) => r.path);

  // Collapse file paths into directory entries where possible
  // e.g. .devcontainer/Dockerfile.dev, .devcontainer/docker-compose.yml → .devcontainer/
  const dirs = new Set<string>();
  const files: string[] = [];

  for (const p of createdPaths) {
    const topDir = p.split('/')[0];
    if (p.includes('/') && topDir.startsWith('.')) {
      dirs.add(topDir + '/');
    } else {
      files.push(p);
    }
  }

  // Add dxkit-generated paths if dxkit ran
  if (dxkitRan) {
    // dxkit generates these top-level directories/files
    const dxkitPaths = ['.claude/', 'CLAUDE.md', '.ai/', '.vyuh-dxkit.json'];
    for (const p of dxkitPaths) {
      const fullPath = path.join(targetDir, p.replace(/\/$/, ''));
      if (fs.existsSync(fullPath)) {
        dirs.add(p.endsWith('/') ? p : '');
        if (!p.endsWith('/')) files.push(p);
      }
    }
  }

  // Build the list of entries to add, excluding anything already in .gitignore
  const existingLines = new Set(existing.split('\n').map((l) => l.trim()));
  const newEntries: string[] = [];

  for (const d of dirs) {
    if (!existingLines.has(d)) newEntries.push(d);
  }
  for (const f of files) {
    if (!existingLines.has(f)) newEntries.push(f);
  }

  if (newEntries.length === 0) {
    console.log(`  ${pc.yellow('⊘')} .gitignore already covers generated files`);
    return;
  }

  // Append stealth block
  const block = '\n' + STEALTH_HEADER + '\n' + newEntries.join('\n') + '\n';
  fs.appendFileSync(gitignorePath, block, 'utf-8');
  console.log(
    `  ${pc.green('✓')} .gitignore updated — ${newEntries.length} generated path${newEntries.length !== 1 ? 's' : ''} added (stealth mode)`,
  );
}
