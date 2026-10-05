# Configuration

All settings are plain files in the repository. There is no dashboard or hosted service; edit a file, then rebuild (or refresh the development server).

| File | Controls |
| --- | --- |
| `src/config/site.json` | Your profile and every piece of personal wording in the templates |
| `src/config/themes.json` | Default theme, theme order, fallbacks for incomplete themes |
| `config.jsonc` | Appearance of the `fastfetch` command |
| `src/styles/fonts.css` | Fonts |
| `.env.production` | The public address used in builds you run yourself |

## site.json

`src/config/site.json` is checked on every build and page load in development. Unknown fields, malformed URLs or emails, duplicate friend aliases and invalid locales stop with a message that names each problem. Every field below is required unless marked optional; use `""` or `[]` to leave one empty.

```json
{
  "name": "Ada's notebook",
  "owner": "Ada Lovelace",
  "user": "ada",
  "host": "notebook",
  "description": "Notes on engines and numbers.",
  "bio": "Writes about analytical engines.",
  "wordmark": { "name": "ada", "suffix": "’s notebook" },
  "caption": "notes, engines, numbers",
  "homeFooter": ["mathematics", "machines", "poetry"],
  "pageFooter": "Take your time.",
  "notFound": {
    "title": "A path less travelled.",
    "description": "There isn’t a page at this address."
  },
  "lang": "en",
  "dateLocale": "en-GB",
  "feed": ["/blog"],
  "email": "ada@example.org",
  "github": "https://github.com/ada",
  "socials": [
    { "name": "Mastodon", "url": "https://social.example/@ada" }
  ],
  "friends": [
    { "alias": "charles", "name": "Charles Babbage", "url": "https://charles.example", "description": "Engines" }
  ],
  "activityLimit": 3
}
```

### Identity

| Field | Used for |
| --- | --- |
| `name` | Site name: browser titles, link previews, RSS |
| `owner` | Your name: browser title suffix, `fastfetch` USER block |
| `user`, `host` | The prompt, as `user@host` |
| `description` | Default description for search engines and link previews; RSS description |
| `bio` | One line about you: `fastfetch` and the mobile home page |

### Wording

