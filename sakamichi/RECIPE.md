# sakamichi

Herdr's default window recoloured in a Sakamichi group's colour: a deep
gradient behind everything, dark terminal cards, and accents on the focused
pane, selected space and working agents. Every agent takes the name of a
current member of 乃木坂46, 櫻坂46 or 日向坂46, shown in the Members list,
its pane header and its tab, in Japanese by default.

The settings dialog switches the group: 乃木坂46 (purple, theme `n46`),
櫻坂46 (pink, theme `s46`) or 日向坂46 (sky blue, theme `h46`). The theme
and the official-photo source switch with it. Agents that already have a
member keep it; new agents get members of the new group.

![sakamichi](preview.png)

This file is the brief: enough to build sakamichi from an empty folder. The files
next to it are one build of it. If they don't work on your Herdr, or you
want it different, build it again from here.

## What you see

The same regions as Herdr's `main` layout, left to right:

1. **Sidebar**, 268px (44–480px), no fill of its own, so the root gradient
   shows through. Top to bottom: a 46px brand bar (draggable window area,
   room for the macOS traffic lights at 12,16), Spaces and the
   Members list sharing the height equally (90px minimum each), then a 69px
   footer (Settings, Add machine).
   - **Members list** (`sakamichi-agents`): a `メンバー` header (12px semibold,
     `muted`) with the agent count (`dim`) and a `⚙` button on the right
     that opens the settings. Below it, one card per agent with 6px
     gaps. Each card (about 92px tall, 10px padding, 12px gap) has 12px corners, a `surface` fill at `c8` alpha and a
     1px `border` frame. On the left is a 72px rounded-square avatar
     (radius 16px) with a 2px ring. It shows the image the person picked
     for that member in the settings, cropped around the face. Without one, it's
     an `accent` square with the name's first character (`井`) in white. On
     the right are three lines:

     ```
     ┌──────┐  遠藤さくら / Opus 5.5   (◎) 作業中
     │photo │  HP  ▇▇▇▇▇▇░░░░   62%
     └──────┘  MP  ▇▇░░░░░░░░   15%
     ```

     - The member's name (14px semibold), then `/ <model>` (11px, `muted`,
       baseline-aligned, truncated) when Claude Code reports one, e.g.
       `岡本姫奈 / Opus 5.5`. The status sits on the far right: an animated
       icon and the word (11px) in the status colour. The three lines are
       7px apart.
     - **HP** (stamina): the account's remaining 5-hour session quota. When it
       runs out, the agent is done.
     - **MP** (mind): the Claude Code session's remaining context window.
       Compaction restores it.

     Each bar is 14px tall: a 11px semibold `dim` label (22px wide), a 6px
     rounded track in `raised`, and the percentage (11px, 34px wide). HP
     fills in `done` (mint) and MP in `ansi12` (blue). Under 20% the fill turns `blocked`
     (amber). Without data, the bar is left out. Numbers older
     than 10 minutes turn `dim`.
   - Under 160px the sidebar is a rail, and the list shows only 30px
     avatars.
   - **Settings** (`設定`): a 520×640 dialog in `popover`
     with 18px padding.
     - Title (16px semibold), `Esc ✕` on the right.
     - A row of three equal 32px buttons: `乃木坂46`, `櫻坂46`, `日向坂46`
       (13px semibold). The shown group has an `accent` frame on `selected`.
       Clicking one sets shared `sakamichi-agents.group` (`n46` | `s46` | `h46`,
       default `n46`). On the sakamichi layout (or any layout already showing one of
       the three themes) it also runs `app.theme {name: <group>}`; Herdr
       keeps that pick per layout (`layouts/.state/sakamichi.json`). Other layouts
       keep their theme. Ignored while an import runs. The list reads the
       group from the layout's dark theme when it's `n46`/`s46`/`h46`, then
       the light one, then `sakamichi-agents.group`, so a theme-menu pick also
       switches the group.
     - A hint line (12px, `muted`).
     - A scrolling list of all members. Members in use come first. Each row
       is 44px: thumbnail, name (14px semibold), and below it `5期生` plus
       `使用中 · <tab name>` if an agent has that member. A `リセット`
       button appears when the member has an avatar.
     - The selected row has an `accent` frame on `selected`.
     - Under the list: the selected member's name, a 34px input (path or
       URL), a `設定` button in `solid`, and a status line (`muted`, or
       `blocked` for errors).
