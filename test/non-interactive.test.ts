import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildConfigFromAnswers } from '../src/prompts';
import { buildBrownfieldResult } from '../src/brownfield';
import { scanProject } from '../src/detect';
import { generate } from '../src/generator';

describe('non-interactive greenfield (--yes --lang)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-nointeract-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates a Python project', () => {
    const config = buildConfigFromAnswers('py-app', '', ['python'], [], 'standard', [
      'docker',
      'github_cli',
      'precommit',
      'claude_code',
    ]);

    const results = generate(tmpDir, config);
    expect(results.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpDir, '.project.yaml'))).toBe(true);

    const yaml = fs.readFileSync(path.join(tmpDir, '.project.yaml'), 'utf-8');
    expect(yaml).toContain('python');
  });

  it('generates a Go + Node project with postgres', () => {
    const config = buildConfigFromAnswers(
      'multi-app',
      'A multi-lang app',
      ['go', 'node'],
      ['postgres'],
      'standard',
      ['docker', 'claude_code'],
    );

    const results = generate(tmpDir, config);
    expect(fs.existsSync(path.join(tmpDir, '.devcontainer', 'Dockerfile.dev'))).toBe(true);

    const dockerfile = fs.readFileSync(
      path.join(tmpDir, '.devcontainer', 'Dockerfile.dev'),
      'utf-8',
    );
    expect(dockerfile).toContain('Go ');
    expect(dockerfile).toContain('Node.js');
    expect(dockerfile).toContain('postgresql-client');
    expect(dockerfile).not.toContain('Python');
  });

  it('uses strict preset', () => {
    const config = buildConfigFromAnswers('strict-app', '', ['python'], [], 'strict', [
      'docker',
      'claude_code',
    ]);
    expect(config.languages.python?.quality?.coverage).toBe(95);
  });

  it('uses relaxed preset', () => {
    const config = buildConfigFromAnswers('relaxed-app', '', ['rust'], [], 'relaxed', ['docker']);
    expect(config.languages.rust?.quality?.coverage).toBe(60);
  });

  it('supports all six languages', () => {
    const config = buildConfigFromAnswers(
      'all-langs',
      '',
      ['python', 'go', 'node', 'nextjs', 'rust', 'csharp'],
      ['postgres', 'redis'],
      'standard',
      ['docker', 'claude_code'],
    );

    expect(config.languages.python?.enabled).toBe(true);
    expect(config.languages.go?.enabled).toBe(true);
    expect(config.languages.node?.enabled).toBe(true);
    expect(config.languages.nextjs?.enabled).toBe(true);
    expect(config.languages.rust?.enabled).toBe(true);
    expect(config.languages.csharp?.enabled).toBe(true);
    expect(config.infrastructure.postgres?.enabled).toBe(true);
    expect(config.infrastructure.redis?.enabled).toBe(true);
  });
});

describe('non-interactive brownfield (--yes)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-nointeract-brown-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('auto-detects Python and generates config', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "my-api"\n');

    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.config.languages.python?.enabled).toBe(true);
    expect(result.generateDevcontainer).toBe(true);
    expect(result.strategy).toBe('skip');
  });

  it('skips devcontainer when it already exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"\n');
    fs.mkdirSync(path.join(tmpDir, '.devcontainer'));

    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.generateDevcontainer).toBe(false);
  });

  it('uses specified preset', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"\n');

    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan, 'strict');

    expect(result.config.languages.python?.quality?.coverage).toBe(95);
  });
});
