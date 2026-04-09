import * as fs from 'fs';
import * as path from 'path';
import { parse, stringify } from 'yaml';
import { ProjectConfig, ToolsConfig } from './types';
import { DEFAULT_VERSIONS } from './presets';

const CONFIG_FILENAME = '.project.yaml';

/** Default tools configuration. */
function defaultTools(): ToolsConfig {
  return {
    claude_code: true,
    github_cli: true,
    docker: true,
    precommit: true,
    gcloud: false,
    pulumi: false,
    infisical: false,
  };
}

/** Create a minimal ProjectConfig with sensible defaults. */
export function createDefaultConfig(name: string, description = ''): ProjectConfig {
  return {
    project: { name, description },
    languages: {},
    infrastructure: {},
    tools: defaultTools(),
  };
}

/** Read .project.yaml from a directory. Returns null if not found. */
export function readConfig(dir: string): ProjectConfig | null {
  const filePath = path.join(dir, CONFIG_FILENAME);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  return parse(raw) as ProjectConfig;
}

/** Write .project.yaml to a directory. */
export function writeConfig(dir: string, config: ProjectConfig): void {
  const filePath = path.join(dir, CONFIG_FILENAME);
  const content = stringify(config, {
    lineWidth: 0, // don't wrap long lines
    singleQuote: true,
  });
  fs.writeFileSync(filePath, content, 'utf-8');
}

/** Enable a language in the config with default version and quality. */
export function enableLanguage(
  config: ProjectConfig,
  lang: string,
  version?: string,
  quality?: { coverage: number; lint: boolean; typecheck?: boolean; format?: boolean },
): void {
  const langConfig = {
    enabled: true,
    version: version ?? DEFAULT_VERSIONS[lang] ?? '1.0',
    quality: quality ?? { coverage: 80, lint: true },
  };

  config.languages[lang as keyof typeof config.languages] =
    langConfig as ProjectConfig['languages'][keyof ProjectConfig['languages']];
}

/** Enable an infrastructure service in the config. */
export function enableInfra(config: ProjectConfig, service: string, version?: string): void {
  const infraConfig = {
    enabled: true,
    version: version ?? DEFAULT_VERSIONS[service] ?? '1',
  };

  config.infrastructure[service as keyof typeof config.infrastructure] =
    infraConfig as ProjectConfig['infrastructure'][keyof ProjectConfig['infrastructure']];
}

/** Get the list of enabled language names. */
export function enabledLanguages(config: ProjectConfig): string[] {
  return Object.entries(config.languages)
    .filter(([, v]) => v?.enabled)
    .map(([k]) => k);
}

/** Get the list of enabled infrastructure service names. */
export function enabledInfra(config: ProjectConfig): string[] {
  return Object.entries(config.infrastructure)
    .filter(([, v]) => v?.enabled)
    .map(([k]) => k);
}
