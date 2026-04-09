import { processTemplate } from '@vyuhlabs/dxkit';
import { ProjectConfig } from './types';

/** Build the {{VAR}} substitution map from a ProjectConfig. */
export function buildVariables(config: ProjectConfig): Record<string, string> {
  const name = config.project.name;

  const vars: Record<string, string> = {
    PROJECT_NAME: name,
    PROJECT_NAME_SNAKE: name.replace(/[-\s]+/g, '_').toLowerCase(),
    PROJECT_NAME_KEBAB: name.replace(/[\s_]+/g, '-').toLowerCase(),
    PROJECT_DESCRIPTION: config.project.description,
  };

  // Language versions
  const langVersionMap: Record<string, { version: string; extras?: Record<string, string> }> = {
    python: {
      version: config.languages.python?.version ?? '3.12',
      extras: {
        PYTHON_VERSION_NODOT: (config.languages.python?.version ?? '3.12').replace('.', ''),
      },
    },
    go: {
      version: config.languages.go?.version ?? '1.24.0',
      extras: {
        GO_VERSION_SHORT: (config.languages.go?.version ?? '1.24.0').replace(/\.\d+$/, ''),
      },
    },
    node: { version: config.languages.node?.version ?? '20' },
    rust: { version: config.languages.rust?.version ?? 'stable' },
    csharp: {
      version: config.languages.csharp?.version ?? '9',
      extras: {
        CSHARP_TFM: `net${config.languages.csharp?.version ?? '9'}.0`,
      },
    },
  };

  for (const [lang, info] of Object.entries(langVersionMap)) {
    vars[`${lang.toUpperCase()}_VERSION`] = info.version;
    if (info.extras) {
      Object.assign(vars, info.extras);
    }
  }

  // Infrastructure versions
  vars.POSTGRES_VERSION = config.infrastructure.postgres?.version ?? '16';
  vars.REDIS_VERSION = config.infrastructure.redis?.version ?? '7';

  // Database defaults
  vars.DB_NAME = `${vars.PROJECT_NAME_SNAKE}_dev`;
  vars.DB_USER = vars.PROJECT_NAME_SNAKE;
  vars.DB_PASSWORD = 'devpassword';

  // Quality
  const coverage = findCoverage(config);
  vars.COVERAGE_THRESHOLD = String(coverage);

  return vars;
}

/** Build the {{#IF_X}} condition map from a ProjectConfig. */
export function buildConditions(config: ProjectConfig): Record<string, boolean> {
  const langs = config.languages;
  const infra = config.infrastructure;
  const tools = config.tools;

  return {
    IF_PYTHON: langs.python?.enabled ?? false,
    IF_GO: langs.go?.enabled ?? false,
    IF_NODE: langs.node?.enabled ?? false,
    IF_NEXTJS: langs.nextjs?.enabled ?? false,
    IF_RUST: langs.rust?.enabled ?? false,
    IF_CSHARP: langs.csharp?.enabled ?? false,
    IF_POSTGRES: infra.postgres?.enabled ?? false,
    IF_REDIS: infra.redis?.enabled ?? false,
    IF_HAS_SERVICES: (infra.postgres?.enabled ?? false) || (infra.redis?.enabled ?? false),
    IF_CLAUDE_CODE: tools.claude_code,
    IF_PRECOMMIT: tools.precommit,
    IF_DOCKER: tools.docker,
    IF_GCLOUD: tools.gcloud,
    IF_PULUMI: tools.pulumi,
    IF_INFISICAL: tools.infisical,
  };
}

/** Find the first non-zero coverage threshold across enabled languages. */
function findCoverage(config: ProjectConfig): number {
  for (const lang of Object.values(config.languages)) {
    if (lang?.enabled && lang.quality?.coverage) {
      return lang.quality.coverage;
    }
  }
  return 80; // default
}

/** Process a template string using a ProjectConfig. */
export function renderTemplate(template: string, config: ProjectConfig): string {
  return processTemplate(template, buildVariables(config), buildConditions(config));
}
