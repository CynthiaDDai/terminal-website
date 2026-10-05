import { describe, expect, it } from 'vitest';
import shellSource from '../fixtures/themes/1_shell.omp.json';
import installedShell from '../fixtures/site/themes/1_shell/1_shell.omp.json';
import teaSource from '../fixtures/themes/if_tea.omp.json';
import installedTea from '../fixtures/site/themes/if_tea/if_tea.omp.json';
import { createThemeCatalog } from '../../src/lib/theme/catalog';
import { themes, defaultTheme } from '../../src/lib/theme/registry';
import { parseOhMyPoshTheme, resolveColor } from '../../src/lib/theme/omp-parser';
import { expandTemplate } from '../../src/lib/theme/template';
import { adaptOhMyPoshTheme, themeTokens } from '../../src/lib/theme/omp-adapter';
import { renderPrompt } from '../../src/lib/theme/prompt-renderer';
import { mobilePrompt } from '../../src/lib/theme/mobile';
import storm from '../fixtures/site/themes/storm/storm.omp.json';
import stormDay from '../fixtures/site/themes/storm_day/storm_day.omp.json';

const context = { user: 'mira', host: 'website', cwd: '~/blog/long-page', status: 'ok' as const,
  now: new Date(2026, 9, 3, 15, 4, 5),
  pathLinks: [{ label: '~', path: '/' }, { label: 'blog', path: '/blog' }, { label: 'long-page', path: '/blog/long-page' }],
};

