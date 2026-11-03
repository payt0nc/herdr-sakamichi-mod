# Contributing to herdr-sakamichi-mod

Contributions use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for every commit and [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for releases. This page covers the development loop, both rules, and what a pull request needs.

## Development setup

You need the Herdr desktop app (`herdr-app` on your `PATH`) and Node.js for the tests. The tests load `lib.js` as an ES module without a `package.json`, which works on Node.js 26.13 (tested 2026-11-03); older versions may need `"type": "module"`.

1. Install the layout and the three themes once, as in the README's Install section. While developing you can symlink these files instead of copying them. Herdr loads a symlinked layout or theme, but only rereads it when you switch layouts (`ctrl-shift-l` twice).
2. Copy the mods into Herdr after each edit:

   ```sh
   ./scripts/dev-sync.sh
   ```

   This rsyncs every folder in `n46/mods/` into `~/.config/herdr-app/mods/` and runs `herdr-app check` on each one. Herdr reloads a copied mod by itself. Don't symlink mod folders: Herdr doesn't load their `svg()` icons or notice their edits.
3. Run the tests:

   ```sh
   node tests/lib.test.mjs
   ```

   They cover the pure functions in `n46/mods/46-agents/lib.js` and print `ok`.
4. Look at the result:

   ```sh
   herdr-app status          # "errors": [] after your change
   herdr-app shot shot.png   # a PNG of the window
   ```

## Commit messages: Conventional Commits

Every commit message follows this shape:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

- `description`: imperative, lowercase, no period at the end, under 72 characters.
- `body`: what changed and why, wrapped at 72 characters.
- `footer`: `BREAKING CHANGE: <what breaks and how to migrate>`, or references such as `Refs: #12`.

### Types

| Type | Use for | Version bump |
| --- | --- | --- |
| `feat` | A new feature people can see or use | MINOR |
| `fix` | A bug fix | PATCH |
| `perf` | Faster or lighter, same behavior | PATCH |
| `refactor` | Code change with no behavior change | none |
| `style` | Formatting only | none |
| `test` | Tests only | none |
| `docs` | README, RECIPE, CONTRIBUTING, AGENT.md | none |
| `build` | Packaging or the files a release contains | none |
| `ci` | CI configuration | none |
| `chore` | Maintenance that fits nothing above | none |
| `revert` | Reverts an earlier commit | as the reverted change |

### Scopes

| Scope | Covers |
| --- | --- |
| `layout` | `n46/layouts/` |
| `theme` | `n46/themes/` (`n46`, `s46`, `h46`) |
| `agents` | The Members list in `n46/mods/46-agents/` |
| `settings` | The settings dialog: group switch, avatars, official import (`settings.js`) |
| `statusline` | `statusline.mjs` and the session files it writes |
| `pane` | `n46/mods/46-pane/` |
| `tabs` | `n46/mods/46-tabs/` |
| `members` | The rosters in `members.json` |
| `scripts` | `scripts/` |
| `docs` | Documentation only; usually with type `docs` |

The scope is optional when a change spans several of them.

### Breaking changes

Mark a breaking change with `!` after the type or scope, and explain the migration in a `BREAKING CHANGE:` footer:

```
feat(statusline)!: rename the quota field to hp

BREAKING CHANGE: session files use "hp" instead of "quota". Restart
Claude Code sessions so statusline.mjs rewrites their files.
```

### Examples

```
feat(agents): show the model name after the member name
fix(settings): keep official photos refreshable when sips is missing
perf(agents): reread only the session files that changed
docs: add Japanese and Traditional Chinese READMEs
chore(members): add the 7th generation to the roster
```

## Versioning: Semantic Versioning

Releases are git tags `vMAJOR.MINOR.PATCH` on `main`, with release notes generated from the commits since the previous tag.

### The public interface

A version number describes compatibility of what an installed copy and its owner depend on:

| Interface | Examples |
| --- | --- |
| Installed names | Layout `46`, themes `n46`, `s46` and `h46`, mods `46-agents`, `46-pane` and `46-tabs` |
| Config | The keys of `members.json`: `lang`, `pins`, `members.<group>[].ja/en/gen` |
| Shared state | `46-agents.avatars`, `46-agents.assigned`, `46-agents.group` |
| Theme colours the layout uses | `gradient_top`, `gradient_bottom` in every theme's `colors` |
| Data files | `data/46-agents/sessions/<terminal>.json`, `data/46-agents/avatars/` |
| Status line command | `node ~/.config/herdr-app/mods/46-agents/statusline.mjs [your command]` |

### Which number to bump

| Bump | When | Examples |
| --- | --- | --- |
| MAJOR | Any change to the public interface that makes an existing install or config stop working without manual steps | Renaming a mod, removing a `members.json` key, changing the session file format |
| MINOR | New features that keep the interface compatible | A new card element, a new optional `members.json` key, a new group |
| PATCH | Fixes and performance work with no interface change | A crop fix, a faster reload, a roster correction |

While the version is `0.y.z`, the interface may still change: a breaking change bumps MINOR and a feature or fix bumps PATCH. Version `1.0.0` marks the interface as stable.

Roster updates (members graduating or joining) are PATCH changes: `members.json` keeps its shape.

## Documentation

All documentation is written in English: `CONTRIBUTING.md`, `AGENT.md`, `n46/RECIPE.md`, code comments and commit messages. `README.md` is the only document with translations:

| File | Role |
| --- | --- |
| `README.md` | The English source |
| `docs/README.zh-TW.md` | Traditional Chinese translation of `README.md` |
| `docs/README.ja-JP.md` | Japanese translation of `README.md` |

- Change `README.md` first, then bring both translations to the same sections and facts in the same pull request.
- Don't add translations of any other document.
- Quote on-screen text and names exactly as they appear, even in English documents: UI labels such as `設定` or `作業中`, and member and group names such as `井上和` or `乃木坂46`.

## Pull requests

A pull request is ready when:

- [ ] Every commit follows Conventional Commits, and breaking changes carry `!` and a `BREAKING CHANGE:` footer.
- [ ] `node tests/lib.test.mjs` prints `ok`, and new pure logic in `lib.js` has tests.
- [ ] `./scripts/dev-sync.sh` passes `herdr-app check` for every mod, and `herdr-app status` shows no errors.
- [ ] `n46/RECIPE.md` describes the change. Herdr's agents build the layout from it, so it must match the files.
- [ ] Documentation is in English. When what people see or run changes, `README.md` is updated and both translations follow it.
- [ ] Anything new that runs a program or uses the network is listed in each README's "What it runs on your machine" section and in the RECIPE.
- [ ] No member photos or logos are committed.
