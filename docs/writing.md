# Writing content

Your content folder is your website. A file becomes a page, and a folder becomes a section. Navigation, `ls`, `cd`, search, `fastfetch` and the RSS feed all come from the same folder tree. No route table or navigation list needs editing.

## Files and folders

Pages live in `src/content/`, as Markdown (`.md`) or MDX (`.mdx`):

```text
src/content/
├── about.md                    → /about
├── uses.md                     → /uses
├── blog/
│   ├── index.md                → /blog (optional introduction)
│   └── first-post.md           → /blog/first-post
└── notes/
    └── mathematics/
        └── topology.md         → /notes/mathematics/topology
```

- `/blog`, `/notes` and `/notes/mathematics` are section pages that list their direct children. They are generated for you; `index.md` is only needed to customize one (see [Section pages](#section-pages)).
- A folder becomes a page only when it contains at least one published document. Folders that hold only images, only drafts, or nothing at all do not appear on the site.
- A page and a folder cannot share a path: `about.md` next to an `about/` folder with documents in it stops the build. Move the page to `about/index.md` instead.
- `/404`, `/rss.xml`, `/sitemap.xml` and `/_astro` belong to the site; content at those paths stops the build.

The build never writes into `src/content/`.

### Naming rules

Folder and file names (without the extension) are lowercase ASCII letters and digits, joined by single hyphens:

| Allowed | Not allowed |
| --- | --- |
| `first-post.md` | `First Post.md`, `first_post.md`, `first--post.md` |
| `notes-2026-spring.md` | `notes.2026.md`, `c#-tips.md`, `why?.md` |
| `machine-learning/` | `机器学习/`, `Machine Learning/` |

A name that breaks these rules stops the build with a list of every file to rename. The name is only the URL; the title readers see comes from the `title` frontmatter field and can use any words, capitals or script.

Names that start with `_` or `.` are ignored completely: they are never pages and their names are never checked. Use them for things that live beside your writing:

```text
src/content/
├── _drafts/            ignored: scratch work
├── .obsidian/          ignored: editor settings
└── blog/
    ├── _assets/        ignored: images for the posts
    └── first-post.md
```

Files other than `.md` and `.mdx`, such as images, are never pages, and their names are not checked.

## Frontmatter

Frontmatter is the optional YAML block at the top of a file. Every field is optional; a file that contains only `Hello world.` is a valid page titled after its file name (`my-cool-page.md` becomes "My Cool Page").

```yaml
---
title: "A new thought"
description: "What this page is about."
date: 2026-10-03
tags: [mathematics, teaching]
---
```

| Field | Type | Effect |
| --- | --- | --- |
| `title` | text | Page title, and the name in navigation, listings and search |
| `description` | text | Shown under the title, in listings, `ls`, search results and link previews |
| `date` | date | Publication date. Dated pages can appear in RSS and in `fastfetch` activity |
| `updated` | date | Shown as "Updated …" at the end of the page; used instead of `date` for `fastfetch` activity |
| `tags` | list | Shown on the page and in listings; searchable |
| `order` | number | Position among siblings; lower numbers first |
| `draft` | true/false | `true` keeps the page off the site entirely (see [Drafts](#drafts)) |
| `example` | true/false | Labels the page "Example content" and keeps it out of RSS and `fastfetch` |
| `status` | text | Shown next to the date; used by [grouped listings](#grouped-listings) |
| `authors` | text | Byline under the title, and in listings |
| `venue` | text | Shown next to the date, and in listings, e.g. `arXiv 2503.01234` |
| `links` | map | Label → URL buttons on the page and in its listing (see [Papers and other works](#papers-and-other-works)) |
| `repo` | URL | A "Source code ↗" link |
| `demo` | URL | A "Visit project ↗" link |
| `motto` | text | Decorative words set tightly under the title, such as `雪泥鸿爪`; hidden from screen readers and search (see [Mottos](configuration.md#mottos)) |
| `show_children` | true/false | Section pages only: `false` hides the list of children |
| `groups` | map | Section pages only: splits the listing into headed groups |

The URL always comes from the file's location. A `slug` field does not change it.

Pages with at least two `##` or `###` headings get an "on this page" table of contents, drawn as a tree of sections (`##`) and subsections (`###`). On wide screens it stays beside the article while the reader scrolls and marks the section being read; on narrower screens it sits under the title and lists only the sections.

## Section pages

Without an `index.md`, a folder's page is generated: its title comes from the folder name (`machine-learning` → "Machine Learning"), its description is `Explore ~/machine-learning.`, and it lists its children.

Add `index.md` (or `index.mdx`) to the folder to change any of that:

```md
---
title: Writing
description: Ideas with room to breathe.
order: 20
---

I write about software, design and mathematics.
```

The body appears as an introduction above the list of children.

| `index.md` can | How |
| --- | --- |
| Rename the section | `title`. This is the only way to give a folder a name with capitals, spaces or another script |
| Describe it in `ls`, listings and search | `description` |
| Move it among its siblings | `order` |
| Hide the list of children | `show_children: false`. The children are still reachable through navigation, commands and search |
| Withdraw the whole folder | `draft: true` |
| Group its children | `groups` |

An `index.md` stands for its folder: there is never an `/index` URL or a separate search result. A root `src/content/index.md` adds an introduction and listing below the home terminal; it cannot be a draft, since that would withdraw the whole site.

Sections cannot have their own theme or colors. The visitor's chosen theme applies everywhere.

### Order

Siblings are sorted by:

1. `order`, lowest first. Entries with an `order` come before entries without one.
2. Folders before documents.
3. Documents by `date`, newest first, if every document in the folder has a date. Otherwise alphabetically by file name.

To fix the order of the top-level sections, give each section's `index.md` (or each root page) an `order`, e.g. 10, 20, 30, leaving gaps for later additions.

### Grouped listings

A section can list its children under headings, by `status`. Put `groups` in its `index.md`, mapping each status value to a heading, in the order the headings should appear:

```yaml
# research/index.md
---
title: Research
groups:
  Publication: Publications
  Preprint: Preprints
---
```

```yaml
# research/tide-pool-survey.md
---
title: A survey of tide pools
status: Preprint
---
```

Every child of a grouped section needs one of the listed statuses, or the build stops and names the file. Empty groups are omitted. Changing `status: Preprint` to `status: Publication` moves a work to the other group without changing its URL.

List groups from finished to in progress. Themes can mark work outside the first group as unfinished (Storm shows `~` instead of `✓`).

## Papers and other works

`authors`, `venue` and `links` describe a paper, talk, project or any other work. They appear on the work's own page and in its parent's listing, where each link is directly clickable:

```yaml
---
title: A survey of tide pools
status: Preprint
authors: A. Author, B. Coauthor
venue: arXiv 2503.01234
links:
  arXiv: https://arxiv.org/abs/2503.01234
  PDF: /research/tide-pools.pdf
---
Optional abstract, notes or errata.
```

Link targets must start with `/` (a file on this site) or `http://`/`https://`. External links get a `↗`.

For software projects, `repo` and `demo` add "Source code ↗" and "Visit project ↗" links.

## Links

Link to other pages with absolute site paths:

```md
See [my note](/notes/mathematics/topology).
```

Relative links such as `./topology.md` are not rewritten and will break. `npm run build` checks every internal link and image in the built site and fails if one points at a missing page or file.

## Images

Either keep the image beside the page (or in an `_assets/` folder) and use a relative path:

```md
![A diagram of the route model](./_assets/diagram.png)
```

or put it in `public/` and use an absolute path:

```md
![A diagram of the route model](/diagram.png)
```

Write alt text that says what the image shows.

## File cards

PDFs and other downloads are shown as cards instead of being embedded, because browser PDF viewers ignore the site theme and work poorly on phones.

A link that stands alone on the first line of a paragraph, and points at a file in `public/`, becomes a card. The link text is the card's title, and any following lines in the same paragraph are its description:

```md
[A short talk](/assets/slides/short-talk.pdf)
Slides from a ten-minute talk, with a formula for the Fibonacci numbers.
```

The card shows the file type, size, a description (Markdown and math work in it) and a `pull` button that downloads the file.

To mark a file as unfinished, give the link the title `"wip"`:

```md
[Lecture notes](/notes/lecture-notes.pdf "wip")
```

Any other link title on a card stops the build. A link inside a sentence stays an ordinary link.

## Drafts

`draft: true` keeps a page off the site: it is not built in production or in development, it has no URL, and it is not in navigation, search, RSS or the sitemap. A draft `index.md` withdraws its whole folder.

Drafts are still in your repository. Anything truly private belongs outside it, or in an `_`-prefixed folder that is listed in `.gitignore`.

## Markdown features

- Headings get stable anchors, so `/notes/topology#compactness` links to a section.
- Tables, footnotes, task lists and strikethrough (GitHub-flavored Markdown).
- Math: `$inline$` and `$$display$$`, rendered with KaTeX at build time. A LaTeX error stops the build with its location. Wide equations, tables and code scroll sideways instead of widening the page.
- Fenced code blocks with a language (` ```ts `) are highlighted in the active theme's colors.

### MDX

Use `.mdx` when a page needs a component or data. MDX pages can read `site.json`:

```mdx
---
title: Contact
---

import site from '@site/profile';

{site.email && <p><a href={`mailto:${site.email}`}>{site.email}</a></p>}
```

An ordinary `contact.md` with the links written out works just as well.

## RSS

`/rss.xml` lists dated pages from the folders named in `feed` in `src/config/site.json`:

```json
"feed": ["/blog", "/research"]
```

Use `["/"]` to include every dated page. Pages without a date, and pages marked `example: true`, are left out of the feed but are otherwise normal pages.

## Publishing changes

The site is static: `npm run build` reads the folder tree and writes `dist/`. Adding, editing, moving or deleting a file takes effect on the next build and deploy. With the GitHub Pages workflow, that is the next push to `main`.

Moving a file changes its URL, and the old URL stops working. Static hosts such as GitHub Pages cannot redirect it.