2. **Work column**: a 42px tab bar (draggable), then the panes with 8px
   padding and 8px gaps, then a 28px status bar. A Files/Changes panel
   (368px, 280–900px, hidden by default) can open on the right.

The look:

- Root background: linear gradient `raised` → `canvas` at 160° (n46:
  `#2a1a34` → `#120a18`). Every theme defines both, so the gradient follows
  any theme, Herdr's own included.
- Panes: cards with 12px corners, a 1px `#3a2548` border and a terminal
  background of `#1a1020`. The focused pane's border is accent `#a347c0`.
  Every pane gets the `sakamichi-pane` header (30px, top, always shown), even
  when it's the only one in its tab. It's Herdr's `pane` header with the
  agent's member in front:
  `[icon] 愛宕心響 · Claude Code  ~/folder`.
  - The member name is 12px semibold `foreground` (at most 160px wide).
  - Then a `dim` `·`, then the program name in `muted`.
  - Panes without an agent (shells) look exactly like Herdr's header.
- Terminal text `#e8dff0` on `#1a1020`, selection `#4a2a5c`, cursor
  `#c27ad8`. Terminal padding 14px × 12px.
- ANSI 0–15: `#2e2038 #e0607e #8fcf9f #e8c47a #8aa8f0 #b76fd0 #6fc8d0
  #d8cce4 / #6a5579 #f07a96 #a6e0b4 #f2d492 #a4bcf6 #cc8ae0 #8adae0
  #f6f0fa`.
- Panel colours: canvas `#120a18`, chrome `#160c1c`, surface `#1e1226`,
  popover `#221429`, raised `#2a1a34`, hover `#2e1c3a`, selected `#3b2150`,
  border `#3a2548`, input `#241630`, muted text `#a894b8`, dim text
  `#6f5c80`, accent `#a347c0` with white text on it.
- `themes/s46.json` and `themes/h46.json` are `n46` with the plum greys
  hue-rotated (s46 to 338°, h46 to 204°: background, foreground, selection,
  ansi 0/7/8/15, every panel colour, `idle`), plus
  accent / working / cursor: s46 `#c94f86` / `#ee8fb6`, h46 `#3d8fc7` /
  `#7cc7e8`. `blocked`, `done` and the other ANSI colours stay.
- Fonts are left unset, so the person's settings apply (Herdr's default is
  JetBrains Mono 14 / Geist).

## How it behaves

It works like `main` with different colours, with one gap: pinned agents still come first, but the built-in mod's optional priority sort (blocked agents first) is not included.

| Agent status | Colour | Word (ja / en) | Member card |
| --- | --- | --- | --- |
| working | `#c27ad8` (light purple) | 作業中 / Working | avatar ring in `working`; a 13px vinyl disc (`disc.svg`) spins once every 1.4 s |
| blocked | `#f2b35e` (amber) | 要対応 / Needs you | card frame and avatar ring amber, beating focus; a 14px `message-square-text` (`message.svg`) bobs up 2px every 0.7 s |
| done | `#8fcf9f` (mint) | 完了 / Done | status word mint; a 14px `check-check` (`check.svg`) pulses opacity 0.45↔1 every 1.6 s |
| idle | `#6a5579` (grey-purple) | 待機 / Idle | a 14px `zZZ` (`zzz.svg`) drifts up 3.5px and fades 0.3↔1 every 2.4 s |

