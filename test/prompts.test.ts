import { describe, it, expect } from 'vitest';
import { buildConfigFromAnswers } from '../src/prompts';

describe('buildConfigFromAnswers', () => {
  it('creates config from typical greenfield answers', () => {
    const config = buildConfigFromAnswers(
      'my-app',
      'A web API',
      ['python', 'go'],
      ['postgres'],
      'standard',
      ['docker', 'github_cli', 'precommit', 'claude_code'],
    );

    expect(config.project.name).toBe('my-app');
    expect(config.project.description).toBe('A web API');

    // Languages
    expect(config.languages.python?.enabled).toBe(true);
    expect(config.languages.python?.version).toBe('3.12');
    expect(config.languages.python?.quality?.coverage).toBe(80);
    expect(config.languages.go?.enabled).toBe(true);
    expect(config.languages.node).toBeUndefined();

    // Infrastructure
    expect(config.infrastructure.postgres?.enabled).toBe(true);
    expect(config.infrastructure.redis).toBeUndefined();

    // Tools
    expect(config.tools.docker).toBe(true);
    expect(config.tools.claude_code).toBe(true);
    expect(config.tools.gcloud).toBe(false);
  });

  it('applies strict preset', () => {
    const config = buildConfigFromAnswers('app', '', ['python'], [], 'strict', []);
    expect(config.languages.python?.quality?.coverage).toBe(95);
    expect(config.languages.python?.quality?.typecheck).toBe(true);
    expect(config.languages.python?.quality?.format).toBe(true);
  });

  it('applies relaxed preset', () => {
    const config = buildConfigFromAnswers('app', '', ['node'], [], 'relaxed', []);
    expect(config.languages.node?.quality?.coverage).toBe(60);
    expect(config.languages.node?.quality?.typecheck).toBe(false);
  });

  it('falls back to standard for custom preset', () => {
    const config = buildConfigFromAnswers('app', '', ['python'], [], 'custom', []);
    expect(config.languages.python?.quality?.coverage).toBe(80);
  });

  it('handles empty selections', () => {
    const config = buildConfigFromAnswers('empty', '', [], [], 'standard', []);
    expect(Object.keys(config.languages)).toHaveLength(0);
    expect(Object.keys(config.infrastructure)).toHaveLength(0);
    // All tools should be false since none selected
    expect(config.tools.docker).toBe(false);
    expect(config.tools.claude_code).toBe(false);
  });

  it('enables all languages and infra', () => {
    const config = buildConfigFromAnswers(
      'full',
      '',
      ['python', 'go', 'node', 'nextjs', 'rust', 'csharp'],
      ['postgres', 'redis'],
      'standard',
      [],
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
