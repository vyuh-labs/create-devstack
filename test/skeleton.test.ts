import { describe, it, expect } from 'vitest';

describe('package skeleton', () => {
  it('exports types from index', async () => {
    // Verify the module loads without error
    const mod = await import('../src/index');
    expect(mod).toBeDefined();
  });
});
