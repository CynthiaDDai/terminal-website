import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveSiteUrl, checkReleaseUrl, siteEnvironmentMode } from '../../scripts/site-url.mjs';
import { discoverThemeFolders } from '../../scripts/theme-discovery.mjs';
import { findBrokenLinks } from '../../scripts/check-links.mjs';
import { siteConfigErrors } from '../../src/lib/site-config';

const directories: string[] = [];
function temporary() { const root = mkdtempSync(join(tmpdir(), 'site-config-')); directories.push(root); return root; }
afterEach(() => { vi.unstubAllEnvs(); for (const root of directories.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('public URL configuration', () => {
  it('chooses the CLI environment before Vite has set NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', undefined);
    expect(siteEnvironmentMode(['build'])).toBe('production');
    expect(siteEnvironmentMode(['dev'])).toBe('development');
    expect(siteEnvironmentMode(['build', '--mode', 'staging'])).toBe('staging');
  });
  it('loads production env files and gives injected environment variables priority', () => {
    const root = temporary();
    vi.stubEnv('PUBLIC_SITE_URL', undefined);
    writeFileSync(join(root, '.env'), 'PUBLIC_SITE_URL=https://from-file.test\n');
    expect(resolveSiteUrl(root, 'production')).toBe('https://from-file.test');
    writeFileSync(join(root, '.env.production'), 'PUBLIC_SITE_URL=https://production.test\n');
    expect(resolveSiteUrl(root, 'production')).toBe('https://production.test');
    vi.stubEnv('PUBLIC_SITE_URL', 'https://injected.test/');
    expect(resolveSiteUrl(root, 'production')).toBe('https://injected.test');
  });
  it('rejects malformed origins and checks release placeholders explicitly', () => {
    const root = temporary();
    for (const value of ['garbage', 'javascript:alert(1)', 'https://user:pass@example.org', 'https://example.org/subpath', 'https://example.org/?query']) {
      vi.stubEnv('PUBLIC_SITE_URL', value);
      expect(() => resolveSiteUrl(root)).toThrow('PUBLIC_SITE_URL');
    }
    expect(() => checkReleaseUrl('https://example.com')).toThrow('public domain');
    expect(() => checkReleaseUrl('http://localhost')).toThrow('public domain');
    expect(() => checkReleaseUrl('https://mira.dev')).not.toThrow();
  });
});

describe('theme directories', () => {
  it('ignores loose files and allows the same native filename in distinct theme folders', () => {
    const root = temporary();
    writeFileSync(join(root, 'ignored.omp.json'), '{}');
    for (const name of ['a', 'b']) {
      mkdirSync(join(root, name));
      writeFileSync(join(root, name, 'native.omp.json'), '{"blocks":[]}');
    }
    writeFileSync(join(root, 'a', 'theme_mobile.json'), '{"chrome":{"accent":"#123456"}}');
    const result = discoverThemeFolders(root);
    expect(Object.keys(result.sources)).toEqual(['/themes/a/native.omp.json', '/themes/b/native.omp.json']);
    expect(Object.keys(result.mobiles)).toEqual(['/themes/a/native.omp.json']);
  });
  it('rejects empty folders, multiple native files and malformed companion JSON', () => {
    const root = temporary();
    mkdirSync(join(root, 'empty'));
    expect(() => discoverThemeFolders(root)).toThrow('exactly one');
    writeFileSync(join(root, 'empty', 'native.omp.json'), '{"blocks":[]}');
    writeFileSync(join(root, 'empty', 'second.omp.json'), '{"blocks":[]}');
    expect(() => discoverThemeFolders(root)).toThrow('exactly one');
    rmSync(join(root, 'empty', 'second.omp.json'));
    writeFileSync(join(root, 'empty', 'theme_mobile.json'), '{bad');
    expect(() => discoverThemeFolders(root, { fallback: { invalidCompanion: 'error' } })).toThrow('theme_mobile.json');
    const catalog = discoverThemeFolders(root);
    expect(catalog.mobiles).toEqual({});
    expect(catalog.warnings['/themes/empty/native.omp.json']).toContainEqual(expect.stringContaining('theme_mobile.json'));
  });
});

describe('site profile', () => {
  const read = (path: string) => JSON.parse(readFileSync(join(process.cwd(), path), 'utf8'));
  const valid = () => read('tests/fixtures/site/site.json');
  it('accepts the real and the fixture profiles', () => {
    expect(siteConfigErrors(read('src/config/site.json'))).toEqual([]);
    expect(siteConfigErrors(valid())).toEqual([]);
  });
  it('names each invalid field instead of failing later in a template', () => {
    const profile = valid();
    Object.assign(profile, {
      wordmark: 'mira', homeFooter: 'writing', feed: ['/blog/'], activityLimit: 0, email: 'nope', github: 'github.com/me',
      dateLocale: 'not a locale!', socials: [{ name: 'Bad', url: 'javascript:alert(1)' }], typo: true,
      friends: [{ alias: 'pal', name: 'A', url: 'https://a.test' }, { alias: 'pal', name: 'B', url: 'https://b.test' }, { alias: 'Bad Alias', name: 'C', url: 'https://c.test' }],
    });
    const errors = siteConfigErrors(profile).join('\n');
    for (const field of ['"typo"', '"wordmark"', '"homeFooter"', '"feed"', '"activityLimit"', '"email"', '"github"', '"dateLocale"', 'socials[0]', 'already used', 'friends[2].alias']) {
      expect(errors).toContain(field);
    }
  });
  it('accepts footer lines, footer words with mottos and the three motto slots, and nothing else', () => {
    const profile = valid();
    Object.assign(profile, {
      pageFooter: ['One line.', '另一句。'], homeFooter: ['plain', { text: 'cats', motto: '衔蝉入梦' }],
      notFound: { title: 'Lost', description: 'Nothing here.', motto: '迷魂难招', quote: '雄鸡一声天下白。' },
      mottos: { index: '灯火阑珊', search: '众里寻他', toc: '栏杆拍遍' },
    });
    expect(siteConfigErrors(profile)).toEqual([]);
    Object.assign(profile, { pageFooter: [], homeFooter: [{ motto: 'no text' }], mottos: { footer: '多余' }, notFound: { title: 'Lost', description: '', quote: 1 } });
    const errors = siteConfigErrors(profile).join('\n');
    for (const field of ['"pageFooter"', '"homeFooter"', '"mottos"', '"notFound"']) expect(errors).toContain(field);
  });
});

describe('internal link check', () => {
  it('accepts links that a static server would resolve and reports the rest', () => {
    const root = temporary();
    for (const path of ['notes', 'legacy']) mkdirSync(join(root, path), { recursive: true });
    writeFileSync(join(root, 'rss.xml'), '');
    writeFileSync(join(root, 'notes/first.html'), '<a href="/notes">up</a><a href="./paper.md">bad</a><a href="first">sibling</a><img src="/missing.png"><a href="https://x.test">ext</a><a href="#top">top</a><a href="mailto:a@b.c">mail</a>');
    writeFileSync(join(root, 'notes.html'), '<a href="/notes/first">ok</a><a href="/rss.xml">rss</a><script>const a = "<a href=\\"/nowhere\\">";</script>');
    writeFileSync(join(root, 'about.html'), '<a href="/no-such-page">x</a><a href="/legacy">redirects</a><a href="/legacy/">ok</a>');
    writeFileSync(join(root, 'legacy/index.html'), '');
    writeFileSync(join(root, 'index.html'), '<a href="/about">about</a><a href="/">home</a>');
    expect(findBrokenLinks(root)).toEqual([
      { page: '/about', link: '/no-such-page' },
      // A folder's index.html is only served at /legacy/; /legacy would redirect.
      { page: '/about', link: '/legacy' },
      { page: '/notes/first', link: './paper.md' },
      { page: '/notes/first', link: '/missing.png' },
    ]);
  });
});