- **Who gets which member:** a pin in `members.json` (tab name → member)
  comes first. Next, the member stored on the terminal itself, as the core
  label `sakamichi.member` (written with `hc(["label", address,
  "sakamichi.member=<ja>"])` for any agent without a known one, never
  rewritten). Every Herdr client connected to that machine sees the label,
  so all of them show the same member; shared state is per client, and a
  remote terminal is `machine/t3` on one client and `t3` on its own. Then
  the member remembered per terminal in this client's shared
  `sakamichi-agents.assigned`, so an agent keeps its member across
  restarts. Otherwise the agent gets a free member picked from its
  terminal address without the `machine/` prefix (the same in every copy of
  the list and on every client), which is then remembered and labelled. Two agents share a member only after every member is taken;
  an extra agent then keeps the member it already had.
- `"lang": "en"` in `members.json` switches names, status words and the
  header (`Members`) to English. Avatars then show initials (`NI`). The bar
  labels are `HP` / `MP` in both languages.
- All four animations are native (`svg().spin`, `.loop("top")`,
  `.loop("opacity")`). They use no timers and stop when the card isn't
  shown.
- HP and MP update within a second of Claude Code redrawing its
  status line, which is every 10 s with `refreshInterval: 10`. Agents that
  aren't Claude Code, agents on remote machines, and Claude Code without
  the status line installed show no bars.
- Clicking a card (or a rail avatar) runs `agent.focus` on that terminal.
  The list order is the app's next/previous agent order (`setAgentOrder`).
- The focused agent's card has an `accent` frame.
- **Setting an avatar:** open the settings with the `⚙` button, by
  right-clicking an agent's card (which selects that card's member), or with
  `herdr-app do mod.open '{"name":"sakamichi-agents"}'`. Then do one of these:
  - Drag an image file onto a member's row.
  - Select a row, type an absolute path, a `~/` path or an `http(s)` URL,
    then press Enter or `設定`.

  The status line shows `処理中…`, then `設定しました: <name>`. Every card
  for that member updates at once.
- **公式サイトの写真を取り込む** (under the hint, with `自分で設定した画像はそのまま`
  beside it): only when clicked, it fetches the shown group's official member list. Then,
  four at a time, it imports the photo of each member who has no avatar or
  an earlier official one; the earlier one is refreshed and its file
  deleted. The status line shows `取り込み中… 3/31`, then
  `31人の写真を取り込みました`. If it can't connect, it shows
  `公式サイトに接続できませんでした`. Pictures the person chose are never
  replaced. Clicks are ignored while it runs.
- **すべてリセット** (right end of that row): the first click turns it amber
  and changes it to `もう一度押すと全員リセット`. The second click clears
  every avatar, from all groups and from members no longer in
  `members.json`, and deletes every file in `data/sakamichi-agents/avatars/`.
- `リセット` removes a member's avatar and deletes its file. A bad path or
  URL shows `パスまたは URL が正しくありません`, and an unreadable file shows
  `画像を読み込めませんでした`. Esc closes the dialog (Herdr closes the top dialog by
  itself).

Clicking a pane moves the purple focus border to it. `ctrl-shift-l` cycles
layouts and the look switches with them.

## Built from

