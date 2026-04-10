import { input, checkbox, select } from '@inquirer/prompts';
import { ProjectConfig, QualityPreset } from './types';
import { createDefaultConfig, enableLanguage, enableInfra } from './config';
import { getPreset, PRESET_NAMES, DEFAULT_VERSIONS } from './presets';

interface LanguageChoice {
  name: string;
  value: string;
  version: string;
}

const LANGUAGE_CHOICES: LanguageChoice[] = [
  { name: `Python ${DEFAULT_VERSIONS.python}`, value: 'python', version: DEFAULT_VERSIONS.python },
  { name: `Go ${DEFAULT_VERSIONS.go}`, value: 'go', version: DEFAULT_VERSIONS.go },
  { name: `Node.js ${DEFAULT_VERSIONS.node}`, value: 'node', version: DEFAULT_VERSIONS.node },
  { name: `Next.js ${DEFAULT_VERSIONS.nextjs}`, value: 'nextjs', version: DEFAULT_VERSIONS.nextjs },
  { name: `Rust (${DEFAULT_VERSIONS.rust})`, value: 'rust', version: DEFAULT_VERSIONS.rust },
  {
    name: `C# (.NET ${DEFAULT_VERSIONS.csharp})`,
    value: 'csharp',
    version: DEFAULT_VERSIONS.csharp,
  },
];

const INFRA_CHOICES = [
  { name: `PostgreSQL ${DEFAULT_VERSIONS.postgres}`, value: 'postgres' },
  { name: `Redis ${DEFAULT_VERSIONS.redis}`, value: 'redis' },
];

const TOOL_CHOICES = [
  { name: 'Devcontainer (Docker)', value: 'docker', default: true },
  { name: 'GitHub Actions CI', value: 'github_cli', default: true },
  { name: 'Pre-commit hooks', value: 'precommit', default: true },
  { name: 'Claude Code (via DXKit)', value: 'claude_code', default: true },
  { name: 'gcloud CLI', value: 'gcloud', default: false },
  { name: 'Pulumi', value: 'pulumi', default: false },
  { name: 'Infisical', value: 'infisical', default: false },
];

/** Run the interactive setup wizard and return a ProjectConfig. */
export async function runPrompts(projectName: string): Promise<ProjectConfig> {
  const description = await input({
    message: 'Project description',
    default: '',
  });

  const languages = await checkbox({
    message: 'Languages (space to toggle)',
    choices: LANGUAGE_CHOICES.map((l, i) => ({
      name: `${i + 1}. ${l.name}`,
      value: l.value,
    })),
  });

  const infra = await checkbox({
    message: 'Infrastructure',
    choices: INFRA_CHOICES.map((c, i) => ({
      name: `${i + 1}. ${c.name}`,
      value: c.value,
    })),
  });

  const preset = await select<QualityPreset>({
    message: 'Quality preset',
    choices: PRESET_NAMES.map((p, i) => ({ name: `${i + 1}. ${p}`, value: p })),
    default: 'standard',
  });

  const tools = await checkbox({
    message: 'Tools',
    choices: TOOL_CHOICES.map((t, i) => ({
      name: `${i + 1}. ${t.name}`,
      value: t.value,
      checked: t.default,
    })),
  });

  return buildConfigFromAnswers(projectName, description, languages, infra, preset, tools);
}

/** Build a ProjectConfig from prompt answers (also useful for testing). */
export function buildConfigFromAnswers(
  projectName: string,
  description: string,
  languages: string[],
  infra: string[],
  preset: QualityPreset,
  tools: string[],
): ProjectConfig {
  const config = createDefaultConfig(projectName, description);

  const quality = getPreset(preset) ?? getPreset('standard')!;

  for (const lang of languages) {
    const langChoice = LANGUAGE_CHOICES.find((l) => l.value === lang);
    enableLanguage(config, lang, langChoice?.version, { ...quality });
  }

  for (const service of infra) {
    enableInfra(config, service);
  }

  // Set tool flags
  const allToolKeys = TOOL_CHOICES.map((t) => t.value);
  for (const key of allToolKeys) {
    config.tools[key as keyof typeof config.tools] = tools.includes(key);
  }

  return config;
}
