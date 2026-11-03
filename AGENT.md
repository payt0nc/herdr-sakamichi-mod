# AGENT.md

Instructions for coding agents working in this repo. Read this before editing; [CONTRIBUTING.md](CONTRIBUTING.md) has the commit and versioning rules, and the README explains the project for people.

## What this repo is

herdr-sakamichi-mod is a layout package for the Herdr desktop app: one layout, three group themes and three mods, built in the shape Herdr's own layout examples use (`sakamichi/` holds `RECIPE.md`, `layouts/`, `themes/`, `mods/`).

| Path | Role |
| --- | --- |
| `sakamichi/layouts/sakamichi.json` | The layout: a clone of Herdr's `main` with the `n46` theme, `sakamichi-agents`, `sakamichi-pane`, and a gradient from the theme colours `raised` → `canvas` |
| `sakamichi/layouts/sakamichi.svg` | The picture Herdr's settings show for the layout |
| `sakamichi/themes/n46.json`, `s46.json`, `h46.json` | One theme per group (purple, pink, sky blue): terminal colours (`ansi`) and panel overrides (`colors`) |
| `sakamichi/mods/sakamichi-agents/main.js` | The Members list: cards, HP / MP bars, status animation, session file reading, the `sakamichi.member` terminal label, the move from the old `46-agents` / `n46-agents` names |
| `sakamichi/mods/sakamichi-agents/settings.js` | The settings dialog (group switch, avatars), avatar import, official photo import per group, `avatarBox` |
| `sakamichi/mods/sakamichi-agents/lib.js` | Pure functions with no Herdr imports, including `GROUPS` (names, official API, photo host per group); the only file the tests load |
| `sakamichi/mods/sakamichi-agents/statusline.mjs` | Claude Code status line: writes model, context left and quota left per terminal |
| `sakamichi/mods/sakamichi-agents/disc.svg`, `zzz.svg`, `message.svg`, `check.svg` | Status icons (working, idle, blocked, done), tinted with the status colour |
| `sakamichi/mods/sakamichi-agents/face.jxa` | macOS Vision face detection, run with `osascript -l JavaScript` |
| `sakamichi/mods/sakamichi-agents/members.json` | One roster per group (`members.n46`, `.s46`, `.h46`) and person settings (`lang`, `pins`) |
| `sakamichi/mods/sakamichi-pane/` | Clone of Herdr's `pane` header with the member name added |
| `sakamichi/mods/sakamichi-tabs/` | Clone of Herdr's `tabs` bar: each tab shows `{seq}`, then `{program icon} {member}` for every agent pane in it (or Herdr's icon and name when it has no agent) |
| `sakamichi/RECIPE.md` | The brief Herdr agents build the layout from; must match the files |
| `scripts/dev-sync.sh` | Copies every mod into Herdr and runs `herdr-app check` |
| `tests/lib.test.mjs` | Assertions for `lib.js` |

## Sources of truth for the Herdr API

Herdr writes these on every start; read them instead of guessing:

- `~/.config/herdr-app/AGENTS.md`: how layouts, mods, keys, settings and sharing work.
- `~/.config/herdr-app/herdr.d.ts`: the `herdr` module (live data, commands, `exec`, `shared`, `watchFolder`).
- `~/.config/herdr-app/gpui-kit.d.ts`: elements (`div`, `svg`, `image`), animations (`spin`, `loop`), `gpui-base` controls, `fs/promises`, `fetch`.
- `~/.config/herdr-app/mods/`: Herdr's shipped mods, as examples. They are read-only; clone with `herdr-app do mod.clone` before changing one.

## Workflow

1. Check `git status` first. Several agent sessions may work in this folder at once; don't overwrite changes you didn't make, and ask the person when two changes collide.
2. Edit files in this repo, never the copies under `~/.config/herdr-app/mods/`.
3. Run `./scripts/dev-sync.sh` after every mod edit. Each mod must print `check passed`.
4. After a layout edit, switch layouts twice (`herdr-app do layout.switch '{"name":"main"}'`, then `'{"name":"sakamichi"}'`) so Herdr rereads it.
5. Run `node tests/lib.test.mjs`; it prints `ok`.
6. Check `herdr-app status` for `"errors": []`, and look at `herdr-app shot <file.png>` for anything visual.
7. Update `sakamichi/RECIPE.md`, and the three READMEs when people see or run something new.
8. Commit with Conventional Commits (see CONTRIBUTING.md). Commit only when the person asks.

