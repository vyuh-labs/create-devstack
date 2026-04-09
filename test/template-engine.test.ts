import { describe, it, expect } from 'vitest';
import { buildVariables, buildConditions, renderTemplate } from '../src/template-engine';
import { ProjectConfig } from '../src/types';

function makeConfig(overrides?: Partial<ProjectConfig>): ProjectConfig {
  return {
    project: { name: 'my-app', description: 'A test project' },
    languages: {
      python: { enabled: true, version: '3.12', quality: { coverage: 85, lint: true } },
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

describe('buildVariables', () => {
  it('derives project name variants', () => {
    const vars = buildVariables(makeConfig());
    expect(vars.PROJECT_NAME).toBe('my-app');
    expect(vars.PROJECT_NAME_SNAKE).toBe('my_app');
    expect(vars.PROJECT_NAME_KEBAB).toBe('my-app');
    expect(vars.PROJECT_DESCRIPTION).toBe('A test project');
  });

  it('sets language versions from config', () => {
    const vars = buildVariables(makeConfig());
    expect(vars.PYTHON_VERSION).toBe('3.12');
    expect(vars.PYTHON_VERSION_NODOT).toBe('312');
  });

  it('derives database defaults from project name', () => {
    const vars = buildVariables(makeConfig());
    expect(vars.DB_NAME).toBe('my_app_dev');
    expect(vars.DB_USER).toBe('my_app');
  });

  it('uses coverage from first enabled language', () => {
    const vars = buildVariables(makeConfig());
    expect(vars.COVERAGE_THRESHOLD).toBe('85');
  });

  it('defaults coverage to 80 when no language has it', () => {
    const vars = buildVariables(
      makeConfig({ languages: { python: { enabled: true, version: '3.12' } } }),
    );
    expect(vars.COVERAGE_THRESHOLD).toBe('80');
  });

  it('handles multi-word project names', () => {
    const vars = buildVariables(makeConfig({ project: { name: 'My Cool App', description: '' } }));
    expect(vars.PROJECT_NAME_SNAKE).toBe('my_cool_app');
    expect(vars.PROJECT_NAME_KEBAB).toBe('my-cool-app');
  });

  it('computes Go short version', () => {
    const vars = buildVariables(
      makeConfig({
        languages: { go: { enabled: true, version: '1.24.2' } },
      }),
    );
    expect(vars.GO_VERSION).toBe('1.24.2');
    expect(vars.GO_VERSION_SHORT).toBe('1.24');
  });
});

describe('buildConditions', () => {
  it('sets language conditions from enabled languages', () => {
    const cond = buildConditions(makeConfig());
    expect(cond.IF_PYTHON).toBe(true);
    expect(cond.IF_GO).toBe(false);
    expect(cond.IF_NODE).toBe(false);
  });

  it('sets infrastructure conditions', () => {
    const cond = buildConditions(makeConfig());
    expect(cond.IF_POSTGRES).toBe(true);
    expect(cond.IF_REDIS).toBe(false);
    expect(cond.IF_HAS_SERVICES).toBe(true);
  });

  it('sets tool conditions', () => {
    const cond = buildConditions(makeConfig());
    expect(cond.IF_CLAUDE_CODE).toBe(true);
    expect(cond.IF_GCLOUD).toBe(false);
    expect(cond.IF_PRECOMMIT).toBe(true);
  });

  it('IF_HAS_SERVICES is false when no infra enabled', () => {
    const cond = buildConditions(makeConfig({ infrastructure: {} }));
    expect(cond.IF_HAS_SERVICES).toBe(false);
  });
});

describe('renderTemplate', () => {
  it('substitutes variables', () => {
    const result = renderTemplate('Project: {{PROJECT_NAME}}', makeConfig());
    expect(result).toBe('Project: my-app\n');
  });

  it('processes conditionals', () => {
    const tpl = '{{#IF_PYTHON}}python is on{{/IF_PYTHON}}{{#IF_GO}}go is on{{/IF_GO}}';
    const result = renderTemplate(tpl, makeConfig());
    expect(result).toBe('python is on\n');
  });

  it('processes if/else', () => {
    const tpl = '{{#IF_REDIS}}has redis{{#ELSE}}no redis{{/IF_REDIS}}';
    const result = renderTemplate(tpl, makeConfig());
    expect(result).toBe('no redis\n');
  });

  it('handles nested conditionals', () => {
    const tpl = [
      '{{#IF_PYTHON}}',
      'python {{PYTHON_VERSION}}',
      '{{#IF_POSTGRES}}with postgres{{/IF_POSTGRES}}',
      '{{/IF_PYTHON}}',
    ].join('\n');
    const result = renderTemplate(tpl, makeConfig());
    expect(result).toContain('python 3.12');
    expect(result).toContain('with postgres');
  });

  it('preserves GitHub Actions ${{ }} syntax', () => {
    const tpl = 'node-version: ${{ matrix.node }}';
    const result = renderTemplate(tpl, makeConfig());
    expect(result).toContain('${{ matrix.node }}');
  });
});
