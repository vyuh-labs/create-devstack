import { confirm, checkbox, select } from '@inquirer/prompts';
import pc from 'picocolors';
import { ProjectConfig, QualityPreset, ConflictStrategy } from './types';
import { readConfig, createDefaultConfig, enableLanguage, enableInfra } from './config';
import { getPreset, PRESET_NAMES, DEFAULT_VERSIONS } from './presets';
import { BrownfieldScan, formatDetection } from './detect';

/** Result of the brownfield prompts. */
export interface BrownfieldResult {
  config: ProjectConfig;
  strategy: ConflictStrategy;
  /** Whether to generate devcontainer (false if it already exists and user chose skip) */
  generateDevcontainer: boolean;
  /** Whether to run dxkit init */
  runDxkit: boolean;
}

/**
 * Run the brownfield wizard.
 *
 * Handles three cases:
 * 1. Valid .project.yaml exists → offer to keep or reconfigure
 * 2. No .project.yaml → detect stack, confirm, generate config
 * 3. Malformed .project.yaml → warn, treat as case 2
 */
export async function runBrownfieldPrompts(
  cwd: string,
  scan: BrownfieldScan,
): Promise<BrownfieldResult> {
  console.log(`\n  ${pc.cyan('Scanning existing project...')}\n`);
  console.log(`  ${pc.bold('Detected:')}`);
  console.log(formatDetection(scan));
  console.log('');

  // Check for existing .project.yaml
  if (scan.existing.projectYaml) {
    const existingConfig = readConfig(cwd);
    if (existingConfig) {
      return handleExistingConfig(existingConfig, scan);
    }
    console.log(pc.yellow('  Found .project.yaml but it appears malformed — reconfiguring.\n'));
  }

  // No valid .project.yaml — build config from detection + user input
  return handleFreshConfig(scan);
}

/** Handle case where a valid .project.yaml already exists. */
async function handleExistingConfig(
  config: ProjectConfig,
  scan: BrownfieldScan,
): Promise<BrownfieldResult> {
  console.log(`  ${pc.green('Found existing .project.yaml:')}`);
  console.log(`    Project: ${config.project.name}`);

  const enabledLangs = Object.entries(config.languages)
    .filter(([, v]) => v?.enabled)
    .map(([k]) => k);
  if (enabledLangs.length) console.log(`    Languages: ${enabledLangs.join(', ')}`);
  console.log('');

  const keepConfig = await confirm({
    message: 'Keep this configuration?',
    default: true,
  });

  if (keepConfig) {
    const { strategy, generateDevcontainer, runDxkit } = await askWhatToGenerate(scan);
    return { config, strategy, generateDevcontainer, runDxkit };
  }

  // User wants to reconfigure
  return handleFreshConfig(scan);
}

