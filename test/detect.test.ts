import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanProject, formatDetection } from '../src/detect';

describe('scanProject', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-detect-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects an empty directory with no languages or files', () => {
    const scan = scanProject(tmpDir);
    expect(scan.stack.languages.python).toBe(false);
    expect(scan.stack.languages.go).toBe(false);
    expect(scan.existing.devcontainer).toBe(false);
    expect(scan.existing.makefile).toBe(false);
    expect(scan.existing.projectYaml).toBe(false);
  });

  it('detects Python from pyproject.toml', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"\n');
    const scan = scanProject(tmpDir);
    expect(scan.stack.languages.python).toBe(true);
  });

  it('detects Node from package.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' }),
    );
    const scan = scanProject(tmpDir);
    expect(scan.stack.languages.node).toBe(true);
  });

  it('detects Go from go.mod', () => {
    fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module example.com/test\ngo 1.22\n');
    const scan = scanProject(tmpDir);
    expect(scan.stack.languages.go).toBe(true);
    expect(scan.stack.versions.go).toBe('1.22');
  });

  it('detects existing devcontainer directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.devcontainer'));
    const scan = scanProject(tmpDir);
    expect(scan.existing.devcontainer).toBe(true);
  });

  it('detects existing Makefile', () => {
    fs.writeFileSync(path.join(tmpDir, 'Makefile'), '.PHONY: test\n');
    const scan = scanProject(tmpDir);
    expect(scan.existing.makefile).toBe(true);
  });

  it('detects existing .project.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, '.project.yaml'), 'project:\n  name: test\n');
    const scan = scanProject(tmpDir);
    expect(scan.existing.projectYaml).toBe(true);
  });

  it('detects existing .github/workflows', () => {
    fs.mkdirSync(path.join(tmpDir, '.github', 'workflows'), { recursive: true });
    const scan = scanProject(tmpDir);
    expect(scan.existing.githubWorkflows).toBe(true);
  });

  it('detects existing .claude directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    const scan = scanProject(tmpDir);
    expect(scan.existing.claudeDir).toBe(true);
  });
});

describe('formatDetection', () => {
  it('formats a detected stack nicely', () => {
    const scan = scanProject(fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-fmt-')));
    // Empty project — should not crash
    const output = formatDetection(scan);
    expect(typeof output).toBe('string');
  });

  it('includes detected languages', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-fmt-'));
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"\n');
    const scan = scanProject(tmpDir);
    const output = formatDetection(scan);
    expect(output).toContain('python');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
