import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { GenerationResult } from './types';

const STEALTH_HEADER = '# create-devstack (stealth mode — local only, not committed)';

/**
 * Add only the files that were actually created in this run to .gitignore.
 * Skipped files (already existed) are never touched.
 *
 * For dxkit files: reads .vyuh-dxkit.json manifest to get the exact list
 * of files dxkit generated, rather than guessing with fs.existsSync.
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

  // Collect paths that were created (not skipped) by create-devstack
  const createdPaths = results.filter((r) => r.result === 'created').map((r) => r.path);

  // Collapse file paths into directory entries where possible
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

  // Read dxkit's manifest to get its generated files
  if (dxkitRan) {
    const dxkitFiles = readDxkitManifest(targetDir);
    if (dxkitFiles.length > 0) {
      // Collapse into top-level directories
      for (const f of dxkitFiles) {
        const topDir = f.split('/')[0];
        if (f.includes('/') && topDir.startsWith('.')) {
          dirs.add(topDir + '/');
        } else {
          files.push(f);
        }
      }
    }
    // Always add the manifest itself
    files.push('.vyuh-dxkit.json');
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

/**
 * Read dxkit's manifest to get the list of files it generated.
 * Returns file paths relative to the project root.
 */
function readDxkitManifest(targetDir: string): string[] {
  const manifestPath = path.join(targetDir, '.vyuh-dxkit.json');
  if (!fs.existsSync(manifestPath)) return [];

  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);
    if (manifest.files && typeof manifest.files === 'object') {
      return Object.keys(manifest.files);
    }
  } catch {
    /* ignore parse errors */
  }

  return [];
}