describe('folder-based theme discovery', () => {
  it('discovers the unmodified supplied theme alongside the existing themes', () => {
    expect(installedShell).toEqual(shellSource);
    expect(installedTea).toEqual(teaSource);
    expect(themes.map(theme => theme.id)).toEqual(expect.arrayContaining(['storm', 'paper', '1_shell', 'if_tea']));
    expect(defaultTheme.id).toBe('storm');
    expect(themes.find(theme => theme.id === '1_shell')?.name).toBe('1 Shell');
  });
  it('accepts additional folders with no registration or palette requirement', () => {
    const catalog = createThemeCatalog({ '/themes/new-theme/native.omp.json': shellSource });
    expect(catalog.themes.map(theme => theme.id)).toEqual(['new-theme']);
    expect(catalog.defaultTheme.name).toBe('New Theme');
  });
  it('uses optional local web overrides and a configured default independently of ordering', () => {
    const catalog = createThemeCatalog({ '/themes/a/native.omp.json': shellSource, '/themes/b/native.omp.json': shellSource }, {
      '/themes/b/native.omp.json': { name: 'My terminal', mode: 'light', chrome: { background: '#f4f1eb', foreground: '#30364d' }, syntax: { keyword: '#7250a2' } },
    }, { default: 'b', order: ['a', 'b'] });
    expect(catalog.defaultTheme.id).toBe('b');
    expect(catalog.defaultTheme.chrome.background).toBe('#f4f1eb');
    expect(catalog.defaultTheme.syntax.keyword).toBe('#7250a2');
    expect(catalog.defaultTheme.mode).toBe('light');
    expect(createThemeCatalog({ '/themes/a/native.omp.json': shellSource }, {}, { default: 'removed' }).defaultTheme.id).toBe('a');
  });
  it('keeps native prompt palette references independent of website overrides', () => {
    const parsed = parseOhMyPoshTheme({ palette: { blue: '#7aa2f7' }, blocks: [{ type: 'prompt', segments: [{ type: 'text', template: '<p:blue>prompt</>' }] }] });
    const theme = adaptOhMyPoshTheme(parsed, { chrome: { accent: '#ffffff' } });
    expect(themeTokens(theme)['--chrome-accent']).toBe('#ffffff');
    expect(renderPrompt(theme.terminal, context)[0].html).toContain('color:#7aa2f7');
  });
  it('reports invalid themes and ambiguous duplicate filenames', () => {
    expect(() => createThemeCatalog({ '/themes/bad/native.omp.json': {} })).toThrow('native.omp.json');
    expect(() => createThemeCatalog({ '/themes/a/native.omp.json': shellSource, '/themes/a/second.omp.json': shellSource })).toThrow('Duplicate');
    expect(() => createThemeCatalog({ '/themes/unsafe"/native.omp.json': shellSource })).toThrow('folder');
    expect(() => createThemeCatalog({})).toThrow('at least one');
  });
  it('keeps Storm Day geometry identical and ships companions only for the Storm pair', () => {
    expect({ ...stormDay, palette: storm.palette }).toEqual(storm);
    expect(themes.filter(theme => theme.mobile).map(theme => theme.id)).toEqual(['storm', 'storm_day']);
    expect(themes.find(theme => theme.id === 'storm_day')!.mode).toBe('light');
    const html = renderPrompt(mobilePrompt(defaultTheme), context).map(line => line.html).join('');
    expect(html).toContain('href="/blog/long-page"');
    expect(html).not.toContain('website');
    expect(renderPrompt(mobilePrompt(defaultTheme), context)).toHaveLength(2);
  });
  it('uses a compact fallback independently of an expansive desktop prompt', () => {
    const shell = themes.find(theme => theme.id === '1_shell')!;
    expect(shell.mobile).toBeUndefined();
    const html = renderPrompt(mobilePrompt(shell), context).map(line => line.html).join('');
    expect(html).toContain('href="/blog/long-page"');
    expect(html).not.toMatch(/Saturday|mira|website/);
    for (const invalid of [{ prompt: {}, unknown: true }, { mode: null }, { mode: 'sepia' }]) {
      expect(() => createThemeCatalog({ '/themes/a/native.omp.json': shellSource }, {}, { fallback: { invalidCompanion: 'error' } }, {
        '/themes/a/native.omp.json': invalid,
      })).toThrow('theme_mobile.json');
    }
  });
  it('lets absent web and mobile companions use configured colors and a custom prompt', () => {
    const catalog = createThemeCatalog({ '/themes/a/native.omp.json': shellSource }, {}, { fallback: {
      web: { mode: 'light', chrome: { background: '#fafafa', foreground: '#222222' } },
      mobile: { prompt: { blocks: [{ segments: [{ type: 'text', template: 'custom mobile' }] }] } },
    } });
    expect(catalog.defaultTheme.chrome.background).toBe('#fafafa');
    expect(catalog.defaultTheme.mode).toBe('light');
    expect(renderPrompt(mobilePrompt(catalog.defaultTheme), context)[0].html).toContain('custom mobile');
  });
  it('uses a valid local companion before the fallback and supports opting into the desktop mobile prompt', () => {
    const sources = { '/themes/a/native.omp.json': shellSource };
    const catalog = createThemeCatalog(sources, { '/themes/a/native.omp.json': { name: 'Local', chrome: { background: '#181818' } } }, {
      fallback: { web: { name: 'Fallback', chrome: { background: '#ffffff' } }, mobile: 'desktop' },
    });
    expect(catalog.defaultTheme.name).toBe('Local');
    expect(catalog.defaultTheme.chrome.background).toBe('#181818');
    expect(mobilePrompt(catalog.defaultTheme)).toBe(catalog.defaultTheme.terminal);
  });
  it('recovers from invalid optional companions with diagnostics while required OMP stays strict', () => {
    const sources = { '/themes/a/native.omp.json': shellSource };
    const invalidWeb = { '/themes/a/native.omp.json': { mode: 'sepia' } };
    const invalidMobile = { '/themes/a/native.omp.json': { prompt: null } };
    const catalog = createThemeCatalog(sources, invalidWeb, {}, invalidMobile);
    expect(catalog.defaultTheme.terminal.warnings).toContainEqual(expect.stringContaining('Using fallback.web'));
    expect(catalog.defaultTheme.terminal.warnings).toContainEqual(expect.stringContaining('Using fallback.mobile'));
    expect(renderPrompt(mobilePrompt(catalog.defaultTheme), context).map(line => line.html).join('')).toContain('href="/blog/long-page"');
    expect(() => createThemeCatalog(sources, invalidWeb, { fallback: { invalidCompanion: 'error' } })).toThrow('.web.json');
    expect(() => createThemeCatalog({ '/themes/broken/native.omp.json': null })).toThrow('native.omp.json');
    expect(() => createThemeCatalog(sources, {}, { fallback: { mobile: 'wrong' as 'compact' } })).toThrow('fallback.mobile');
  });
});

