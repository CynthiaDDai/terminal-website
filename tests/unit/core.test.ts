import { describe, expect, it } from 'vitest';
import source from '../fixtures/themes/tokyo_slim_storm_v1_4.omp.json';
import stormSource from '../fixtures/site/themes/storm/storm.omp.json';
import { normalizePath, resolvePath, listChildren, breadcrumbs, pathFromUrl, type SiteEntry } from '../../src/lib/navigation/filesystem';
import { buildContentTree, type ContentSource } from '../../src/lib/content/tree';
import { tokenize } from '../../src/lib/terminal/parser';
import { executeCommand, type CommandContext } from '../../src/lib/terminal/registry';
import { autocomplete, commonCompletionPrefix } from '../../src/lib/terminal/autocomplete';
import { commands } from '../../src/lib/terminal/registry';
import { friends } from '../../src/config';
import { fastfetch } from '../../src/lib/theme/fastfetch-config';
import { parseOhMyPoshTheme } from '../../src/lib/theme/omp-parser';
import { adaptOhMyPoshTheme, themeTokens } from '../../src/lib/theme/omp-adapter';
import { renderCardPrompt, renderPrompt } from '../../src/lib/theme/prompt-renderer';
import { searchEntries, searchableText } from '../../src/lib/search';
import { parseJsonc, parseFastfetchTheme, fastfetchColor } from '../../src/lib/theme/fastfetch-parser';

const sources: ContentSource[] = [
  ...['about', 'uses', 'contact', 'blog/index', 'projects/index', 'notes/index'].map(id => ({ id, data: {} })),
  { id: 'blog/attention', data: { title: 'Attention notes', description: 'Queries and vectors', tags: ['math'], date: new Date('2026-01-02') }, body: 'The softmax normalization produces probabilities.' },
  { id: 'projects/site', data: { title: 'Site', description: 'Astro website', tags: ['typescript'], date: new Date('2026-03-02') } },
  { id: 'blog/example', data: { title: 'Future example', description: 'Example', date: new Date('2030-01-01'), example: true } },
];
const entries: SiteEntry[] = buildContentTree(sources).entries;
const context: CommandContext = {
  cwd: '/blog/attention', previousPath: '/projects', entries,
  owner: 'Mira', host: 'website', bio: 'Writing and building.', email: '', github: '', socials: [], activityLimit: 3, fastfetch, friends,
  theme: { current: { id: 'storm' }, set: id => id === 'paper', available: [{ id: 'storm', name: 'Storm' }, { id: 'paper', name: 'Paper' }] },
};

