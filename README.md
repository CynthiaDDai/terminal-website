# Terminal personal website

A personal website that looks and feels like a terminal, without pretending to be one. The home page is a shell prompt where visitors can type `ls`, `cd`, `search` or `fastfetch`. Every page is also an ordinary, readable article that works with plain links, on phones, and without JavaScript.

**Your content folder is your website.** A Markdown file becomes a page and a folder becomes a section. Navigation, commands, search and the RSS feed follow automatically.

- Pages in Markdown or MDX, with math (KaTeX), highlighted code, footnotes, and download cards for PDFs
- Commands with tab completion, path navigation (`..`, `~`, `cd -`) and full-text search, on every page
- Themes taken directly from [Oh My Posh](https://ohmyposh.dev) prompt files: drop one from the [theme gallery](https://ohmyposh.dev/docs/themes) into a folder and it styles the whole site
- A touch-first layout for phones
- Static output: host it on GitHub Pages, any static host, or NixOS with Caddy

## Quick start

Fork this repository and rename the fork to `<your-user>.github.io`; [Getting started](docs/getting-started.md) walks through it. Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev        # http://127.0.0.1:4321
npm run build      # checks everything and writes the site to dist/
```

On NixOS, run `nix-shell` first.

## Documentation

| Guide | For |
| --- | --- |
| [Getting started](docs/getting-started.md) | From a fresh copy to a published site, step by step |
| [Writing content](docs/writing.md) | Pages, folders, naming rules, frontmatter, file cards, drafts, RSS |
| [Configuration](docs/configuration.md) | `site.json`, `themes.json`, `fastfetch` style, public address |
| [Themes](docs/themes.md) | Adding Oh My Posh themes, website colors, mobile prompts |
| [Commands and keys](docs/commands.md) | What visitors can type and press |
| [Deploying](docs/deploying.md) | GitHub Pages, custom domains, other hosts, NixOS |
| [Development](docs/development.md) | Architecture, project layout, tests |

## Credits

Designed and directed by [Cynthia](https://github.com/CynthiaDDai). The code and documentation were written by Claude (Anthropic) using [Claude Code](https://claude.com/claude-code).

## License

See [LICENSE](LICENSE). Included themes and fonts keep their own licenses; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
