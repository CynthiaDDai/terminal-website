import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

// A font named *.subset.woff2 is cut down, after the build, to the characters the built site contains:
// page text, page data and client scripts. A complete CJK font shrinks from megabytes to the few hundred
// characters actually written. Text typed by visitors may use other characters; those fall back to system fonts.
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
const kb = bytes => `${Math.round(bytes.length / 1024)} KB`;

export async function subsetBuiltFonts(root, log = console.log) {
  const all = files(root);
  const fonts = all.filter(file => file.endsWith('.subset.woff2'));
  if (!fonts.length) return;
  const characters = [...new Set(all.filter(file => /\.(html|js|xml)$/.test(file)).map(file => readFileSync(file, 'utf8')).join(''))].join('');
  for (const font of fonts) {
    const before = readFileSync(font);
    const after = await subsetFont(before, characters, { targetFormat: 'woff2' });
    writeFileSync(font, after);
    log(`${relative(root, font)}: ${kb(before)} → ${kb(after)}`);
  }
}

export default function subsetFonts() {
  return {
    name: 'subset-fonts',
    hooks: { 'astro:build:done': ({ dir, logger }) => subsetBuiltFonts(fileURLToPath(dir), message => logger.info(message)) },
  };
}