describe('command grammar', () => {
  it('preserves quoted arguments and surrounding whitespace', () => {
    expect(tokenize('  search "attention is all" math  ')).toEqual(['search', 'attention is all', 'math']);
    expect(tokenize("open 'Attention notes'")).toEqual(['open', 'Attention notes']);
  });
  it('rejects incomplete quotes and shell operators', () => {
    for (const value of ['search "bad', 'ls | pwd', 'ls && home', 'open `whoami`']) expect(() => tokenize(value)).toThrow();
    expect(executeCommand('ls > file', context).kind).toBe('error');
  });
  it('does not evaluate shell substitutions or arbitrary commands', () => {
    expect(executeCommand('$(whoami)', context).kind).toBe('error');
    expect(executeCommand('rm -rf /', context).kind).toBe('error');
  });
});
describe('one navigation model', () => {
  it('maps built page URLs, with or without .html, to their routes', () => {
    expect(['/index.html', '/', '/about.html', '/about', '/research/paper.html', '/research/', '/404.html'].map(pathFromUrl))
      .toEqual(['/', '/', '/about', '/about', '/research/paper', '/research', '/404']);
  });
  it('makes all nested parents navigable and completable without leaking descendants into ls', () => {
    const nested = buildContentTree([...sources,
      { id: 'blog/topic/deep/nested', data: {} },
      { id: 'blog/topic/second', data: {} },
    ]).entries;
    expect(listChildren('/blog', nested).map(entry => entry.path)).toContain('/blog/topic');
    expect(listChildren('/blog', nested).map(entry => entry.path)).not.toContain('/blog/topic/deep/nested');
    expect(listChildren('/blog/topic', nested).map(entry => entry.path)).toEqual(expect.arrayContaining(['/blog/topic/deep', '/blog/topic/second']));
    expect(executeCommand('cd ..', { ...context, entries: nested, cwd: '/blog/topic/deep/nested' })).toEqual({ kind: 'navigation', path: '/blog/topic/deep' });
    expect(autocomplete('cd topic/', '/blog', nested, [])).toContain('cd topic/deep/');
    expect(buildContentTree([...sources, { id: 'blog/topic/deep/nested', data: {} }, { id: 'blog/topic/second', data: {} }]).entries).toEqual(nested);
  });
  it('rejects an article that would occupy an inferred directory route', () => {
    expect(() => buildContentTree([...sources,
      { id: 'blog/attention/nested', data: {} },
    ])).toThrow('both a document and a directory');
  });
  it('resolves relative, absolute, home, and repeated parent paths', () => {
    expect(normalizePath('..', '/blog/attention')).toBe('/blog');
    expect(normalizePath('../..', '/blog/attention')).toBe('/');
    expect(normalizePath('../../../../', '/')).toBe('/');
    expect(normalizePath('~/projects', '/blog')).toBe('/projects');
    expect(normalizePath('/notes//./', '/blog')).toBe('/notes');
    expect(normalizePath('~', '/blog')).toBe('/');
  });
  it('requires resolved destinations to exist', () => {
    expect(resolvePath('missing', '/blog', entries)).toBeUndefined();
    expect(executeCommand('cd nowhere', context).kind).toBe('error');
  });
  it('supports cd .., cd ~, and cd -', () => {
    expect(executeCommand('cd ..', context)).toEqual({ kind: 'navigation', path: '/blog' });
    expect(executeCommand('cd ~', context)).toEqual({ kind: 'navigation', path: '/' });
    expect(executeCommand('cd -', context)).toEqual({ kind: 'navigation', path: '/projects' });
    expect(executeCommand('cd -', { ...context, previousPath: null }).kind).toBe('error');
  });
  it('lists only direct children and generates linked breadcrumbs', () => {
    expect(listChildren('/', entries)).toHaveLength(6);
    expect(listChildren('/blog', entries).map(entry => entry.path)).toEqual(['/blog/example', '/blog/attention']);
    expect(breadcrumbs('/blog/attention').map(item => item.path)).toEqual(['/', '/blog', '/blog/attention']);
  });
  it('opens page titles and globally named slugs', () => {
    expect(executeCommand('open "Attention notes"', { ...context, cwd: '/' })).toEqual({ kind: 'navigation', path: '/blog/attention' });
    expect(executeCommand('open site', context)).toEqual({ kind: 'navigation', path: '/projects/site' });
  });
  it('uses cd and open for root documents as well as directories', () => {
    expect(executeCommand('cd about', { ...context, cwd: '/' })).toEqual({ kind: 'navigation', path: '/about' });
    expect(executeCommand('open about', { ...context, cwd: '/' })).toEqual({ kind: 'navigation', path: '/about' });
    expect(executeCommand('ls ../notes', { ...context, cwd: '/blog' })).toEqual({ kind: 'text', text: 'No child pages at ~/notes.' });
    expect(executeCommand('ls ~/projects', context)).toEqual({ kind: 'list', entries: listChildren('/projects', entries) });
  });
});
describe('completion and search', () => {
  it('completes commands, relative paths, absolute paths, and themes', () => {
    expect(autocomplete('pw', '/', entries, ['storm', 'paper'])).toEqual(['pwd']);
    expect(autocomplete('cd ~/pro', '/blog', entries, [])).toEqual(['cd ~/projects/']);
    expect(autocomplete('cd ../pro', '/blog', entries, [])).toEqual(['cd ../projects/']);
    expect(autocomplete('theme pa', '/', entries, ['paper'])).toEqual(['theme paper']);
    expect(autocomplete('search math', '/', entries, [])).toEqual([]);
  });
  it('descends into completed directories without quoting paths', () => {
    expect(autocomplete('cd', '/', entries, [])).toContain('cd blog/');
    expect(autocomplete('cd blog', '/', entries, [])).toEqual(['cd blog/']);
    expect(autocomplete('cd blog/', '/', entries, [])).toEqual(['cd blog/attention', 'cd blog/example']);
    expect(autocomplete('cd blog/att', '/', entries, [])).toEqual(['cd blog/attention']);
    expect(autocomplete('cd missing', '/', entries, [])).toEqual([]);
    expect(commonCompletionPrefix(['cd blog/alpha', 'cd blog/alpine'])).toBe('cd blog/alp');
  });
  it('completes friend aliases without suggesting removed fastfetch flags', () => {
    expect(autocomplete('ssh goo', '/', entries, [], { friends: ['google'] })).toEqual(['ssh google']);
    expect(autocomplete('fastf', '/', entries, [])).toEqual(['fastfetch']);
    expect(autocomplete('fastfetch --', '/', entries, [])).toEqual([]);
  });
  it('searches all metadata with case-insensitive multi-term matching', () => {
    expect(searchEntries('ATTENTION math', entries).map(entry => entry.path)).toEqual(['/blog/attention']);
    expect(searchEntries('typescript', entries).map(entry => entry.path)).toEqual(['/projects/site']);
    expect(searchEntries('   ', entries)).toEqual([]);
    expect(searchEntries('not-found', entries)).toEqual([]);
  });
  it('finds body-only terms and extracts Markdown and static-page prose', () => {
    expect(searchEntries('softmax probabilities', entries).map(entry => entry.path)).toEqual(['/blog/attention']);
    expect(searchableText('---\ntitle: hidden\n---\n## Hello **world** [friend](https://example.com)')).toBe('Hello world friend');
    expect(searchableText('---\nimport Page from "page";\n---\n<Page><p>Unique prose</p></Page>')).toBe('Unique prose');
  });
  it('derives fastfetch from real dated entries, excluding illustrative examples', () => {
    const result = executeCommand('fastfetch', context);
    expect(result.kind).toBe('fastfetch');
    if (result.kind === 'fastfetch') {
      const activity = result.sections.find(section => section.name === 'ACTIVITY')!;
      expect(activity.rows.map(row => row.path)).toEqual(['/projects/site', '/blog/attention']);
      expect(activity.rows[0].label).toBe('2026-03-02');
    }
  });
});
describe('fastfetch configuration and friend links', () => {
  it('presents four website blocks with configured contact links and activity count', () => {
    const result = executeCommand('fastfetch', { ...context, email: 'hello@example.com', github: 'https://github.com/example', socials: [{ name: 'Mastodon', url: 'https://social.example/@user' }], activityLimit: 1 });
    expect(result.kind).toBe('fastfetch');
    if (result.kind === 'fastfetch') {
      expect(result.sections.map(section => section.name)).toEqual(['USER', 'SYSTEM', 'ACTIVITY', 'NETWORK']);
      expect(result.sections[0].rows[0]).toEqual({ label: 'name', value: 'Mira', path: '/about' });
      expect(result.sections[1].rows.find(row => row.label === 'pages')?.value).toBe(String(entries.length));
      expect(result.sections[2].rows).toHaveLength(1);
      expect(result.sections[3].rows.map(row => row.path)).toContain('mailto:hello@example.com');
      expect(result.sections[3].rows.map(row => row.path)).toContain('https://social.example/@user');
    }
    for (const input of ['fastfetch --config compact', 'fastfetch --format json']) {
      expect(executeCommand(input, context).kind).toBe('error');
    }
  });
  it('lists friends and connects only to configured web addresses', () => {
    const list = executeCommand('ssh', context);
    expect(list.kind).toBe('rich');
    if (list.kind === 'rich') expect(list.rows[0].path).toBe('https://www.google.com');
    expect(executeCommand('ssh google', context)).toEqual({ kind: 'external', url: 'https://www.google.com/', name: 'Google' });
    expect(executeCommand('ssh stranger', context).kind).toBe('error');
    expect(executeCommand('ssh bad', { ...context, friends: [{ alias: 'bad', name: 'Bad', url: 'javascript:alert(1)' }] }).kind).toBe('error');
  });
  it('removes history from execution, help, and completion', () => {
    expect(executeCommand('history', context).kind).toBe('error');
    expect(commands.some(command => command.name === 'history')).toBe(false);
    expect(autocomplete('hist', '/', entries, [])).toEqual([]);
  });
});
describe('native fastfetch theme import', () => {
  it('parses JSONC without corrupting quoted URLs, comments, escapes, or trailing commas', () => {
    const raw = '{ // comment\n "url": "https://example.com/a//b", "literal": ",}", "modules": ["break",], /* done */ }';
    expect(parseJsonc(raw)).toEqual({ url: 'https://example.com/a//b', literal: ',}', modules: ['break'] });
    expect(() => parseJsonc('{ /* unclosed')).toThrow();
  });
  it('imports local key colors and tree geometry without retaining hardware or commands', () => {
    const parsed = parseFastfetchTheme({ display: { separator: ' -> ' }, logo: { type: 'kitty', source: '/nix/store/private-logo.png' }, modules: [
      { type: 'os', key: 'DISTRO', keyColor: 'yellow', format: 'private system detail' },
      { type: 'command', key: '│ ├ CPU', text: 'cat /etc/secret' },
      { type: 'host', key: '│ └ HOST' },
      { type: 'wm', key: 'DE/WM', keyColor: 'blue' },
    ] });
    expect(parsed.separator).toBe(' -> ');
    expect(parsed.branch).toBe('│ ├'); expect(parsed.lastBranch).toBe('│ └');
    expect(parsed.sections[0].color).toBe('yellow'); expect(parsed.sections[1].color).toBe('blue');
    expect(JSON.stringify(parsed)).not.toMatch(/private|secret|DISTRO|DE\/WM|\/nix/);
    expect(fastfetchColor('red;position:fixed')).toBe('var(--terminal-accent-1)');
  });
  it('supports native data logos and website image assets', () => {
    expect(parseFastfetchTheme({ logo: { type: 'data', source: '( o.o )' } }).logo).toEqual({ type: 'text', source: '( o.o )' });
    expect(parseFastfetchTheme({ logo: { type: 'file', source: '/avatar.svg' } }).logo).toEqual({ type: 'image', source: '/avatar.svg' });
  });
});
describe('Oh My Posh adapter and renderer', () => {
  const parsed = parseOhMyPoshTheme(source);
  const promptContext = { user: 'guest', host: 'site', cwd: '~/blog', status: 'ok' as const };
  it('uses the supplied palette and normalizes multiline segment properties', () => {
    expect(parsed.palette.bg).toBe(source.palette.bg);
    expect(parsed.background).toBe(source.palette.bg);
    expect(parsed.lines.map(line => line.alignment)).toEqual(['left', 'right', 'left']);
    const path = parsed.lines[2].segments.find(segment => segment.type === 'path');
    expect(path?.foreground).toBe(source.palette.blue);
    expect(path?.properties.home_icon).toBe('~');
  });
  it('omits environment segments safely and reports development diagnostics', () => {
    expect(parsed.warnings.some(warning => warning.includes('git'))).toBe(true);
    const rendered = renderPrompt(parsed, promptContext);
    expect(rendered).toHaveLength(2);
    expect(rendered[0].html).toContain('guest');
    expect(rendered[1].html).toContain('~/blog');
    expect(rendered.map(line => line.html).join('')).not.toContain('{{');
  });
  it('draws a card as the theme transient prompt, with its state as git fields the theme decides how to show', () => {
    const storm = parseOhMyPoshTheme(stormSource);
    const clean = renderCardPrompt(storm, 'stacks', { working: false, behind: false });
    expect(clean).toContain('…/<span class="card-title-text">stacks</span>');
    expect(clean).toContain('✓');
    expect(renderCardPrompt(storm, 'stacks', { working: true, behind: true })).toMatch(/~[\s\S]*⇣/);
    // Without a state there is no git segment: only the path is bracketed.
    expect(renderCardPrompt(storm, 'stacks').match(/\[/g)).toHaveLength(1);
    expect(renderCardPrompt(storm, 'stacks')).not.toMatch(/{{|guest/);
    // A transient prompt without the path is followed by the item's name.
    const bare = parseOhMyPoshTheme({ transient_prompt: { template: '❯ ' }, blocks: [{ type: 'prompt', segments: [{ type: 'path' }] }] });
    expect(renderCardPrompt(bare, 'topic/')).toContain('<span class="card-command"><span class="card-title-text">topic/</span></span>');
    expect(renderCardPrompt(storm, '<b>x</b>')).not.toContain('<b>x');
  });
  it('shows an error segment only for a failed command', () => {
    const ok = renderPrompt(parsed, promptContext).at(-1)!.html;
    const failed = renderPrompt(parsed, { ...promptContext, status: 'error' }).at(-1)!.html;
    expect(failed.length).toBeGreaterThan(ok.length);
    expect(failed).toContain(source.palette.red);
  });
  it('escapes context and template HTML, and never executes unknown expressions', () => {
    const unsafe = renderPrompt(parsed, { ...promptContext, user: '<img src=x onerror=alert(1)>' }).map(line => line.html).join('');
    expect(unsafe).not.toContain('<img');
    expect(unsafe).toContain('&lt;img');
    const custom = parseOhMyPoshTheme({ palette: { blue: 'red; position:fixed' }, blocks: [{ type: 'prompt', segments: [{ type: 'text', template: '<script>alert(1)</script>{{ dangerous .UserName }}' }] }] });
    const html = renderPrompt(custom, promptContext)[0].html;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('dangerous');
    expect(custom.palette.blue).toBeUndefined();
  });
  it('supports explicit safe adapter overrides and independent prose tuning', () => {
    const theme = adaptOhMyPoshTheme(parsed, { prose: { foreground: '#ffffff' }, segmentOverrides: { NixShell: null } });
    const tokens = themeTokens(theme);
    expect(tokens['--site-bg']).toBe(source.palette.bg);
    expect(tokens['--prose-fg']).toBe('#ffffff');
    expect(tokens['--terminal-fg']).toBe(source.palette.fg);
    expect(theme.terminal.lines[0].segments.some(segment => segment.alias === 'NixShell')).toBe(false);
  });
  it('resolves palette aliases without looping on cycles', () => {
    const theme = parseOhMyPoshTheme({ palette: { a: 'p:b', b: 'p:a', blue: '#123456', link: 'p:blue' }, blocks: [] });
    expect(theme.palette.a).toBeUndefined();
    expect(theme.palette.link).toBe('#123456');
    expect(() => parseOhMyPoshTheme(null)).toThrow();
  });
});
