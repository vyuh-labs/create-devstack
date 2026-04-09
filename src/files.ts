import * as fs from 'fs';
import * as path from 'path';
import { WriteResult, GenerationResult, ConflictStrategy } from './types';

/** Write a file to disk, respecting the conflict strategy. */
export function writeFile(
  targetDir: string,
  relativePath: string,
  content: string,
  strategy: ConflictStrategy = 'skip',
  executable = false,
): GenerationResult {
  const fullPath = path.join(targetDir, relativePath);
  const dir = path.dirname(fullPath);

  // Create parent directories
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let result: WriteResult;

  if (fs.existsSync(fullPath)) {
    if (strategy === 'skip') {
      return { path: relativePath, result: 'skipped' };
    }
    result = 'overwritten';
  } else {
    result = 'created';
  }

  fs.writeFileSync(fullPath, content, 'utf-8');

  if (executable) {
    fs.chmodSync(fullPath, 0o755);
  }

  return { path: relativePath, result };
}

/** Copy a file from the templates directory to the target. */
export function copyFile(
  templateDir: string,
  targetDir: string,
  relativePath: string,
  strategy: ConflictStrategy = 'skip',
  executable = false,
): GenerationResult {
  const src = path.join(templateDir, relativePath);
  const content = fs.readFileSync(src, 'utf-8');
  return writeFile(targetDir, relativePath, content, strategy, executable);
}

/** Print a summary of generation results. */
export function printResults(results: GenerationResult[]): void {
  for (const r of results) {
    const icon = r.result === 'created' ? '✓' : r.result === 'overwritten' ? '⟳' : '⊘';
    const label = r.result === 'skipped' ? `(skipped — already exists)` : `(${r.result})`;
    console.log(`  ${icon} ${r.path.padEnd(35)} ${label}`);
  }

  const created = results.filter((r) => r.result === 'created').length;
  const skipped = results.filter((r) => r.result === 'skipped').length;

  console.log(
    `\n  ${created} file${created !== 1 ? 's' : ''} created` +
      (skipped > 0 ? `, ${skipped} skipped` : '') +
      '.',
  );
}