## Platform rules the code depends on

These come from Herdr's runtime; breaking one fails silently or makes the app slow:

| Rule | Consequence in this repo |
| --- | --- |
| A mod can't import from another mod's folder | The settings dialog lives in `sakamichi-agents`; `sakamichi-pane` and `sakamichi-tabs` read `members.json` with `readTextFile` and the shared keys instead of importing |
| `image()` and `svg()` read only real files in the Herdr home; an `https://` path draws nothing | Avatars are downloaded or copied into `data/sakamichi-agents/avatars/` first |
| Herdr caches images by path, including missing ones | Every avatar gets a new file name; the shared map changes only after the file exists |
| A symlinked mod folder loads no `svg()` icons and doesn't hot-reload | Mods are rsynced by `dev-sync.sh`, never symlinked |
| No `setTimeout` or `setInterval`; every redraw redraws the window | Timers use `cx.timer`; animations use native `spin` and `loop`; `cx.notify()` only when data changed |
| `shared.json` belongs to one Herdr client, and a remote terminal is `machine/t3` on other clients but `t3` on its own | Each agent's member is also stored on its terminal as the label `sakamichi.member` (`hc label`), which wins over `sakamichi-agents.assigned`; a known label is never rewritten, so clients with different pins don't fight |
| `setShared` re-renders every mod | `remember()` writes `sakamichi-agents.assigned` only when the assignment changed |
| `exec` stops after 30 s, and mods have no file picker | Avatars come from drag and drop or a typed path or URL |
| Esc closes the top dialog by itself | The settings dialog has no Esc handler |
| `watchFolder` needs the folder to exist | `main.js` creates `data/sakamichi-agents/sessions/` before watching |

## Code conventions

- Put logic that doesn't need Herdr in `lib.js` and test it in `tests/lib.test.mjs`. Keep `main.js` and `settings.js` to UI and I/O.
- Use theme colors (`theme().accent`, `t.working`, …) instead of hex in mods, so the layout follows theme changes.
- Draw avatars only through `avatarBox` in `settings.js`; save or remove them only through `store`.
- Use `fs/promises` for folders and deletions and `fetch` for text; `exec` only for `cp`, `mv`, `curl` (image downloads), `sips` and `osascript`.
- `statusline.mjs` repeats the id rule and `pct()` from `lib.js` on purpose: it must run on any Node.js and never break the person's status line.
- Changing anything in CONTRIBUTING.md's public interface table is a breaking change.
- A new group needs an entry in `GROUPS`, a roster in `members.json`, a `themes/<key>.json`, and a parser case in `officialPhotos`. Member `ja` names must stay unique across all groups, because avatars are keyed by them.
- Never commit member photos, logos, or files Herdr writes into mod folders (`gpui-kit.d.ts`, `jsconfig.json`; both are in `.gitignore`).

## Documentation rules

- Write every document in English: `AGENT.md`, `CONTRIBUTING.md`, `sakamichi/RECIPE.md`, code comments and commit messages.
- `README.md` is the only document with translations: `docs/README.zh-TW.md` and `docs/README.ja-JP.md`. Update `README.md` first, then make both translations match its sections and facts in the same change. Don't translate any other document.
- Quote on-screen text and names exactly as they appear, even in English text: UI labels (`設定`, `作業中`) and member or group names (`井上和`, `乃木坂46`).

Docs also follow the `writing-principles` skill. Check them with:

```sh
python3 ~/.claude/skills/writing-principles/scripts/check_docs.py --repo .
```

`.writing-principles.conf` sets two project values:

| Setting | Value | Reason |
| --- | --- | --- |
| `NO_HEADER` | Every Markdown file | The skill's `讀者` / `型別` header is Chinese, and this repo's documents are English or README translations |
| `EXCLUDE` | `sakamichi/RECIPE.md` | Herdr's AGENTS.md fixes the RECIPE's sections and wording for other agents to build from |
