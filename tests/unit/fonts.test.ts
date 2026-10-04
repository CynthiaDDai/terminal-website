import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { subsetBuiltFonts } from '../../scripts/subset-fonts.mjs';

describe('font subsetting', () => {
  it('cuts *.subset.woff2 down to the characters in built pages and scripts, and leaves other fonts alone', async () => {
    const root = mkdtempSync(join(tmpdir(), 'subset-fonts-'));
    try {
      copyFileSync('public/fonts/nerd-symbols-mono.woff2', join(root, 'icons.subset.woff2'));
      copyFileSync('public/fonts/nerd-symbols-mono.woff2', join(root, 'icons.woff2'));
      writeFileSync(join(root, 'index.html'), '<p></p>');
      writeFileSync(join(root, 'site.js'), 'const icon = "";');
      const original = statSync(join(root, 'icons.woff2')).size;
      await subsetBuiltFonts(root, () => {});
      const subset = readFileSync(join(root, 'icons.subset.woff2'));
      expect(subset.subarray(0, 4).toString()).toBe('wOF2');
      expect(subset.length).toBeLessThan(original / 50);
      expect(statSync(join(root, 'icons.woff2')).size).toBe(original);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