/** Build a config from detection results + user confirmation. */
async function handleFreshConfig(scan: BrownfieldScan): Promise<BrownfieldResult> {
  const { stack } = scan;

  // Start with detected languages pre-selected
  const detectedLangs = Object.entries(stack.languages)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const allLangs = ['python', 'go', 'node', 'nextjs', 'rust', 'csharp'];

  const languages = await checkbox({
    message: 'Confirm languages (space to toggle)',
    choices: allLangs.map((lang, i) => ({
      name: `${i + 1}. ${lang} ${stack.versions[lang as keyof typeof stack.versions] ?? DEFAULT_VERSIONS[lang] ?? ''}`.trim(),
      value: lang,
      checked: detectedLangs.includes(lang),
    })),
  });

  // Infrastructure — pre-select detected
  const detectedInfra = Object.entries(stack.infrastructure)
    .filter(([k, v]) => v && k !== 'docker')
    .map(([k]) => k);

  const infra = await checkbox({
    message: 'Infrastructure',
    choices: [
      {
        name: `1. PostgreSQL ${DEFAULT_VERSIONS.postgres}`,
        value: 'postgres',
        checked: detectedInfra.includes('postgres'),
      },
      {
        name: `2. Redis ${DEFAULT_VERSIONS.redis}`,
        value: 'redis',
        checked: detectedInfra.includes('redis'),
      },
    ],
  });

  const preset = await select<QualityPreset>({
    message: 'Quality preset',
    choices: PRESET_NAMES.map((p, i) => ({ name: `${i + 1}. ${p}`, value: p })),
    default: 'standard',
  });

  // Build config
  const config = createDefaultConfig(stack.projectName, stack.projectDescription);

  const quality = getPreset(preset) ?? getPreset('standard')!;
  for (const lang of languages) {
    const version = stack.versions[lang as keyof typeof stack.versions] ?? DEFAULT_VERSIONS[lang];
    enableLanguage(config, lang, version, { ...quality });
  }
  for (const service of infra) {
    enableInfra(config, service);
  }

  // Tools — set based on detection
  config.tools.docker = scan.existing.devcontainer || stack.infrastructure.docker;
  config.tools.claude_code = true;
  config.tools.precommit = scan.existing.precommit || true;
  config.tools.gcloud = stack.tools.gcloud;
  config.tools.pulumi = stack.tools.pulumi;
  config.tools.infisical = stack.tools.infisical;

  const { strategy, generateDevcontainer, runDxkit } = await askWhatToGenerate(scan);
  return { config, strategy, generateDevcontainer, runDxkit };
}

/** Ask what to generate and how to handle conflicts. */
async function askWhatToGenerate(
  scan: BrownfieldScan,
): Promise<{ strategy: ConflictStrategy; generateDevcontainer: boolean; runDxkit: boolean }> {
  const generateDevcontainer = scan.existing.devcontainer
    ? await confirm({
        message: '.devcontainer/ already exists. Overwrite?',
        default: false,
      })
    : true;

  const runDxkit = scan.existing.claudeDir
    ? await confirm({
        message: '.claude/ already exists. Re-run dxkit init?',
        default: false,
      })
    : true;

  const strategy: ConflictStrategy = scan.existing.devcontainer
    ? generateDevcontainer
      ? 'overwrite'
      : 'skip'
    : 'skip';

  return { strategy, generateDevcontainer, runDxkit };
}

/**
 * Build a BrownfieldResult non-interactively from a scan.
 * Used for testing and --yes mode.
 */
export function buildBrownfieldResult(
  cwd: string,
  scan: BrownfieldScan,
  preset: QualityPreset = 'standard',
): BrownfieldResult {
  const { stack } = scan;

  // Check for existing config
  if (scan.existing.projectYaml) {
    const existingConfig = readConfig(cwd);
    if (existingConfig && existingConfig.project?.name) {
      return {
        config: existingConfig,
        strategy: 'skip',
        generateDevcontainer: !scan.existing.devcontainer,
        runDxkit: !scan.existing.claudeDir,
      };
    }
  }

  // Build from detection
  const config = createDefaultConfig(stack.projectName, stack.projectDescription);
  const quality = getPreset(preset) ?? getPreset('standard')!;

  for (const [lang, enabled] of Object.entries(stack.languages)) {
    if (enabled) {
      const version = stack.versions[lang as keyof typeof stack.versions] ?? DEFAULT_VERSIONS[lang];
      enableLanguage(config, lang, version, { ...quality });
    }
  }

  if (stack.infrastructure.postgres) enableInfra(config, 'postgres');
  if (stack.infrastructure.redis) enableInfra(config, 'redis');

  config.tools.docker = true; // default to true — devcontainer is the point
  config.tools.claude_code = true;
  config.tools.gcloud = stack.tools.gcloud;
  config.tools.pulumi = stack.tools.pulumi;
  config.tools.infisical = stack.tools.infisical;

  return {
    config,
    strategy: 'skip',
    generateDevcontainer: !scan.existing.devcontainer,
    runDxkit: !scan.existing.claudeDir,
  };
}
