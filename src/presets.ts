import { QualityConfig, QualityPreset } from './types';

/** Quality presets define coverage and tooling defaults. */
const PRESETS: Record<Exclude<QualityPreset, 'custom'>, QualityConfig> = {
  strict: { coverage: 95, lint: true, typecheck: true, format: true },
  standard: { coverage: 80, lint: true, typecheck: true, format: true },
  relaxed: { coverage: 60, lint: true, typecheck: false, format: false },
};

export function getPreset(name: QualityPreset): QualityConfig | undefined {
  if (name === 'custom') return undefined;
  return PRESETS[name];
}

export const PRESET_NAMES: QualityPreset[] = ['strict', 'standard', 'relaxed', 'custom'];

/** Default language versions used when the user doesn't specify one. */
export const DEFAULT_VERSIONS: Record<string, string> = {
  python: '3.12',
  go: '1.24.0',
  node: '22',
  nextjs: '15',
  rust: 'stable',
  csharp: '9',
  postgres: '16',
  redis: '7',
};
