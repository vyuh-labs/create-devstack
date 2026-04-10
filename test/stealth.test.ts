import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { enableStealth } from '../src/stealth';
import { GenerationResult } from '../src/types';

describe('enableStealth', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-stealth-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .gitignore with created file paths', () => {
    const results: GenerationResult[] = [
      { path: '.project.yaml', result: 'created' },
      { path: '.devcontainer/Dockerfile.dev', result: 'created' },
      { path: '.devcontainer/docker-compose.yml', result: 'created' },
    ];

    enableStealth(tmpDir, results, false);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.project.yaml');
    expect(gitignore).toContain('.devcontainer/');
    expect(gitignore).toContain('stealth mode');
  });

  it('does not add skipped files', () => {
    const results: GenerationResult[] = [
      { path: '.project.yaml', result: 'created' },
      { path: '.devcontainer/Dockerfile.dev', result: 'skipped' },
    ];

    enableStealth(tmpDir, results, false);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.project.yaml');
    expect(gitignore).not.toContain('.devcontainer/');
  });

  it('adds dxkit paths when dxkit ran', () => {
    // Simulate dxkit having created these
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Context');
    fs.mkdirSync(path.join(tmpDir, '.ai'));
    fs.writeFileSync(path.join(tmpDir, '.vyuh-dxkit.json'), '{}');

    enableStealth(tmpDir, [], true);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claude/');
    expect(gitignore).toContain('CLAUDE.md');
    expect(gitignore).toContain('.ai/');
    expect(gitignore).toContain('.vyuh-dxkit.json');
  });

  it('does not add dxkit paths that do not exist', () => {
    // dxkit "ran" but nothing was created (maybe it failed)
    enableStealth(tmpDir, [], true);

    const gitignorePath = path.join(tmpDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      expect(gitignore).not.toContain('.claude/');
    }
  });

  it('appends to existing .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\ndist/\n');

    const results: GenerationResult[] = [{ path: '.project.yaml', result: 'created' }];

    enableStealth(tmpDir, results, false);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('.project.yaml');
  });

  it('does not duplicate entries already in .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.project.yaml\n');

    const results: GenerationResult[] = [{ path: '.project.yaml', result: 'created' }];

    enableStealth(tmpDir, results, false);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    const matches = gitignore.match(/\.project\.yaml/g);
    expect(matches).toHaveLength(1);
  });

  it('collapses directory files into directory entries', () => {
    const results: GenerationResult[] = [
      { path: '.devcontainer/Dockerfile.dev', result: 'created' },
      { path: '.devcontainer/docker-compose.yml', result: 'created' },
      { path: '.devcontainer/devcontainer.json', result: 'created' },
      { path: '.devcontainer/post-create.sh', result: 'created' },
    ];

    enableStealth(tmpDir, results, false);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    // Should have .devcontainer/ once, not individual files
    expect(gitignore).toContain('.devcontainer/');
    expect(gitignore).not.toContain('Dockerfile.dev');
  });
});
