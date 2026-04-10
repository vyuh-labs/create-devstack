import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanProject } from '../src/detect';
import { buildBrownfieldResult } from '../src/brownfield';
import { writeConfig, createDefaultConfig, enableLanguage } from '../src/config';

describe('buildBrownfieldResult', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-brown-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects Python project and builds config', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "my-api"\n');
    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.config.languages.python?.enabled).toBe(true);
    expect(result.config.languages.go).toBeUndefined();
    expect(result.generateDevcontainer).toBe(true);
    expect(result.runDxkit).toBe(true);
    expect(result.strategy).toBe('skip');
  });

  it('detects multi-language project', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"\n');
    fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module example.com/test\ngo 1.22\n');
    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.config.languages.python?.enabled).toBe(true);
    expect(result.config.languages.go?.enabled).toBe(true);
    expect(result.config.languages.go?.version).toBe('1.22');
  });

  it('skips devcontainer generation when .devcontainer exists', () => {
    fs.mkdirSync(path.join(tmpDir, '.devcontainer'));
    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.generateDevcontainer).toBe(false);
  });

  it('skips dxkit when .claude already exists', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.runDxkit).toBe(false);
  });

  it('uses existing .project.yaml when present and valid', () => {
    const config = createDefaultConfig('existing-app', 'Already configured');
    enableLanguage(config, 'node', '20');
    writeConfig(tmpDir, config);

    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.config.project.name).toBe('existing-app');
    expect(result.config.project.description).toBe('Already configured');
    expect(result.config.languages.node?.enabled).toBe(true);
  });

  it('falls back to detection when .project.yaml is malformed', () => {
    fs.writeFileSync(path.join(tmpDir, '.project.yaml'), 'this is not valid');
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "detected"\n');

    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    // Should detect Python from pyproject.toml, not use the bad yaml
    expect(result.config.languages.python?.enabled).toBe(true);
  });

  it('applies quality preset', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"\n');
    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan, 'strict');

    expect(result.config.languages.python?.quality?.coverage).toBe(95);
  });

  it('detects tools from existing files', () => {
    fs.writeFileSync(path.join(tmpDir, '.pre-commit-config.yaml'), 'repos: []\n');
    fs.mkdirSync(path.join(tmpDir, '.devcontainer'));

    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.config.tools.docker).toBe(true);
  });
});
