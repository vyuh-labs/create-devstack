import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateDevcontainer } from '../src/generators/devcontainer';
import { ProjectConfig } from '../src/types';

function makeConfig(overrides?: Partial<ProjectConfig>): ProjectConfig {
  return {
    project: { name: 'test-app', description: 'A test project' },
    languages: {
      python: { enabled: true, version: '3.12', quality: { coverage: 80, lint: true } },
    },
    infrastructure: {
      postgres: { enabled: true, version: '16' },
    },
    tools: {
      claude_code: true,
      github_cli: true,
      docker: true,
      precommit: true,
      gcloud: false,
      pulumi: false,
      infisical: false,
    },
    ...overrides,
  };
}

describe('generateDevcontainer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-devcontainer-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates all core devcontainer files', () => {
    const results = generateDevcontainer(tmpDir, makeConfig());

    expect(results).toHaveLength(5); // 4 core + 1 init-scripts
    expect(results.every((r) => r.result === 'created')).toBe(true);

    // Verify files exist
    expect(fs.existsSync(path.join(tmpDir, '.devcontainer/Dockerfile.dev'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.devcontainer/docker-compose.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.devcontainer/devcontainer.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.devcontainer/post-create.sh'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.devcontainer/init-scripts/01-init.sql'))).toBe(true);
  });

  it('substitutes project name in Dockerfile', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const dockerfile = fs.readFileSync(path.join(tmpDir, '.devcontainer/Dockerfile.dev'), 'utf-8');
    expect(dockerfile).toContain('WORKDIR /workspaces/test-app');
    expect(dockerfile).not.toContain('{{PROJECT_NAME}}');
  });

  it('includes Python section when Python enabled', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const dockerfile = fs.readFileSync(path.join(tmpDir, '.devcontainer/Dockerfile.dev'), 'utf-8');
    expect(dockerfile).toContain('Python 3.12');
    expect(dockerfile).toContain('python3.12');
  });

  it('excludes Go section when Go not enabled', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const dockerfile = fs.readFileSync(path.join(tmpDir, '.devcontainer/Dockerfile.dev'), 'utf-8');
    expect(dockerfile).not.toContain('Go ');
    expect(dockerfile).not.toContain('golang.org');
  });

  it('includes PostgreSQL in docker-compose when enabled', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const compose = fs.readFileSync(path.join(tmpDir, '.devcontainer/docker-compose.yml'), 'utf-8');
    expect(compose).toContain('postgres:16-alpine');
    expect(compose).toContain('DATABASE_URL');
    expect(compose).toContain('test_app_dev'); // DB_NAME derived from project name
  });

  it('excludes Redis when not enabled', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const compose = fs.readFileSync(path.join(tmpDir, '.devcontainer/docker-compose.yml'), 'utf-8');
    expect(compose).not.toContain('redis:');
    expect(compose).not.toContain('REDIS_URL');
  });

  it('includes VS Code extensions for enabled languages', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const devcontainer = fs.readFileSync(
      path.join(tmpDir, '.devcontainer/devcontainer.json'),
      'utf-8',
    );
    expect(devcontainer).toContain('ms-python.python');
    expect(devcontainer).toContain('charliermarsh.ruff');
    expect(devcontainer).not.toContain('golang.go');
  });

  it('includes Claude Code extension when enabled', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const devcontainer = fs.readFileSync(
      path.join(tmpDir, '.devcontainer/devcontainer.json'),
      'utf-8',
    );
    expect(devcontainer).toContain('anthropic.claude-code');
  });

  it('makes post-create.sh executable', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const stats = fs.statSync(path.join(tmpDir, '.devcontainer/post-create.sh'));
    expect(stats.mode & 0o111).toBeGreaterThan(0); // has execute bit
  });

  it('skips init-scripts when no postgres', () => {
    const config = makeConfig({ infrastructure: {} });
    const results = generateDevcontainer(tmpDir, config);

    expect(results).toHaveLength(4); // no init-scripts
    expect(fs.existsSync(path.join(tmpDir, '.devcontainer/init-scripts'))).toBe(false);
  });

  it('skips existing files with skip strategy', () => {
    // Generate once
    generateDevcontainer(tmpDir, makeConfig());
    // Generate again — should skip all
    const results = generateDevcontainer(tmpDir, makeConfig(), 'skip');
    expect(results.every((r) => r.result === 'skipped')).toBe(true);
  });

  it('overwrites existing files with overwrite strategy', () => {
    generateDevcontainer(tmpDir, makeConfig());
    const results = generateDevcontainer(tmpDir, makeConfig(), 'overwrite');
    expect(results.every((r) => r.result === 'overwritten')).toBe(true);
  });

  it('handles multi-language + multi-infra config', () => {
    const config = makeConfig({
      languages: {
        python: { enabled: true, version: '3.11', quality: { coverage: 80, lint: true } },
        go: { enabled: true, version: '1.22.0', quality: { coverage: 70, lint: true } },
        node: { enabled: true, version: '20', quality: { coverage: 75, lint: true } },
      },
      infrastructure: {
        postgres: { enabled: true, version: '15' },
        redis: { enabled: true, version: '7' },
      },
    });

    generateDevcontainer(tmpDir, config);

    const dockerfile = fs.readFileSync(path.join(tmpDir, '.devcontainer/Dockerfile.dev'), 'utf-8');
    expect(dockerfile).toContain('Python 3.11');
    expect(dockerfile).toContain('Go 1.22.0');
    expect(dockerfile).toContain('Node.js 20');
    expect(dockerfile).toContain('postgresql-client');
    expect(dockerfile).toContain('redis-tools');

    const compose = fs.readFileSync(path.join(tmpDir, '.devcontainer/docker-compose.yml'), 'utf-8');
    expect(compose).toContain('postgres:15-alpine');
    expect(compose).toContain('redis:7-alpine');
  });
});
