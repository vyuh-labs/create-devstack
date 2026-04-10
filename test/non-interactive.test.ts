import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildConfigFromAnswers } from '../src/prompts';
import { buildBrownfieldResult } from '../src/brownfield';
import { scanProject } from '../src/detect';
import { generate } from '../src/generator';

describe('non-interactive greenfield (--yes)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-nointeract-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates a project with default config', () => {
    const config = buildConfigFromAnswers('auto-project', '', ['python'], [], 'standard', [
      'docker',
      'github_cli',
      'precommit',
      'claude_code',
    ]);

    const results = generate(tmpDir, config);
    expect(results.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpDir, '.project.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.devcontainer', 'Dockerfile.dev'))).toBe(true);
  });

  it('uses strict preset when specified', () => {
    const config = buildConfigFromAnswers('strict-project', '', ['python'], [], 'strict', [
      'docker',
      'claude_code',
    ]);

    expect(config.languages.python?.quality?.coverage).toBe(95);
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