- **`layouts/sakamichi.json`**: a clone of the shipped `main` layout
  (`herdr-app do layout.clone '{"name":"main","as":"sakamichi"}'`) with these
  changes at the root: `"theme": "n46"`, the gradient `background`, and
  `"preview": "layouts/sakamichi.svg"`. The `sidebar` column's `"background":
  "chrome"` is removed, the tab block's `pane.radius` is 12 instead of 10,
  the `agents` block's mod is `sakamichi-agents`, the `tabs` block's mod is
  `sakamichi-tabs`, and the tab block's `pane.header.content.mod` is `sakamichi-pane`. The rest (node ids, sizes,
  `titlebar: "none"`) is `main` unchanged.
- **`mods/sakamichi-agents/`** (new, `mod.json` `{ "place": "none", "overlay": {
  "width": 520, "height": 640 } }`): one mod in two roles. As a layout
  block it's the Members list. As an overlay (`props().overlay` is set; the
  list passes `{ member }` to preselect a row) it's the settings dialog. A mod can't import from
  another mod's folder, so both live here.
  - `members.json`: `{ "lang": "ja" | "en", "pins": { "<tab name>":
    "<member, ja or en>" }, "members": { "n46": [...], "s46": [...], "h46":
    [...] } }`, each entry `{ "ja", "en", "gen" }`. The old format, a flat
    `"members": [...]` array, is read as the n46 roster. It ships the current
    members from the official sites, November 2026: n46 33 (generations
    3–6), s46 30 (2–4), h46 26 (2–5). Pins work from any group. Every ja name is unique across all groups, because
    avatars are keyed by it.
  - `lib.js`: pure functions (`GROUPS`, `groupOf`, `themeGroup`, `activeGroup`, `parseConfig`, `forGroup`, `findMember`, `assign`,
    `labelMap` (`terminals()` → address → a label's value: `MEMBER_LABEL` by default, or `SESSION_LABEL`), `OLD_NAMES`, `movedAvatars`,
    `badge`, `squareCrop`, `isOfficial`, `avatarSource`, `avatarMap`, `officialPhotos`,
    `parseSession`, `gauge`, `WORDS`), with no Herdr imports.
    `tests/lib.test.mjs` at the repo root checks them with `node`.
  - `main.js`: the list. Its `cfg` is `forGroup(members.json,
    activeGroup(settings(), shared sakamichi-agents.group))`, read once per render:
    `members` is the shown group, `known` every group.
    Pins and remembered members are looked up in `known`, so a group
    switch renames no agent; only agents without a member get one of the
    new group. It reads `members.json` with
    `readTextFile(appHome() + …)` and uses `agents()`, `layout()` (the
    sidebar width, for the rail), `setAgentOrder`, `run("agent.focus")`,
    `openOverlay`, `terminals()` (each one's `labels`), `hc` and shared
    `sakamichi-agents.assigned` (address → member ja name). It reads that on every render and writes it only when it
    changes, together with `sakamichi-agents.names` (address → the name the card
    shows, English with `"lang": "en"`). The settings read `assigned` to
    mark members in use; the pane headers and tabs read `names`.
  - `settings.js`: the dialog (`Settings`), `importAvatar`,
    `importOfficial`, `store` (save or remove one avatar, then delete the
    file it replaced) and `avatarBox` (the rounded-square avatar drawn by
    both the cards and the settings rows).
  - `disc.svg`, `zzz.svg`, `message.svg`, `check.svg`: one-colour 24×24 icons, tinted with the status
    colour.
  - **Official import** (`importOfficial`): `fetch` gets the shown
    group's `GROUPS[g].api`, and `officialPhotos(text, g)` turns it into ja
    name (spaces removed, `井上 和` → `井上和`) → photo URL, keeping only URLs
    on that group's host:
    - n46: `https://www.nogizaka46.com/s/n46/api/list/member`, JSONP
      `res({"data":[{name, img, graduation}]})`; `graduation: "NO"` only.
    - h46: `https://www.hinatazaka46.com/s/official/api/list/member`, JSON
      `{"member":[{name, image_src}]}` on `https://cdn.hinatazaka46.com/`
      (current members only; its first entry, `日向坂46`, matches nobody).
    - s46: no API. The HTML page
      `https://sakurazaka46.com/s/s46/search/artist?ima=0000` has
      `<img src="/images/…" alt="森田 ひかる">` per member; `src` is made
      absolute on `https://sakurazaka46.com/`.
    - s46 and h46 list 247×320 thumbnails (`…/400_320_102400.jpg`). The
      same path with `1000_1000_102400.jpg` serves the full picture, so the
      URL is rewritten to that.

    Four workers run `importAvatar({url}, "official-")`.
    The map is re-read before each save, so an avatar set meanwhile wins.
  - `statusline.mjs`: a Claude Code `statusLine` command. It reads Claude
    Code's status JSON from stdin:
    - `context_window.remaining_percentage` becomes `context` (MP).
    - `100 - rate_limits.five_hour.used_percentage` becomes `quota` (HP).
    - `model.display_name` becomes `model` (at most 40 characters).

    It writes `{updatedAt, context, quota, model}` as JSON to its own
    terminal's core label `sakamichi.session` (`hc label <HC_TERMINAL_ID>
    sakamichi.session=<json>`), so every Herdr client connected to that
    machine sees the numbers. If the label (read with `hc get --json`)
    already has the same numbers and model and is under 60 s old, it skips
    the write, so clients don't redraw for nothing. Each `hc` call has a 2 s
    timeout. Its `pct()` and the label name repeat `lib.js` on purpose:
    importing that ES module could fail on an older node, and a status line
    must never break. Herdr sets `HC_TERMINAL_ID` in every terminal. Any arguments name the person's own status line
    command. It is run with the same stdin, and its stdout is printed, so
    an existing status line keeps working. The script never fails the
    session.
  - **Sessions**: each render takes `labelMap(terminals(), SESSION_LABEL)`
    and a Claude Code card runs `parseSession` on its agent's value, for
    local and remote agents alike. `terminals()` is live, so a new label
    redraws by itself; a 30 s timer redraws for the stale dimming.
  - **Avatars** (`importAvatar`, run only when the person sets one):
    1. `avatarSource` accepts an `http(s)` URL, an absolute path or a `~/`
       path, and nothing else.
    2. A URL goes through `curl --proto =http,https --max-time 25
       --max-filesize 20000000`. A file is copied with `cp`. Either way it
       lands in `data/sakamichi-agents/avatars/.<ms>.part.jpg`. Vision needs an
       image extension; the content can be any format.
    3. `sips -s format jpeg` turns it into a JPEG, which also rejects
       non-images.
    4. `osascript -l JavaScript face.jxa` (macOS Vision,
       `VNDetectFaceRectanglesRequest`) prints `W H` plus the face box if it
       finds one.
    5. `squareCrop` computes the square, **face-focused**. The face is 58%
       of the side, centered across, with 0.42 face heights above it, so the
       top of the head meets the top edge. For an official 790×1000
       portrait, that's about a 430px square from y≈60. Without a face, it
       uses the biggest square, top-aligned and centered across. It's always
       clamped inside the picture.
    6. `sips -c side side --cropOffset top left`, then `sips -Z 144` (=
       `AVATAR_OUT`, 2× the 72px `AVATAR_PX` on the card, so it's sharp on
       Retina and no bigger), give `<ms>.jpg`. Official imports are named
       `official-<ms>.jpg` (`isOfficial`). The part file is always removed.
    7. Without `sips` (Linux), a `.png`/`.jpg` source is kept
       uncropped. Windows is not supported: sources must be POSIX paths or
       URLs, and the import shells out to `cp` and `mv`.
    8. The result is saved in shared `sakamichi-agents.avatars` (member ja name →
       `data/sakamichi-agents/avatars/<ms>.jpg`), and the previous file is
       deleted. `avatarMap` ignores entries outside that folder.
    9. Cards draw `image(path)` from that map. The file exists before the
       map changes, and each avatar gets a new name, so Herdr's
       cache-by-path never shows a stale or missing picture.
- **`themes/n46.json`** (and `s46.json`, `h46.json`): the terminal colours (`background`, `foreground`,
  `selection`, `cursor`, `ansi[16]`) plus a `colors` block overriding the
  panel and status colours listed above. None has the layout's name, so
  Settings offers all three on every layout.
- **`mods/sakamichi-pane/`**: `herdr-app do mod.clone '{"name":"pane","as":"sakamichi-pane"}'`
  (the clone rewrites its own `mods/sakamichi-pane/*.svg` paths), plus:
  - `member()`: shared `sakamichi-agents.names[props().terminal]` (falling back
    to `sakamichi-agents.assigned`), the name the Members list published for this
    terminal. It doesn't read `members.json`, so the header always shows
    exactly what the list shows.
- **`mods/sakamichi-tabs/`**: `herdr-app do mod.clone '{"name":"tabs","as":"sakamichi-tabs"}'`
  (the clone rewrites its own `mods/sakamichi-tabs/*.svg` paths), plus, in each
  tab pill:
  - `{seq}`: the tab's 1-based position (11.5px semibold, `muted` when
    active, else `dim`), before everything else.
  - For each agent pane of the tab, in pane order: its 14px program icon,
    then the member of that pane's `terminal` from shared
    `sakamichi-agents.names`, falling back to `assigned` (medium weight). A tab
    someone renamed shows its name first: `1 fix login [icon] 川﨑桜`. A split with two agents reads
    `1 [icon] 川﨑桜 [icon] 田村真佑`. Names are capped at 170px, or 110px
    each when the tab has several; `Z` follows the last one when zoomed.
  - A tab without an agent keeps Herdr's program icon and name: `2 >_ 2`.
  - Spinner, status dot, close button, drag to reorder, double-click to
    rename and the right-click menu are Herdr's, unchanged. Names follow
    the list's language.
- **`layouts/sakamichi.svg`**: the 320×200 picture shown in Settings → Layouts.
- **Shipped mods used**: `workspace-chrome`, `spaces`, `files`,
  `changes`, `workspace-status`.
- **Network and programs** (tell the person before installing): the list
  runs only `hc label <terminal> sakamichi.member=<ja>`, and `statusline.mjs`
  only `hc get` and `hc label <terminal> sakamichi.session=<json>`. Folders and deletions use `fs/promises`. When the
  person sets an avatar, the settings run `cp` (or `curl` for a URL they
  typed), `sips`, `osascript` (its own `face.jxa`, face detection only)
  and `mv`. The shown group's official site (`www.nogizaka46.com`,
  `sakurazaka46.com`, or `www.hinatazaka46.com` and `cdn.hinatazaka46.com`) is
  contacted only when the person clicks 公式サイトの写真を取り込む. Nothing is
  downloaded on its own. It writes only under `~/.config/herdr-app/data/sakamichi-agents/`. It
  changes no keys.
- **No art in the package:** no photos ship. Avatars are images the person
  chooses, or official photos they import themselves on their own machine.

## Watch out

- Until November 2026 the layout was `46` and the mods `46-agents`,
  `46-pane` and `46-tabs`; before that, `n46` and `n46-agents`, `n46-pane`
  and `n46-tabs`. On its first start `sakamichi-agents` copies the old
  shared keys (`46-agents.assigned`, `.group`, `.avatars`, else the
  `n46-agents.*` ones) and the avatar files into its own names, so members
  and avatars carry over. Then delete the old mods, layout files and
  `data/46-agents/` / `data/n46-agents/`, and point the Claude Code
  `statusLine` at `mods/sakamichi-agents/statusline.mjs`.
- Install everything: `layouts/sakamichi.json` and `layouts/sakamichi.svg` go in
  `~/.config/herdr-app/layouts/`, `themes/n46.json`, `s46.json` and `h46.json` go in
  `~/.config/herdr-app/themes/`, and `mods/sakamichi-agents/`, `mods/sakamichi-pane/` and `mods/sakamichi-tabs/` go in
  `~/.config/herdr-app/mods/`. Without the theme file, the layout loses its
  terminal and panel colours. Without `sakamichi-agents`, the Members block is
  empty and the pane headers and tabs show no member. Without `sakamichi-pane`,
  panes have no header; without `sakamichi-tabs`, there is no tab bar.
- The member list is a snapshot. Members graduate and new generations
  join, so edit `members.json` to keep it current. Updating the mod
  overwrites that file, so back up your pins first.
- Member assignment lives on each terminal (label `sakamichi.member`), so
  every Herdr client connected to a machine shows the same member for it.
  Pins are per Herdr home: give both clients the same `members.json`.
- `image()` reads only files in the Herdr home. An `https://` path draws
  nothing, with no error, so URLs are downloaded first.
- Herdr has no file picker for mods (only `pickFolder`), and `exec` stops
  after 30 s, which is too short for an AppleScript file dialog. That's why
  avatars come from drag and drop or a typed path / URL.
- Face cropping uses macOS Vision (`osascript`) and `sips`. Vision can't
  read a file without an image extension, so the part file is named
  `.part.jpg`. On Linux, `.png`/`.jpg` sources are kept
  uncropped and anything else fails. Windows is not supported.
- Herdr caches images by path, and remembers a missing one. So each avatar
  gets a new millisecond name, and the shared map changes only after the
  file is written.
- The avatars map is shared state (`shared.json`), so it belongs to this
  Herdr home. The images are in `data/sakamichi-agents/avatars/`. Copy both to
  move them to another machine.
- The Members list, the pane headers and the tabs show member names. A
  tab without an agent, or one someone renamed, keeps its own name.
- Install the mod as a real folder, not a symlink. Herdr doesn't load a
  symlinked mod's `svg()` icons (they draw nothing, with no error), and it
  doesn't notice edits to it. While developing, `scripts/dev-sync.sh`
  rsyncs the repo's mod into Herdr and runs `herdr-app check`. A symlinked
  layout or theme file loads, but its edits don't reload until you switch
  layouts.
- A theme picked from the theme menu overrides the layout's `n46` theme. To
  get it back, pick a group in the settings again. Picking `s46` or `h46`
  from the theme menu also switches the group; any other theme keeps the
  last group picked.
- In light mode, picking 櫻坂46 or 日向坂46 changes new agents' members but
  not the window, which stays 乃木坂46 purple. `app.theme` fills only the
  half matching the theme's lightness, and all three themes are dark; a
  dark theme reaches the light half only from the layout file's root
  `theme`. In dark mode the pick works fully.
- The layout is dark only. There's no light variant.
- If `sakamichi` is taken, rename the layout file, its preview picture and the
  `preview` path together.
- This is a fan-made colour theme. It includes no logos, photos or other
  official artwork.
- Avatars are per member, not per terminal. Every agent showing that member
  gets the same picture.

## Done when

- `herdr-app check ~/.config/herdr-app/mods/sakamichi-agents` passes, and
  `node tests/lib.test.mjs` prints `ok`.
- With two agents running, the sidebar shows `メンバー 2` and two cards with
  different member names in Japanese. Clicking a card focuses that agent.
- Without the status line, both bars are hidden. After the status line is
  installed, a Claude Code card shows HP and MP percentages that
  match Claude Code's own numbers, and they change as the session goes on.
- `echo '{"context_window":{"remaining_percentage":62},"rate_limits":{"five_hour":{"used_percentage":35}}}' | HC_TERMINAL_ID=t1 node statusline.mjs`
  sets terminal `t1`'s `sakamichi.session` label to JSON with `context: 62, quota: 65`
  (`hc get t1 --json`). An agent on another machine shows its bars too.
- On macOS, dropping a photo onto a member's row in the settings (or
  entering its path or URL) gives a 144×144 `data/sakamichi-agents/avatars/<ms>.jpg`
  with the face centered and the top of the head at the top edge. Every card for that member shows it. `リセット`
  brings back the letter and deletes the file. A text file, a missing
  path, a relative path or `file://` shows an error and changes nothing.
- Setting `"lang": "en"` in `members.json` turns the list English after the
  mod reloads.
- An idle agent's status shows a fading, drifting `zZZ`, and a working
  one's a spinning disc. Two screenshots 0.7 s apart differ.
- 公式サイトの写真を取り込む fills every member without an avatar and leaves the
  others alone, for each of the three groups. Offline, it shows the connection error and changes nothing.
- In dark mode, clicking `櫻坂46` in the settings turns the window pink; the running
  agents keep their names, and a new agent gets a 櫻坂46 member. In the
  list, members of another group still in use come first, marked
  `乃木坂46 · 5期生`; `日向坂46` turns it sky blue with 日向坂46 members; `乃木坂46`
  brings the purple back. The pick survives a restart.
- `herdr-app do layout.switch '{"name":"sakamichi"}'` returns `ok`, and
  `herdr-app status` shows `"layout": "sakamichi"` and `"errors": []`.
- The window shows the plum gradient behind the sidebar and between panes,
  terminals have a `#1a1020` background, and the focused pane has a purple
  border.
- Settings → Layouts shows sakamichi with its preview picture.
- `ctrl-shift-l` switches back to Herdr's `main` layout, which keeps its own
  look.