describe('palette-less Oh My Posh import', () => {
  const parsed = parseOhMyPoshTheme(shellSource);
  it('derives site and syntax colors from segments instead of falling back to Tokyo', () => {
    const theme = adaptOhMyPoshTheme(parsed);
    const tokens = themeTokens(theme);
    expect(theme.chrome.background).toBe('#17191f');
    expect(theme.chrome.foreground).toBe('#ffbebc');
    expect(theme.chrome.accent).toBe('#00c7fc');
    expect(tokens['--terminal-success']).toBe('#A9FFB4');
    expect(tokens['--terminal-error']).toBe('#ef5350');
    expect(tokens['--shiki-token-keyword']).toBe('#ee79d1');
    expect(tokens['--shiki-token-string-expression']).toBeTruthy();
    expect(tokens['--shiki-token-punctuation']).toBeTruthy();
    expect(themes.find(theme => theme.id === '1_shell')!.terminal.warnings).toContainEqual(expect.stringContaining('No terminal background'));
  });
  it('renders time, colored diamonds and exactly one navigable path', () => {
    const lines = renderPrompt(parsed, context);
    const html = lines.map(line => line.html).join('');
    expect(lines).toHaveLength(2);
    expect(html).toContain('Saturday');
    expect(html).toContain('3:04 PM');
    expect(html).toContain('color:#ff70a6');
    expect(html).toContain('color:#00c7fc');
    expect(html).toContain('href="/blog/long-page"');
    expect(html.match(/aria-label="Breadcrumb"/g)).toHaveLength(1);
    expect(html).not.toMatch(/&lt;#|{{|MEM:/);
  });
  it('evaluates foreground_templates against command status', () => {
    const ok = renderPrompt(parsed, context).at(-1)!.html;
    const error = renderPrompt(parsed, { ...context, status: 'error' }).at(-1)!.html;
    expect(ok).toContain('style="color:#A9FFB4"');
    expect(error).toContain('style="color:#ef5350"');
  });
  it('uses native default templates and preserves navigation when a theme has no path', () => {
    const bare = parseOhMyPoshTheme({ blocks: [{ type: 'prompt', segments: [{ type: 'session' }] },
      { type: 'prompt', alignment: 'right', segments: [{ type: 'text', template: 'right prompt' }] }] });
    const lines = renderPrompt(bare, context);
    expect(lines[0].html).toContain('mira@website');
    expect(lines.at(-1)?.alignment).toBe('left');
    expect(lines.at(-1)?.html).toContain('href="/blog/long-page"');
  });
  it('reports unknown expressions and does not execute HTML or template input', () => {
    const theme = parseOhMyPoshTheme({ blocks: [{ type: 'prompt', segments: [{ type: 'session',
      template: '{{ .UserName }}{{ exec "whoami" }}', leading_diamond: '<img src=x onerror=alert(1)>',
      foreground_templates: ['red;position:fixed'],
    }] }] });
    const html = renderPrompt(theme, { ...context, user: '<#ffffff><script>alert(1)</script>' }).map(line => line.html).join('');
    expect(theme.warnings).toContainEqual(expect.stringContaining('exec'));
    expect(html).not.toMatch(/<script>|<img|position:fixed|color:#ffffff/);
    expect(html).toContain('&lt;script&gt;');
    expect(parseOhMyPoshTheme({ palette: { invalid: '#12345' }, blocks: [] }).palette.invalid).toBeUndefined();
  });
});

describe('documented Oh My Posh rendering rules', () => {
  it('renders the unchanged if_tea file with its original Unicode and color overrides', () => {
    const parsed = parseOhMyPoshTheme(teaSource);
    const lines = renderPrompt(parsed, context);
    const html = lines.map(line => line.html).join('');
    expect(lines).toHaveLength(2);
    for (const glyph of ['╭─', '╰─', '\ue641', '\uf073', '\ue5ff', '\ue0b2', '\ue0b0', '\ue0c0', '\ue285', '\uf105', '\uf197']) {
      expect(html).toContain(glyph);
    }
    expect(html).toContain('Saturday');
    expect(html).toContain('3:04:05 PM');
    expect(html).toContain('color:var(--terminal-bg);background:#F8677b');
    expect(html).toContain('class="prompt-symbol" style="color:#ff8c94;background:transparent"');
    expect(html.match(/aria-label="Breadcrumb"/g)).toHaveLength(1);
    expect(html).not.toMatch(/•|&lt;transparent|&lt;#|{{|CPU:|RAM:/);
    const error = renderPrompt(parsed, { ...context, status: 'error' }).at(-1)!.html;
    expect(error).toContain('color:#ef5350');
  });

  it('preserves JSON Unicode escapes, literal symbols, and supplementary code points equally', () => {
    const escaped = JSON.parse('{"blocks":[{"segments":[{"type":"text","template":"\\uE641\\uF073\\udb80\\udd1b 世界"}]}]}');
    const literal = { blocks: [{ segments: [{ type: 'text', template: '\ue641\uf073\u{f011b} 世界' }] }] };
    const html = renderPrompt(parseOhMyPoshTheme(escaped), context)[0].html;
    expect(html).toBe(renderPrompt(parseOhMyPoshTheme(literal), context)[0].html);
    expect(html).toContain('\u{f011b}');
    expect(html).toContain('世界');
    expect(html).toContain('class="prompt-glyph" aria-hidden="true"');
  });

  it('supports foreground/background, empty components, keywords, and nested decorations', () => {
    const parsed = parseOhMyPoshTheme({ palette: { 'with spaces': '#abcdef' }, blocks: [{ segments: [{
      type: 'text', foreground: '#ffffff', background: '#111111',
      template: '<p:with spaces,#123456><b><u>both</u></b></> <,#654321>background</> <background,foreground>swapped</> <transparent,#ff0000>cutout</>',
    }] }] });
    const html = renderPrompt(parsed, context)[0].html;
    expect(html).toContain('color:#abcdef;background:#123456');
    expect(html).toContain('<strong><span style="text-decoration:underline">both</span></strong>');
    expect(html).toContain('color:#ffffff;background:#654321');
    expect(html).toContain('color:#111111;background:#ffffff');
    expect(html).toContain('color:var(--terminal-bg);background:#ff0000');
    expect(html).not.toContain('&lt;');
  });

  it('colors diamond caps separately and connects powerline backgrounds across visible segments', () => {
    const parsed = parseOhMyPoshTheme({ blocks: [{ segments: [
      { type: 'text', style: 'powerline', foreground: '#ffffff', background: '#123456', template: 'one', powerline_symbol: '\ue0b0' },
      { type: 'text', style: 'powerline', background: '#999999', template: '{{ if .Error }}hidden{{ end }}', powerline_symbol: '\ue0b0' },
      { type: 'text', style: 'powerline', foreground: 'parentForeground', background: '#abcdef', template: 'two', powerline_symbol: '\ue0b0' },
      { type: 'text', style: 'diamond', foreground: '#000000', background: '#456789', template: 'three', leading_diamond: '\ue0b6', trailing_diamond: '\ue0b4' },
    ] }] });
    const html = renderPrompt(parsed, context)[0].html;
    expect(html).toContain('class="prompt-symbol" style="color:#123456;background:#abcdef"');
    expect(html).toContain('class="prompt-segment segment-powerline" style="color:#ffffff;background:#abcdef"');
    expect(html.match(/class="prompt-symbol" style="color:#456789;background:transparent"/g)).toHaveLength(2);
    expect(html).not.toContain('#999999');
  });

  it('uses the incoming powerline symbol, explicit opening cap, and segment color keywords', () => {
    const parsed = parseOhMyPoshTheme({ blocks: [{ segments: [
      { type: 'text', style: 'powerline', background: '#123456', template: 'one', leading_powerline_symbol: '\ue0b6', powerline_symbol: '\ue0b0' },
      { type: 'text', style: 'powerline', background: '#abcdef', template: 'two', powerline_symbol: '\ue0b1' },
      { type: 'text', style: 'diamond', background: '#456789', template: 'three', leading_diamond: '<background,transparent>\ue0b6</>' },
    ] }] });
    const html = renderPrompt(parsed, context)[0].html;
    expect(html).toContain('class="prompt-symbol" style="color:#123456;background:transparent"><span class="prompt-glyph" aria-hidden="true">\ue0b6');
    expect(html).toContain('class="prompt-symbol" style="color:#123456;background:#abcdef"><span class="prompt-glyph" aria-hidden="true">\ue0b1');
    expect(html).toContain('style="color:#456789;background:transparent"><span class="prompt-glyph" aria-hidden="true">\ue0b6');
  });

  it('evaluates templates arrays with join and first_match, including whitespace trimming', () => {
    const make = (logic: string) => parseOhMyPoshTheme({ blocks: [{ segments: [{ type: 'text', templates_logic: logic,
      templates: ['{{ if .Error }}error{{ end }}', 'first', 'second'],
    }] }] });
    expect(renderPrompt(make('join'), context)[0].html).toContain('firstsecond');
    expect(renderPrompt(make('first_match'), context)[0].html).toContain('>first</span>');
    expect(renderPrompt(make('first_match'), { ...context, status: 'error' })[0].html).toContain('>error</span>');
    expect(expandTemplate(' left \n {{- .UserName -}} \n right ', context)).toBe(' leftmiraright ');
    const overridden = adaptOhMyPoshTheme(make('join'), { segmentOverrides: { text: 'replacement' } });
    expect(renderPrompt(overridden.terminal, context)[0].html).toContain('>replacement</span>');
  });

  it('makes derived syntax colors readable against the actual code background', () => {
    const theme = adaptOhMyPoshTheme(parseOhMyPoshTheme(teaSource));
    const luminance = (color: string) => [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
    const background = luminance(theme.prose.codeBackground);
    for (const color of Object.values(theme.syntax)) {
      const foreground = luminance(color);
      expect((Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('resolves ANSI names, xterm numbered colors, recursive palettes, and invalid values safely', () => {
    expect(resolveColor('lightBlue', {})).toBe('#0000ff');
    expect(resolveColor('196', {})).toBe('#ff0000');
    expect(resolveColor('244', {})).toBe('#808080');
    expect(resolveColor('p:one', { one: 'p:two', two: '#abcdef' })).toBe('#abcdef');
    expect(resolveColor('p:one', { one: 'p:two', two: 'p:one' })).toBeUndefined();
    for (const value of ['256', '-1', '#12345', 'red;position:fixed']) expect(resolveColor(value, {})).toBeUndefined();
    const parsed = parseOhMyPoshTheme({ blocks: [{ segments: [{ type: 'text', template: '<red;position:fixed,#ffffff>unsafe</><img src=x onerror=alert(1)>{{ .UserName }}' }] }] });
    const html = renderPrompt(parsed, { ...context, user: '<#ffffff,#000000>context</>' })[0].html;
    expect(html).not.toMatch(/<img|style="[^\"]*position|style="color:#ffffff;background:#000000/);
    expect(html).toContain('&lt;#ffffff,#000000&gt;context');
  });
});
