# herdr-sakamichi-mod

**English** · [繁體中文](docs/README.zh-TW.md) · [日本語](docs/README.ja-JP.md)

Turn the coding agents in your [Herdr](https://herdr.dev) window into Sakamichi idols. Every agent becomes a current member of 乃木坂46, 櫻坂46 or 日向坂46: her name on the agent's card, tab and pane, her photo as its avatar, and two gauges for how much work it has left.

This English README is the source; the translations follow it. The project is fan-made and not affiliated with Nogizaka46, Sakurazaka46, Hinatazaka46, their management, or Herdr. The repo contains no logos or member photos.

## Screenshots

Avatars are blurred here; the repo ships no member photos.

| 乃木坂46 (`n46`) | 櫻坂46 (`s46`) | 日向坂46 (`h46`) |
| --- | --- | --- |
| ![乃木坂46 theme](docs/screenshots/n46.png) | ![櫻坂46 theme](docs/screenshots/s46.png) | ![日向坂46 theme](docs/screenshots/h46.png) |

## Features

- **Members list.** One card per agent: avatar, member name, model (`岡本姫奈 / Opus 5.5`), an animated status, and HP / MP gauges.
- **Tabs and pane headers.** Each tab shows its number and the members working in it (`1 [icon] 川﨑桜 [icon] 田村真佑`), after the tab's own name if you renamed it. Each agent's pane header starts with her name (`愛宕心響 · Claude Code`).
- **Three groups.** Switch between 乃木坂46 (purple), 櫻坂46 (pink) and 日向坂46 (sky blue). The window theme and the members switch together.
- **Avatars.** Drop in any image, or import the official profile photos with one click. On macOS each picture is cropped around the face.
- **HP and MP.** HP is your 5-hour Claude Code quota, MP the session's context window.

Names are in Japanese by default; English is one setting away.

## Requirements

- The Herdr desktop app, with `herdr-app` on your `PATH`. Tested on Herdr 0.1.12 and macOS 26.7 (2026-11-03).
- macOS to crop avatars around the face. On Linux, `.png` and `.jpg` avatars are used uncropped; setting avatars doesn't work on Windows.
- Node.js, only for the HP / MP gauges.

## Install

The quickest way is to ask your agent inside Herdr:

> Read ~/.config/herdr-app/AGENTS.md, then add the layout from https://github.com/payt0nc/herdr-sakamichi-mod (folder `sakamichi`). Read sakamichi/RECIPE.md first.

To install by hand:

1. Clone the repo:

   ```sh
   git clone https://github.com/payt0nc/herdr-sakamichi-mod.git && cd herdr-sakamichi-mod
   ```

2. Copy the layout, the three themes and the three mods into Herdr. Copy the mods as real folders; Herdr doesn't load a symlinked mod's icons.

   ```sh
   H=~/.config/herdr-app
   cp sakamichi/layouts/sakamichi.json sakamichi/layouts/sakamichi.svg "$H/layouts/"
   cp sakamichi/themes/n46.json sakamichi/themes/s46.json sakamichi/themes/h46.json "$H/themes/"
   cp -R sakamichi/mods/sakamichi-agents sakamichi/mods/sakamichi-pane sakamichi/mods/sakamichi-tabs "$H/mods/"
   ```

3. Check the mods. Each prints `check passed`.

   ```sh
   for m in sakamichi-agents sakamichi-pane sakamichi-tabs; do herdr-app check "$H/mods/$m"; done
   ```

4. Switch to the layout:

   ```sh
   herdr-app do layout.switch '{"name":"sakamichi"}'
   ```

If you already have files with these names, rename the new ones instead of overwriting yours. `ctrl-shift-l` switches back to your own layout at any time.

### Turn on HP and MP

The gauges read Claude Code's status line. Add this to `~/.claude/settings.json`:

```json
"statusLine": {
  "type": "command",
  "command": "node ~/.config/herdr-app/mods/sakamichi-agents/statusline.mjs",
  "refreshInterval": 10
}
```

Already have a status line? Put its command after the script, for example `node ~/.config/herdr-app/mods/sakamichi-agents/statusline.mjs ccstatusline`. It keeps drawing as before.

## Use

### Members and status

Each agent gets a free member of the shown group at random and keeps her across restarts. Every Herdr connected to the same machine shows the same member for an agent. Two agents share a member only after the whole group is taken (乃木坂46 33, 櫻坂46 30, 日向坂46 26). Agents you pin in Herdr come first. Click a card to jump to its agent.

| Status (`ja` / `en`) | Icon | Card |
| --- | --- | --- |
| 作業中 / Working | A vinyl disc spinning once every 1.4 s | Avatar ring and status word in the group's colour |
| 要対応 / Needs you | A message bubble bobbing every 0.7 s | Amber frame, ring and status word, shown over the focus frame |
| 完了 / Done | A double check mark pulsing every 1.6 s | Mint status word |
| 待機 / Idle | A 💤 drifting up and fading every 2.4 s | Grey status word |

The animations run natively in Herdr and stop when a card is off screen.

### HP and MP

- **HP** is your remaining 5-hour Claude Code quota. When it runs out, the agent stops.
- **MP** is the session's remaining context window. Compaction restores it.

A gauge turns amber under 20%. It only appears for Claude Code agents on this machine, once the status line is set up.

### Settings

Open the settings with **⚙** in the Members header. Right-clicking an agent's card opens them with its member selected.

| To | Do this |
| --- | --- |
| Switch groups | Click **乃木坂46**, **櫻坂46** or **日向坂46**. Picking `n46`, `s46` or `h46` from Herdr's theme menu does the same; other themes keep the group you picked last. Running agents keep their member; new agents get members of the new group |
| Set an avatar | Drag an image onto a member, or select her and enter a file path (`~/Pictures/me.png`) or an image URL |
| Import official photos | Click **公式サイトの写真を取り込む**. It fills every member of the shown group without an avatar, and refreshes photos imported earlier, but never replaces pictures you chose |
| Remove avatars | **リセット** removes one; **すべてリセット** removes the shown group's, after a second click to confirm |

Avatars are saved at 144×144. Members of another group who still stand for an agent are listed first, marked with their group (`乃木坂46 · 5期生`).

### Configuration

`~/.config/herdr-app/mods/sakamichi-agents/members.json`:

| Key | Effect |
| --- | --- |
| `"lang": "en"` | English names, labels and status words (default `"ja"`) |
| `"pins": { "Claude Code": "井上和" }` | The tab named `Claude Code` always gets that member; Japanese or English names both work |
| `"members"` | The rosters, one per group (`"n46"`, `"s46"`, `"h46"`); edit them when members graduate or join |

Updating the mod overwrites `members.json`, so save your `pins` first.

## Upgrading from the `46-*` or `n46-*` names

Until November 2026 the layout was `46` and the mods `46-agents`, `46-pane` and `46-tabs` (before that, `n46` and `n46-agents`, `n46-pane`, `n46-tabs`). After installing the new files:

1. Switch to the `sakamichi` layout. On its first start, `sakamichi-agents` copies your members, group and avatars from the old names.
2. Point the `statusLine` command in `~/.claude/settings.json` at `mods/sakamichi-agents/statusline.mjs`.
3. Delete the old files with the two `# names before` / `# the first names` `rm` lines under Uninstall.

## Uninstall

```sh
H=~/.config/herdr-app
herdr-app do layout.switch '{"name":"main"}'
rm -rf "$H/mods/sakamichi-agents" "$H/mods/sakamichi-pane" "$H/mods/sakamichi-tabs" "$H/data/sakamichi-agents"
rm -rf "$H/mods/46-agents" "$H/mods/46-pane" "$H/mods/46-tabs" "$H/data/46-agents" "$H/layouts/46.json" "$H/layouts/46.svg" # names before Nov 2026
rm -rf "$H/mods/n46-agents" "$H/mods/n46-pane" "$H/mods/n46-tabs" "$H/data/n46-agents" "$H/layouts/n46.json" "$H/layouts/n46.svg" # the first names
rm -f "$H/layouts/sakamichi.json" "$H/layouts/sakamichi.svg" "$H/themes/n46.json" "$H/themes/s46.json" "$H/themes/h46.json"
```

Then remove the `statusLine` entry from `~/.claude/settings.json` if you added it.

## What it runs on your machine

- The Members list, tab bar and pane headers only read `members.json` and files under `~/.config/herdr-app/data/sakamichi-agents/`. The Members list also runs `hc label` to store each agent's member on its terminal (label `sakamichi.member`), so every Herdr connected to that machine shows the same member.
- Setting an avatar runs `cp` (or `curl` for a URL you entered), `sips`, `osascript` with the mod's own `face.jxa` for face detection, and `mv`.
- The network is used only for an avatar URL you entered and for **公式サイトの写真を取り込む**, which contacts the shown group's site: `www.nogizaka46.com`, `sakurazaka46.com`, or `www.hinatazaka46.com` and `cdn.hinatazaka46.com`.
- `statusline.mjs` saves the model name and the two percentages per terminal. It reads no credentials.
- Nothing changes your keys.

Use avatar images you have the right to use.

## License

The code and docs are under the [MIT License](LICENSE). Member names only label agents. Avatar images you add or import stay under their owners' rights and are not part of this license.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the commit style and versioning, and [AGENT.md](AGENT.md) for working on this repo with a coding agent.
