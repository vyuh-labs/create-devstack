import { describe, it, expect } from 'vitest';
import { getPreset, PRESET_NAMES, DEFAULT_VERSIONS } from '../src/presets';

describe('getPreset', () => {
  it('returns strict preset with 95% coverage', () => {
    const p = getPreset('strict');
    expect(p?.coverage).toBe(95);
    expect(p?.lint).toBe(true);
    expect(p?.typecheck).toBe(true);
    expect(p?.format).toBe(true);
  });

  it('returns standard preset with 80% coverage', () => {
    const p = getPreset('standard');
    expect(p?.coverage).toBe(80);
  });

  it('returns relaxed preset with 60% coverage', () => {
    const p = getPreset('relaxed');
    expect(p?.coverage).toBe(60);
    expect(p?.typecheck).toBe(false);
    expect(p?.format).toBe(false);
  });

  it('returns undefined for custom', () => {
    expect(getPreset('custom')).toBeUndefined();
  });
});

describe('PRESET_NAMES', () => {
  it('contains all four options', () => {
    expect(PRESET_NAMES).toEqual(['strict', 'standard', 'relaxed', 'custom']);
  });
});

describe('DEFAULT_VERSIONS', () => {
  it('has defaults for all supported languages', () => {
    expect(DEFAULT_VERSIONS.python).toBe('3.12');
    expect(DEFAULT_VERSIONS.go).toBe('1.24.0');
    expect(DEFAULT_VERSIONS.node).toBe('22');
    expect(DEFAULT_VERSIONS.rust).toBe('stable');
  });

  it('has defaults for infrastructure', () => {
    expect(DEFAULT_VERSIONS.postgres).toBe('16');
    expect(DEFAULT_VERSIONS.redis).toBe('7');
  });
});
