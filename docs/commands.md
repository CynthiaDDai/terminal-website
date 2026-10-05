# Commands and keys

This page describes what visitors can do. It is also a checklist for trying your site.

The terminal is a way to move around the website, not a shell. Every command works on the pages built from `src/content/`, and every page can also be reached with ordinary links, with or without JavaScript.

## Commands

| Command | What it does |
| --- | --- |
| `help` | List the commands |
| `pwd` | Show the current path, e.g. `~/blog` |
| `ls [path]` | List the pages and folders in a folder. Folders end in `/` |
| `cd <path>` | Go to a page or folder |
| `open <path or title>` | Like `cd`, but also accepts a page's title, e.g. `open Hello` |
| `back` | Go back in browser history |
| `home` | Go to `~` |
| `search <words>` | Search titles, descriptions, tags, paths and page text |
| `fastfetch` | Show the owner, site statistics, recent pages and links (see [Configuration](configuration.md#configjsonc-fastfetch)) |
| `ssh [friend]` | List friends' websites, or open one in a new tab |
| `theme [name]` | List the themes, or switch to one |
| `clear` | Clear the output |

Paths work like a shell's: `~`, `~/blog`, `/blog`, `blog`, `..`, `../..`, and `cd -` for the previous page. `cd` and `open` both open pages and folders.

## Keyboard

Shortcuts are ignored while typing in a text field, during IME composition, and with Ctrl, Alt or Cmd held, so they don't interfere with browser shortcuts.

| Key | Where | Action |
| --- | --- | --- |
| `:` | Anywhere | Focus the command line |
| `s` | Anywhere | Open search |
| `Tab` | Command line | Complete a command, path, theme name or friend alias. A unique folder gets a trailing `/` and its contents become the next suggestions |
| `↓` / `↑` | Command line | Move into the suggestions; on the home page with no suggestions, recall earlier commands |
| `Enter` | Command line or suggestion | Run the command, or accept the suggestion |
| `Escape`, `Shift+Tab` | Command line | Leave the command line |
| `Ctrl+L` | Command line | Clear the output |
| `Ctrl+C` | Command line | Clear the input (when no text is selected) |
| `Enter` | Search | Open the first result |
| `↓` / `↑` | Search | Move through the results |
| `Escape` | Search | Close search and return focus to where it was |

`/` is deliberately left free for browser extensions such as Vimium.

## Home page and content pages

On the **home page**, the terminal keeps every result until `clear` or until the visitor leaves the page, and scrolls to the newest output. Command history lasts for the browser tab.

On **content pages**, a command bar sits above the content. Its linked path is the page's breadcrumb. Each command replaces the previous result, `Escape` dismisses it, and there is no history.

The **theme switch** in the top right corner shows the current theme; clicking it moves to the next theme in `order` (see [Configuration](configuration.md#theme-switch)).

The **index** on the right edge of the screen lists the whole site. It opens on hover, keyboard focus or click, and marks the current section. Until a visitor first opens it, its handle twitches briefly a few seconds after each page load (never when the system asks for reduced motion).

## Phones and tablets

At widths up to 700 pixels, or on touch screens, the layout changes:

- The home page opens straight into the index of the site.
- Content pages have an `index +` menu, the linked current path, and buttons for search, commands and themes.
- The command button opens a sheet with one-tap `help` and `fastfetch`. "Type a command" opens a text field with a completion button; it does not open the keyboard until tapped.
- The theme button lists all themes.
- `Escape`, tapping outside, or the close button closes a sheet.

Theme choice is saved in the browser and shared between desktop and mobile.

## Without JavaScript

Everything needed for reading works without JavaScript: pages, section listings, the index, the article table of contents and all links. The command line, search and theme switching need JavaScript.
