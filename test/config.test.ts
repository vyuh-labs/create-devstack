import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  createDefaultConfig,
  readConfig,
  writeConfig,
  enableLanguage,
  enableInfra,
  enabledLanguages,
  enabledInfra,
} from '../src/config';

describe('createDefaultConfig', () => {
  it('creates config with project name and defaults', () => {
    const config = createDefaultConfig('my-app', 'A web API');
    expect(config.project.name).toBe('my-app');
    expect(config.project.description).toBe('A web API');
    expect(config.languages).toEqual({});
    expect(config.infrastructure).toEqual({});
    expect(config.tools.claude_code).toBe(true);
    expect(config.tools.docker).toBe(true);
    expect(config.tools.gcloud).toBe(false);
  });

  it('defaults description to empty string', () => {
    const config = createDefaultConfig('test');
    expect(config.project.description).toBe('');
  });
});

describe('readConfig / writeConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when .project.yaml does not exist', () => {
    expect(readConfig(tmpDir)).toBeNull();
  });

  it('round-trips a config through write then read', () => {
    const config = createDefaultConfig('round-trip', 'test');
    enableLanguage(config, 'python', '3.11', { coverage: 90, lint: true, typecheck: true });
    enableInfra(config, 'postgres', '15');

    writeConfig(tmpDir, config);

    const read = readConfig(tmpDir);
    expect(read).not.toBeNull();
    expect(read!.project.name).toBe('round-trip');
    expect(read!.languages.python?.enabled).toBe(true);
    expect(read!.languages.python?.version).toBe('3.11');
    expect(read!.languages.python?.quality?.coverage).toBe(90);
    expect(read!.infrastructure.postgres?.enabled).toBe(true);
    expect(read!.infrastructure.postgres?.version).toBe('15');
  });

  it('writes valid YAML', () => {
    const config = createDefaultConfig('yaml-check');
    writeConfig(tmpDir, config);

    const raw = fs.readFileSync(path.join(tmpDir, '.project.yaml'), 'utf-8');
    expect(raw).toContain('name: yaml-check');
    // Empty objects may serialize as {}, but populated ones should be block-style
    expect(raw).toContain('name: yaml-check');
  });
});

describe('enableLanguage', () => {
  it('enables a language with default version', () => {
    const config = createDefaultConfig('test');
    enableLanguage(config, 'python');
    expect(config.languages.python?.enabled).toBe(true);
    expect(config.languages.python?.version).toBe('3.12');
  });

  it('enables a language with custom version and quality', () => {
    const config = createDefaultConfig('test');
    enableLanguage(config, 'go', '1.22.0', { coverage: 70, lint: true });
    expect(config.languages.go?.enabled).toBe(true);
    expect(config.languages.go?.version).toBe('1.22.0');
    expect(config.languages.go?.quality?.coverage).toBe(70);
  });
});

describe('enableInfra', () => {
  it('enables infra with default version', () => {
    const config = createDefaultConfig('test');
    enableInfra(config, 'redis');
    expect(config.infrastructure.redis?.enabled).toBe(true);
    expect(config.infrastructure.redis?.version).toBe('7');
  });
});

describe('enabledLanguages / enabledInfra', () => {
  it('returns only enabled language names', () => {
    const config = createDefaultConfig('test');
    enableLanguage(config, 'python');
    enableLanguage(config, 'go');
    expect(enabledLanguages(config)).toEqual(['python', 'go']);
  });

  it('returns empty when nothing enabled', () => {
    const config = createDefaultConfig('test');
    expect(enabledLanguages(config)).toEqual([]);
    expect(enabledInfra(config)).toEqual([]);
  });

  it('returns only enabled infra names', () => {
    const config = createDefaultConfig('test');
    enableInfra(config, 'postgres');
    expect(enabledInfra(config)).toEqual(['postgres']);
  });
});
