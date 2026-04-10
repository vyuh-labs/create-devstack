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

  it('reads dxkit manifest to get generated files', () => {
    // Write a dxkit manifest
    const manifest = {
      version: '1.5.0',
      files: {
        'CLAUDE.md': { hash: 'abc', evolving: false },
        '.claude/settings.json': { hash: 'def', evolving: false },
        '.claude/skills/quality/SKILL.md': { hash: 'ghi', evolving: false },
        '.ai/sessions/.gitkeep': { hash: null, evolving: false },
      },
    };
    fs.writeFileSync(path.join(tmpDir, '.vyuh-dxkit.json'), JSON.stringify(manifest));

    enableStealth(tmpDir, [], true);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claude/');
    expect(gitignore).toContain('.ai/');
    expect(gitignore).toContain('CLAUDE.md');
    expect(gitignore).toContain('.vyuh-dxkit.json');
    // Should not list individual files inside directories
    expect(gitignore).not.toContain('settings.json');
    expect(gitignore).not.toContain('SKILL.md');
  });

  it('does not add dxkit paths when no manifest exists', () => {
    enableStealth(tmpDir, [], true);

    const gitignorePath = path.join(tmpDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      // Only .vyuh-dxkit.json should be added (the manifest itself)
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
    expect(gitignore).toContain('.devcontainer/');
    expect(gitignore).not.toContain('Dockerfile.dev');
  });

  it('handles both create-devstack and dxkit files together', () => {
    const results: GenerationResult[] = [
      { path: '.project.yaml', result: 'created' },
      { path: '.devcontainer/Dockerfile.dev', result: 'created' },
    ];

    const manifest = {
      version: '1.5.0',
      files: {
        'CLAUDE.md': { hash: 'abc', evolving: false },
        '.claude/settings.json': { hash: 'def', evolving: false },
        Makefile: { hash: 'ghi', evolving: false },
      },
    };
    fs.writeFileSync(path.join(tmpDir, '.vyuh-dxkit.json'), JSON.stringify(manifest));

    enableStealth(tmpDir, results, true);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    // create-devstack files
    expect(gitignore).toContain('.project.yaml');
    expect(gitignore).toContain('.devcontainer/');
    // dxkit files (from manifest)
    expect(gitignore).toContain('.claude/');
    expect(gitignore).toContain('CLAUDE.md');
    expect(gitignore).toContain('Makefile');
    expect(gitignore).toContain('.vyuh-dxkit.json');
  });
});
