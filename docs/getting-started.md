# Getting started

This guide takes you from the template to your own published website. Each step ends with a way to check that it worked.

You need Node.js 22.12 or newer and Git. Nix is optional; see [Development](development.md#nixos) if you use NixOS.

## Get your own copy

On GitHub, open [the template](https://github.com/CynthiaDDai/terminal-website) and click **Fork**. In your fork, open **Settings → General** and rename it to `<your-user>.github.io`, the name GitHub Pages uses for a personal site. Then clone it:

```sh
git clone https://github.com/<your-user>/<your-user>.github.io.git
cd <your-user>.github.io
```

## 1. Run the site locally

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4321`.

**Check:** the home page shows a terminal with a prompt. Type `help` and press Enter; a list of commands appears. Press `s` to open search.

Leave `npm run dev` running while you work. Content changes appear when you refresh the page; theme changes reload the page by themselves.

## 2. Put your name on it

Open `src/config/site.json`. Every piece of personal wording in the page templates lives here. At minimum, change:

```json
{
  "name": "Ada's notebook",
  "owner": "Ada Lovelace",
  "user": "ada",
  "host": "notebook",
  "description": "Notes on engines and numbers.",
  "bio": "Writes about analytical engines.",
  "wordmark": { "name": "ada", "suffix": "’s notebook" }
}
```

`user` and `host` appear in the prompt as `ada@notebook`. The other fields are described in [Configuration](configuration.md#sitejson).

**Check:** refresh the home page. The wordmark and prompt use the new names. Type `fastfetch`; the USER block shows your name and bio. If a field is wrong, the page shows an error naming the field.

## 3. Write a page

Create `src/content/hello.md`:

```md
---
title: Hello
description: The first page.
date: 2026-10-04
---

This is my first page. It supports **Markdown**, footnotes and math such as $e^{i\pi} + 1 = 0$.
```

**Check:** visit `http://127.0.0.1:4321/hello`. On the home page, `ls` lists `hello` and `cd hello` opens it.

Now make a section. Create the folder `src/content/blog/` and put `first-post.md` inside it.

**Check:** `/blog` exists and lists the post, although you never wrote a page for it. `/blog/first-post` opens the post.

File and folder names must be lowercase ASCII words joined by hyphens, such as `first-post.md`. The title shown to readers can be anything, in any language; put it in `title`. [Writing content](writing.md) explains folders, frontmatter, file cards and everything else about pages.

## 4. Replace the sample content

Delete the sample pages you don't need from `src/content/` and rewrite `about.md`, `uses.md` and `contact.mdx`. Pages marked `example: true` show an "Example content" label and are left out of the RSS feed and `fastfetch`; remove the flag once a page is yours.

Files in `public/` are served as they are: `public/cv.pdf` is at `/cv.pdf`.

**Check:**

```sh
npm run build
```

The build checks file names, `site.json`, types and every internal link, then writes the site to `dist/`. It stops with a message that names the problem if anything is wrong.

## 5. Choose a theme

Type `theme` on the site to list the themes, and `theme pine_ink` to try one. To change the default for new visitors, edit `src/config/themes.json`:

```json
{ "default": "pine_ink", "order": ["pine_ink", "storm"] }
```

To make your own theme from an Oh My Posh prompt, see [Themes](themes.md).

**Check:** open the site in a private window. It uses the new default.

## 6. Set the public address

Search engines, RSS readers and link previews need the site's full address. Create `.env.production`:

```sh
PUBLIC_SITE_URL=https://ada.example.org
```

Use the origin only: no path and no trailing slash. GitHub Pages and the NixOS module set this for you; you need the file only for builds you run yourself.

**Check:**

```sh
npm run check:release
```

It prints the address, or refuses placeholder and local addresses such as `https://example.com`.

## 7. Publish

The simplest route is GitHub Pages:

1. Make sure the repository is named `<your-user>.github.io` (see [Get your own copy](#get-your-own-copy)).
2. In the repository, open Settings → Pages and set Source to **GitHub Actions**.
3. Push to `main`. The included workflow builds and publishes the site.

**Check:** the Actions tab shows a green "Deploy to GitHub Pages" run, and `https://<your-user>.github.io` shows your site.

The site must be served from the root of a domain, so a repository with any other name needs a custom domain. [Deploying](deploying.md) covers custom domains, other static hosts and NixOS with Caddy.

## Keep up with the template

Improvements to the template can be merged into your site at any time. On GitHub, the **Sync fork** button on your repository does it. From the command line, add the template once:

```sh
git remote add template https://github.com/CynthiaDDai/terminal-website.git
```

and then, whenever you want the latest version:

```sh
git pull template main
```

The template changes code, styles and docs; your changes are mostly in `src/content/`, `src/config/` and `public/`, so the two rarely touch the same lines. If Git reports a conflict in a sample page you have deleted or a setting you have changed, keep your version.

## Where to go next

- [Writing content](writing.md): pages, folders, frontmatter, file cards, drafts, RSS
- [Configuration](configuration.md): every field in `site.json`, `themes.json` and `config.jsonc`
- [Themes](themes.md): adding and adapting Oh My Posh themes
- [Commands and keys](commands.md): what visitors can type and press
- [Deploying](deploying.md): hosting options
- [Development](development.md): how the code fits together and how to test it