| Field | Used for |
| --- | --- |
| `wordmark` | The site's name in the header. `name` is shown plainly and `suffix` in a quieter style, so `{ "name": "ada", "suffix": "’s notebook" }` reads **ada**’s notebook. On the home page it links to `/about` if that page exists |
| `caption` | A short line beside the wordmark on the home page |
| `homeFooter` | Words in the home page footer, separated by `·`. Each word may instead be `{ "text": "cats", "motto": "衔蝉入梦" }` (see [Mottos](#mottos)) |
| `pageFooter` | The line in the middle of the footer on every page except home. A list of lines works too: each page shows one of them, always the same one for the same page |
| `notFound` | Title and description of the 404 page, and optionally its `motto` and its own footer `quote` |
| `lang` | The page language, e.g. `en`, `zh-CN`. Screen readers and hyphenation use it |
| `dateLocale` | How dates are written on pages: `en-CA` gives "October 4, 2026", `en-GB` gives "4 October 2026", `zh-CN` gives "2026年10月4日" |

The keyboard hints on the 404 page are part of the template, not `site.json`.

### Mottos

A motto is a few decorative words paired with an English label, such as four Chinese characters. The motto sits tightly under its label, set in `--font-cjk` and sized in proportion to it, so the two read as one unit. Mottos are hidden from screen readers and from the site's search, and never replace the label. Leave them out and nothing changes. The pairing lives in `src/components/content/Paired.astro`, and its spacing and sizes in the `.paired` rules of `src/styles/chrome.css`.

```json
"mottos": { "index": "灯火阑珊", "search": "众里寻他", "toc": "栏杆拍遍" },
"homeFooter": ["writing", { "text": "cats", "motto": "衔蝉入梦" }],
"notFound": { "title": "A path less travelled.", "description": "There isn’t a page at this address.", "motto": "迷魂难招" }
```

| Where | Set with |
| --- | --- |
| The index handle at the right edge: two vertical columns | `mottos.index` |
| The search dialog's heading | `mottos.search` |
| The table of contents label | `mottos.toc` |
| A word in the home footer | `homeFooter` |
| Under a page's title | `motto` in the page's frontmatter, or in a folder's `index.md` (see [Writing](writing.md#frontmatter)) |
| Under the 404 title | `notFound.motto` |

### Theme switch

The switch in the top right corner shows the current theme's name. `themeSwitch` can give each theme (by its folder ID) a label of its own, with an optional motto, and replace the tooltip:

```json
"themeSwitch": {
  "title": "天东有若木，下置衔烛龙。—— 李贺《苦昼短》",
  "labels": {
    "storm": { "text": "dusk", "motto": "瞑为夜" },
    "pine_ink": { "text": "dawn", "motto": "视为昼" }
  }
}
```

Themes without a label keep their name. Screen readers always hear "Switch color theme".

### Content

| Field | Used for |
| --- | --- |
| `feed` | Folders whose dated pages go into `/rss.xml`, e.g. `["/blog"]`. Paths start with `/` and have no trailing slash; `["/"]` means every folder |
| `activityLimit` | How many recent pages `fastfetch` and the mobile home page list, from 1 to 10 |

### Links

| Field | Used for |
| --- | --- |
| `email` | `fastfetch` NETWORK block and the sample contact page. `""` hides it |
| `github` | Same places. An `http(s)` URL or `""` |
| `socials` | Extra links: `{ "name", "url" }`. The URL may be `http(s)` or `mailto:` |
| `friends` | Friends' websites for the `ssh` command and the mobile friends list (see below) |

Each friend has:

- `alias`: what visitors type after `ssh`. Lowercase letters, digits and hyphens, unique.
- `name`: shown in the list.
- `url`: an `http(s)` address. It opens in a new tab.
- `description` (optional): shown after the name.

Empty fields are simply left out of the site; nothing shows "no email".

## themes.json

`src/config/themes.json` controls which theme new visitors see. Themes themselves are folders in `src/themes/`; see [Themes](themes.md).

```json
{
  "default": "storm",
  "order": ["storm", "pine_ink"],
  "fallback": {
    "web": {},
    "mobile": "compact",
    "invalidCompanion": "fallback"
  }
}
```

| Field | Meaning |
| --- | --- |
| `default` | Theme ID (folder name) for visitors who haven't chosen one. If the folder no longer exists, the first theme in order is used |
| `order` | Order in `theme` listings and the theme button. Themes not listed come after, alphabetically. New theme folders work without being listed |
| `fallback.web` | Colors and options for themes that have no valid `.web.json`. Same format as a `.web.json` file. `{}` derives everything from the prompt |
| `fallback.mobile` | Mobile prompt for themes without a valid `theme_mobile.json`: `"compact"` (path and an arrow), `"desktop"` (the full prompt), or an object in `theme_mobile.json` format |
| `fallback.invalidCompanion` | What to do when an optional companion file is broken: `"fallback"` warns in the development server's terminal and uses the fallback; `"error"` stops the build |

A visitor's own choice, made with `theme <name>` or the theme button, is saved in their browser and always wins over `default`.

## config.jsonc (fastfetch)

The `fastfetch` command shows four blocks of information about the website:

| Block | Contents |
| --- | --- |
| USER | `owner` (linked to `/about` if it exists) and `bio` |
| SYSTEM | Number of pages, and the number of documents in each top-level section |
| ACTIVITY | The most recently dated or updated pages, up to `activityLimit`; `example` pages are skipped |
| NETWORK | `email`, `github`, `socials`, `/contact` if it exists, and the RSS feed |

The information is fixed; `config.jsonc` only sets its appearance. It is a native [fastfetch](https://github.com/fastfetch-cli/fastfetch) configuration file, so you can copy your own terminal's `~/.config/fastfetch/config.jsonc`, comments and trailing commas included. The site reads:

- `display.separator`: the text between labels and values.
- The first four modules whose `key` has no tree characters (`│ ├ └`): their `keyColor` and leading icon style the USER, SYSTEM, ACTIVITY and NETWORK headings, in that order.
- The first `key` containing `├` and the first containing `└`: the tree branches drawn before each row.
- `logo`, if it is either text or a web image:

```jsonc
"logo": { "type": "data", "source": "( o.o )" }      // text logo
"logo": { "source": "/avatar.png" }                   // image in public/avatar.png
```

Everything else is ignored. Hardware modules are not run, commands and format strings are not evaluated, and local file paths (such as a `/nix/store/…` logo) are skipped and never sent to the browser.

Color names such as `yellow` or `magenta` follow the active website theme, so they stay readable in light and dark themes. Nerd Font icons are shown with the bundled symbol font.

## Fonts

Every font is set in `src/styles/fonts.css`, through four variables:

```css
:root {
  --font-cjk: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC';
  --font-mono: 'Maple Mono', var(--font-cjk), 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  --font-prose: 'Charter', 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, var(--font-cjk), serif;
  --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', var(--font-cjk), sans-serif;
}
```

| Variable | Used for |
| --- | --- |
| `--font-mono` | The terminal, prompts, commands, listings, navigation and code |
| `--font-prose` | Article text |
| `--font-ui` | Headings inside articles, tables, captions |
| `--font-cjk` | Chinese and Japanese characters in all three |

A list is tried one character at a time: the browser uses the first font that has the character. Latin fonts have no Chinese characters, so Chinese text in any part of the site falls through to `--font-cjk`, and a page can mix English and Chinese without any markup.

The site ships two fonts in `public/fonts/`, listed with their sources and licenses in `public/fonts/README.txt`:

- **Maple Mono** (regular, italic, medium, semibold, bold; about 80 KB each) for `--font-mono`.
- **Symbols Nerd Font** for prompt icons. Its `@font-face` has a `unicode-range`, so it is downloaded only when a prompt uses an icon.

The other names are fonts already installed on visitors' systems; `--font-cjk` lists common Chinese system fonts on macOS, Windows and Linux.

**Use a font installed on your visitors' systems:** put its name in the list. Nothing is downloaded, and visitors who don't have it get the next font in the list.

```css
--font-prose: 'Iowan Old Style', 'Charter', Georgia, var(--font-cjk), serif;
```

**Ship a font with the site:**

1. Put its `.woff2` files in `public/fonts/`, with the font's license, and add it to `public/fonts/README.txt`.
2. Add an `@font-face` for each file to `fonts.css`. Copy one of the existing rules and change the name, file and `font-weight`/`font-style`.
3. Put the name at the start of a variable.

For example, to set Chinese text in [Huiwen Mincho](https://github.com/bosswnx/huiwenmincho-improved), saved as `public/fonts/huiwen-mincho.subset.woff2`:

```css
@font-face {
  font-family: 'Huiwen Mincho';
  src: url('/fonts/huiwen-mincho.subset.woff2') format('woff2');
  font-display: swap;
  size-adjust: 110%;
  unicode-range: U+2E80-2FDF, U+3000-33FF, U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF, U+FE30-FE4F, U+FF00-FFEF, U+20000-2FA1F;
}
:root { --font-cjk: 'Huiwen Mincho'; }
```

- A file name ending in `.subset.woff2` tells the build to cut the font down to the characters the built site actually contains. A complete CJK font is several megabytes; cut down to a site's few hundred characters, it is tens of kilobytes. The development server serves the complete file. Characters that visitors type, such as a search in Chinese, may be missing from the cut-down font and fall back to a system font.
- `unicode-range` limits the font to Chinese and Japanese characters, so it is not even requested by pages without them.
- `size-adjust` scales the font's glyphs without changing anything else. Use it when one font looks smaller or larger than its neighbours at the same size.

**Check:** in the browser's developer tools, select some text and open the "Fonts" (Firefox) or "Rendered fonts" (Chrome, under Computed) panel. It lists the fonts actually used.

## Public address

The build needs the site's public origin for canonical links, the sitemap, RSS and link previews. It is read, in order of priority, from:

1. the `PUBLIC_SITE_URL` environment variable, e.g. set by the GitHub Pages workflow or the NixOS module;
2. `PUBLIC_SITE_URL` in `.env.production` (production builds) or `.env` (any build);
3. the placeholder `https://example.com`.

```sh
# .env.production
PUBLIC_SITE_URL=https://ada.example.org
```

The value must be an origin: `https://` plus a host, with no path, query or fragment. Anything else stops the build. `.env` files are ignored by Git; `.env.example` shows the format.

`npm run check:release` prints the address a production build would use, and fails on placeholder or local addresses (`example.com`, `*.example`, `localhost`, `127.0.0.1`). Run it before building a release by hand.
