import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildConfigFromAnswers } from '../src/prompts';
import { generate } from '../src/generator';

describe('smoke test: full greenfield generation', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-smoke-'));

    // Simulate what the wizard produces
    const config = buildConfigFromAnswers(
      'smoke-test-app',
      'A smoke test project',
      ['python', 'go'],
      ['postgres'],
      'standard',
      ['docker', 'github_cli', 'precommit', 'claude_code'],
    );

    // Run the generator (devcontainer + .project.yaml)
    const results = generate(tmpDir, config);
    console.log(`Generated ${results.length} files in ${tmpDir}`);
  });

  afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── .project.yaml ──────────────────────────────────────────────

  it('creates .project.yaml', () => {
    const p = path.join(tmpDir, '.project.yaml');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('smoke-test-app');
    expect(content).toContain('python');
    expect(content).toContain('go');
  });

  // ── .devcontainer/ ─────────────────────────────────────────────

  it('creates Dockerfile.dev with Python + Go + Postgres', () => {
    const p = path.join(tmpDir, '.devcontainer/Dockerfile.dev');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('Python 3.12');
    expect(content).toContain('Go 1.24.0');
    expect(content).toContain('postgresql-client');
    expect(content).not.toContain('Node.js');
    expect(content).not.toContain('Rust');
    expect(content).not.toContain('{{'); // no unprocessed template vars
  });

  it('creates docker-compose.yml with postgres service', () => {
    const p = path.join(tmpDir, '.devcontainer/docker-compose.yml');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('postgres:16-alpine');
    expect(content).toContain('smoke_test_app_dev'); // DB_NAME
    expect(content).not.toContain('redis');
    expect(content).not.toContain('{{');
  });

  it('creates devcontainer.json with correct extensions', () => {
    const p = path.join(tmpDir, '.devcontainer/devcontainer.json');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('ms-python.python'); // Python ext
    expect(content).toContain('golang.go'); // Go ext
    expect(content).toContain('anthropic.claude-code'); // Claude Code
    expect(content).not.toContain('rust-lang.rust-analyzer');
    expect(content).not.toContain('{{');
  });

  it('creates post-create.sh with correct setup blocks', () => {
    const p = path.join(tmpDir, '.devcontainer/post-create.sh');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('Python environment');
    expect(content).toContain('Go development tools');
    expect(content).toContain('Waiting for PostgreSQL');
    expect(content).not.toContain('Node.js environment');
    expect(content).not.toContain('Rust environment');
    expect(content).not.toContain('{{');

    // Should be executable
    const stats = fs.statSync(p);
    expect(stats.mode & 0o111).toBeGreaterThan(0);
  });

  it('creates init-scripts/01-init.sql for postgres', () => {
    const p = path.join(tmpDir, '.devcontainer/init-scripts/01-init.sql');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('smoke_test_app_dev');
    expect(content).not.toContain('{{');
  });

  // ── No leftover template syntax ───────────────────────────────

  it('no file contains unprocessed {{VAR}} or {{#IF_}} syntax', () => {
    const devcontainerDir = path.join(tmpDir, '.devcontainer');
    const files = walkDir(devcontainerDir);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      // Allow ${{ (GitHub Actions syntax)
      const cleaned = content.replace(/\$\{\{/g, '');
      expect(cleaned).not.toMatch(/\{\{[A-Z]/);
      expect(cleaned).not.toMatch(/\{\{#/);
      expect(cleaned).not.toMatch(/\{\{\//);
    }
  });
});

/** Recursively list all files in a directory. */
function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}
