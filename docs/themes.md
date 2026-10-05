# Themes

A theme is an [Oh My Posh](https://ohmyposh.dev) prompt configuration. The site draws the prompt from it and derives the colors of every page from its palette: prompt, navigation, articles, command output and code highlighting. Visitors switch themes with `theme <name>` or the theme button, and their choice is saved in their browser.

The site includes two themes:

| ID | Look | Source |
| --- | --- | --- |
| `storm` | Dark, default | Original layout with the Tokyo Night Storm palette |
| `pine_ink` | Light | Storm's layout in ink on rice paper: pine-soot ink, indigo, azurite and cinnabar |

More themes are in the [Oh My Posh theme gallery](https://ohmyposh.dev/docs/themes); download any `.omp.json` from there and [add it](#add-a-theme).

Credits and licenses are in [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md). If you add someone else's theme, add its notice there too.

## Add a theme

1. Create a folder in `src/themes/`. Its name is the theme ID: lowercase letters, digits, `-` and `_`.
2. Put exactly one `.omp.json` file in it. The file name doesn't matter.
3. Refresh the development server, or rebuild.

```text
src/themes/
└── my-theme/
    └── my-theme.omp.json
```

**Check:** type `theme` on the site. `my-theme` is in the list; `theme my-theme` switches to it.

Nothing else needs registering. To make it the default, or move it in the list, edit `src/config/themes.json` (see [Configuration](configuration.md#themesjson)).

The folder rules are strict: a folder with no `.omp.json`, or more than one, stops the build with a message. Loose files in `src/themes/` and folders nested deeper are ignored.

**Check what was left out.** In development, the terminal running `npm run dev` lists, per theme, segments and template expressions the browser can't show:

```text
[Oh My Posh: my-theme]
Omitted unsupported or environment-dependent segment: git
Unsupported path template expression: .Segments.Node.Full
```

These are warnings, not errors; the rest of the prompt still works.

## What carries over from Oh My Posh

A browser has no shell, so the site supports the parts of a prompt that make sense for a website, and leaves out the rest.

**Segments.** `text`, `session`, `path`, `status` and `time`. Git, language runtimes, cloud, OS, hardware and execution-time segments are omitted. A theme without a path segment gets the site's breadcrumb added automatically.

**Template values.**

| Value | On the site |
| --- | --- |
| `.UserName`, `.HostName` | `user` and `host` from `site.json` |
| `.Path`, `.PWD`, `.Segments.Path.Path` | The current page as a path, e.g. `~/blog/first-post`, with each part linked |
| `.Folder` | The last part of the path |
| `.Code`, `.Error` | `0`/false normally; `1`/true after a command fails |
| `.Root`, `.SSHSession` | Always false |
| `.CurrentDate \| date .Format` | The time when the prompt is drawn, with Go date layouts (year, month, weekday, day, hours, minutes, seconds, AM/PM; not time zones or fractions of a second) |

Conditions (`if`, `else if`, `else`, `end`) test one thing at a time: `.Error`, `.Root`, `.SSHSession`, the card fields below, `.Segments.Contains "Path"` (or `"Git"`), or a comparison of `.Code` such as `gt .Code 0` (`eq`, `ne`, `gt`, `ge`, `lt`, `le`). `and`, `or`, `not` and other Go template functions are not supported: an `if` the site can't evaluate hides both of its branches, and the development server lists it. The `templates` list with `join` and `first_match`, and Go's `{{-`/`-}}` whitespace trimming, work as in Oh My Posh.

**Colors and styles.** Hex colors, palette references (`p:blue`), ANSI color names, xterm 256-color numbers, `foreground_templates`/`background_templates`, `transparent`, and inline `<foreground,background>text</>` markup including `parentForeground` and `parentBackground`. `plain`, `powerline` and `diamond` styles, left and right alignment, and block newlines. Bold, italic, underline, overline, strikethrough and dim.

**Not supported.** Arbitrary Go templates, dynamic palettes, gradients, Oh My Posh's path-shortening styles, the terminal title, and pixel-exact terminal geometry.

**Icons.** Nerd Font icons display without visitors installing anything: the site bundles the complete Symbols Nerd Font, so any icon in a new theme works.

**Safety.** Theme files never run commands or insert HTML. All text is escaped.

### Listing cards and the transient prompt

Each entry in a section listing, and each [file card](writing.md#file-cards), is drawn as a short prompt using the theme's `transient_prompt`. Its path is the item's name, such as `…/first-post` or `…/notes/` for a folder. If the transient template leaves out the path, the name follows it; a theme without a transient prompt uses the path and `❯`.

Cards offer their state as git fields, so the theme decides how to show it:

| Item | `.Segments.Contains "Git"` | `.Segments.Git.Working.Changed` | `.Segments.Git.Behind` |
| --- | --- | --- | --- |
| Ordinary page or folder | false | | |
| Work in the first group of a [grouped listing](writing.md#grouped-listings) | true | false | false |
| Work in a later group | true | true | false |
| File card | true | false | true |
| File card marked `"wip"` | true | true | true |

Storm shows these as `✓`, `~` and `⇣`.

## Website colors

The site needs more colors than a prompt defines: a page background, body text, links, borders, and colors for code. It derives them like this:

- If the palette defines semantic names, they are used. Storm's palette has `bg`, `fg`, `muted`, `blue`, `green` and so on.
- Otherwise, colors come from the segments and inline markup. Text colors are adjusted until they have readable contrast.
- A prompt usually doesn't record its terminal's background, so a missing background becomes a neutral dark or light one.
- Code colors are derived from the prompt palette.

The result is an adaptation, not a recreation of a particular terminal or editor theme. To set colors exactly, add a companion file.

## Companion: `.web.json`

Put a file named after the prompt file, with `.web.json` instead of `.omp.json`, beside it:

```text
src/themes/my-theme/
├── native.omp.json
└── native.web.json
```

```json
{
  "name": "My terminal",
  "mode": "dark",
  "chrome": { "background": "#17191f", "foreground": "#e6e6e6", "accent": "#00c7fc" },
  "prose": { "link": "#00c7fc", "codeBackground": "#101216" },
  "syntax": { "comment": "#b0b5bf", "keyword": "#ee79d1", "string": "#a9ffb4" },
  "segmentOverrides": { "time": null }
}
```

Every field is optional:

| Field | Meaning |
| --- | --- |
| `name` | Display name in the theme list. Default: the folder name in title case |
| `mode` | `"dark"` or `"light"` |
| `chrome` | Page colors: `background`, `foreground`, `muted`, `border`, `accent` |
| `prose` | Article colors: `foreground`, `muted`, `link`, `codeBackground` |
| `syntax` | Code colors: `comment`, `string`, `keyword`, `constant`, `function`, `parameter` |
| `segmentOverrides` | Segment type or alias → replacement text, or `null` to remove the segment |

Colors are hex values or palette references such as `p:blue`. Unknown fields are rejected.

## Companion: `theme_mobile.json`

Phones show a shorter prompt. Without a mobile companion, a theme uses the `fallback.mobile` setting in `themes.json`: by default the current path and an arrow, in the theme's colors.

To design the mobile prompt yourself, add `theme_mobile.json` to the theme folder:

```json
{
  "prompt": {
    "blocks": [
      { "type": "prompt", "segments": [
        { "type": "path", "style": "plain", "foreground": "p:blue", "template": "{{ .Path }}" }
      ] },
      { "type": "prompt", "newline": true, "segments": [
        { "type": "text", "style": "plain", "foreground": "p:green", "template": "❯ " }
      ] }
    ]
  }
}
```

`prompt` is an Oh My Posh prompt object and can use the main theme's palette. The file also accepts `mode`, `chrome`, `prose`, `syntax` and `segmentOverrides`, as in `.web.json`; colors not set here are inherited from the desktop theme. The mobile layout itself is shared by all themes: this file changes the prompt and colors, not the navigation or page structure.

Both included themes have mobile companions. Themes you add use the fallback until you write one.

## Broken companion files

Companion files are optional, so a missing one is never an error. A broken one (invalid JSON, an unknown field, a bad color) is handled according to `fallback.invalidCompanion` in `themes.json`:

- `"fallback"` (default): the development server prints a warning and the theme uses the fallback settings.
- `"error"`: the build stops. Use this while working on a theme if you prefer.

A valid companion is always used as it is; fallback settings are not merged into it. The `.omp.json` file itself is required, and errors in it always stop the build.

In development, adding, changing or removing any file in `src/themes/`, or editing `themes.json`, reloads the page with the new theme data.

## Making a variant

Pine Ink is Storm with a different `palette` block, and its `.web.json` sets `"mode": "light"`. To make your own variant, copy a theme folder, rename the folder and its files, and change the palette. The palette names map to the site like this: `bg`, `fg`, `muted` and `surface` are the page, text, quiet text and borders; `blue` is the main accent; `cyan` colors links; `magenta`, `green` and `yellow` color code keywords, strings and constants; `red` marks errors.
