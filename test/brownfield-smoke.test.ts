import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanProject } from '../src/detect';
import { buildBrownfieldResult } from '../src/brownfield';
import { generateDevcontainer } from '../src/generators/devcontainer';
import { writeConfig } from '../src/config';

describe('brownfield smoke test: existing Python+Postgres project', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-brown-smoke-'));

    // Simulate an existing Python project with postgres in docker-compose
    fs.writeFileSync(
      path.join(tmpDir, 'pyproject.toml'),
      '[project]\nname = "my-api"\nrequires-python = ">=3.11"\n',
    );
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'fastapi\nuvicorn\n');
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.py'), 'print("hello")\n');

    // Run the brownfield pipeline (non-interactive)
    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    writeConfig(tmpDir, result.config);
    if (result.generateDevcontainer && result.config.tools.docker) {
      generateDevcontainer(tmpDir, result.config, result.strategy);
    }
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .project.yaml from detected stack', () => {
    const content = fs.readFileSync(path.join(tmpDir, '.project.yaml'), 'utf-8');
    expect(content).toContain('my-api');
    expect(content).toContain('python');
    expect(content).toContain('enabled: true');
  });

  it('generates devcontainer with Python support', () => {
    const dockerfile = fs.readFileSync(
      path.join(tmpDir, '.devcontainer', 'Dockerfile.dev'),
      'utf-8',
    );
    expect(dockerfile).toContain('Python');
    expect(dockerfile).not.toContain('Go ');
    expect(dockerfile).not.toContain('{{');
  });

  it('does not contain unprocessed template syntax', () => {
    const devcontainerDir = path.join(tmpDir, '.devcontainer');
    for (const file of walkDir(devcontainerDir)) {
      const content = fs.readFileSync(file, 'utf-8');
      const cleaned = content.replace(/\$\{\{/g, '');
      expect(cleaned).not.toMatch(/\{\{[A-Z]/);
    }
  });

  it('preserves existing source files', () => {
    expect(fs.existsSync(path.join(tmpDir, 'pyproject.toml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'requirements.txt'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'main.py'))).toBe(true);
  });
});

describe('brownfield smoke test: project with existing devcontainer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devstack-brown-existing-'));

    // Project with existing devcontainer
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'existing-app', version: '1.0.0' }),
    );
    fs.mkdirSync(path.join(tmpDir, '.devcontainer'));
    fs.writeFileSync(path.join(tmpDir, '.devcontainer', 'devcontainer.json'), '{"name": "custom"}');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('skips devcontainer generation when it already exists', () => {
    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    expect(result.generateDevcontainer).toBe(false);

    // Verify existing file is untouched
    const content = fs.readFileSync(
      path.join(tmpDir, '.devcontainer', 'devcontainer.json'),
      'utf-8',
    );
    expect(content).toBe('{"name": "custom"}');
  });

  it('still creates .project.yaml', () => {
    const scan = scanProject(tmpDir);
    const result = buildBrownfieldResult(tmpDir, scan);

    writeConfig(tmpDir, result.config);

    const content = fs.readFileSync(path.join(tmpDir, '.project.yaml'), 'utf-8');
    expect(content).toContain('existing-app');
  });
});

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full));
    else results.push(full);
  }
  return results;
}
