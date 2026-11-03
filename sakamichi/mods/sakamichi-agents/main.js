// sakamichi-agents: every agent gets a member's name from the group picked in the settings
// (乃木坂46, 櫻坂46 or 日向坂46; Japanese by default), with the avatar the person picked for that member in the settings dialog (settings.js).
import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, appHome, hc, layout, openOverlay, props, readTextFile, run, setAgentOrder, setShared, settings, shared, terminals, theme, watchFolder } from "herdr";
import * as fs from "fs/promises";
import { AVATAR_PX, WORDS, activeGroup, movedAvatars, AVATAR_DIR, OLD_NAMES, MEMBER_LABEL, assign, assignedMap, findMember, forGroup, gauge, labelMap, nameOf, parseConfig, parseSession, sessionFile } from "./lib.js";
import { ASSIGNED_KEY, AVATARS_KEY, GROUP_KEY, NAMES_KEY, Settings, avatarBox, avatars } from "./settings.js";

const SESSION_DIR = `${appHome()}/data/sakamichi-agents/sessions`; // written by statusline.mjs
const CONFIG = `${appHome()}/mods/sakamichi-agents/members.json`;

const openSettings = (member) =>
  openOverlay({ mod: "sakamichi-agents", kind: "dialog", width: 520, height: 640, props: { member } });

// One-time move from the old names (OLD_NAMES), key by key (an empty new key takes the
// newest old value). The assignment and group are copied before the first render, so remember() can't
// write a fresh map over them. The avatars map changes only after the files are copied,
// because Herdr remembers a missing image by path; a failed copy is retried next start.
// ponytail: the old data/<old name> folders are left in place, for the person to delete.
function migrate() {
  // The newest old name that has this key, e.g. "46-agents".
  const oldName = (k) => OLD_NAMES.find((n) => shared(k.replace("sakamichi-agents", n)) != null);
  const old = (k) => { const n = oldName(k); return n ? shared(k.replace("sakamichi-agents", n)) : null; };
  for (const k of [ASSIGNED_KEY, GROUP_KEY]) if (shared(k) == null && old(k) != null) setShared(k, old(k));
  const n = oldName(AVATARS_KEY);
  if (shared(AVATARS_KEY) != null || !n) return null;
  return (async () => {
    const from = `${appHome()}/data/${n}/avatars`, to = `${appHome()}/${AVATAR_DIR}`;
    await fs.mkdir(to, { recursive: true });
    for (const f of await fs.readdir(from)) if (!f.startsWith(".")) await fs.writeFile(`${to}/${f}`, await fs.readFile(`${from}/${f}`));
    setShared(AVATARS_KEY, movedAvatars(old(AVATARS_KEY)));
  })().catch(() => {});
}

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const hit = find(child, id);
    if (hit) return hit;
  }
  return null;
}
// Same rule as the shipped agents mod: a sidebar under 160px is a rail.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;
const REMEMBER_MAX = 200; // remembered addresses, oldest dropped first
// statusline.mjs only runs in Claude Code; another agent in that terminal gets no numbers.
const isClaude = (a) => (a.app ? a.app === "claude-code" : a.program?.key === "claude");
// A shared map's JSON with sorted keys, so the stored order never counts as a change.
const same = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());

export default class SakamichiAgents extends View {
  // members.json as the shown group (the theme's, else the one picked) sees it; rebuilt only
  // when the file or the group changes. Read it once per render: it asks shared() each time.
  get cfg() {
    const g = activeGroup(settings(), shared(GROUP_KEY));
    if (!this.cfgOf || this.cfgOf.all !== this.all || this.cfgOf.g !== g) this.cfgOf = { all: this.all, g, cfg: forGroup(this.all, g) };
    return this.cfgOf.cfg;
  }

  init(_props, cx) {
    this.all = parseConfig("{}");
    cx.spawn(async (cx) => {
      this.all = parseConfig(await readTextFile(CONFIG).catch(() => null));
      cx.notify();
    });
    // As an overlay (the ⚙ button, a right-click, or `mod.open sakamichi-agents`) it is the settings dialog.
    if (props()?.overlay) { this.settings = new Settings(this); return; }
    const moving = migrate();
    this.sessions = {}; // address → { updatedAt, context, quota, model }
    this.reads = {}; // address → number of the latest read, so an older one can't win
    this.readSessions(cx);
    // The folder must exist for the watch to start on the very first run.
    cx.spawn(async (cx) => { await moving; await fs.mkdir(SESSION_DIR, { recursive: true }).catch(() => {}); this.watchSessions(cx); });
    // A full reread now and then: new agents, a stopped watch, and the "stale" dimming.
    cx.timer.every(30000, (cx) => { this.readSessions(cx); this.watchSessions(cx); cx.notify(); });
  }

  // Merged into what was remembered (`prev`), so an agent missing for a moment keeps its
  // member. Also publishes the names the cards show (NAMES_KEY, same keys) for other mods.
  remember(map, prev, cfg) {
    const next = { ...prev };
    for (const [addr, m] of map) { delete next[addr]; next[addr] = m.ja; } // newest last
    const keys = Object.keys(next);
    for (const k of keys.slice(0, Math.max(0, keys.length - REMEMBER_MAX))) delete next[k];
    const names = Object.fromEntries(Object.entries(next).map(([addr, ja]) => [addr, nameOf(findMember(ja, cfg.known), cfg.lang) || ja]));
    // Only on change: setShared re-renders every mod.
    if (!same(next, prev)) setShared(ASSIGNED_KEY, next);
    if (!same(names, shared(NAMES_KEY))) setShared(NAMES_KEY, names);
  }

  // Labels each terminal that has no known member yet. A good label is never rewritten: two
  // clients with different pins would fight over it. A failed `hc` isn't retried until restart.
  label(map, labels, cfg) {
    this.labeling ??= new Set();
    for (const [addr, m] of map) {
      if (findMember(labels[addr], cfg.known) || this.labeling.has(addr)) continue;
      this.labeling.add(addr);
      hc(["label", addr, `${MEMBER_LABEL}=${m.ja}`]).then((r) => { if (r.code === 0) this.labeling.delete(addr); }, () => {});
    }
  }

  avatar(m, a, t, size, map, lang) {
    const ring = a.status === "blocked" ? t.blocked : a.status === "working" ? t.working : t.border;
    return avatarBox(m, size, t, lang, m ? map[m.ja] : null, ring);
  }

  // "HP ▇▇▇░░ 62%": no number → "—" and no fill; under 20% turns amber; stale is dim.
  bar(label, g, color, t) {
    const fill = g.pct !== null && g.pct < 20 ? t.blocked : color;
    return h_flex().w_full().min_w(0).h(14).gap(6).items_center()
      .child(div().w(22).flex_none().text_size(11).font_semibold().text_color(t.dim).child(label))
      .child(h_flex().flex_1().min_w(0).h(6).rounded(3).overflow_hidden().bg(t.raised)
        .when(g.pct !== null, (el) => el.child(div().h_full().w(`${g.pct}%`).rounded(3).bg(fill))))
      .child(div().w(34).flex_none().text_size(11).text_color(g.stale ? t.dim : t.foreground).child(g.text));
  }

  // Status word with a native animation (no timers): a spinning disc while working,
  // a drifting, fading zZZ while idle, a bobbing message while blocked, a pulsing check when done.
  status(a, t, w) {
    const color = t[a.status] ?? t.dim;
    const icon =
      a.status === "working"
        ? svg("mods/sakamichi-agents/disc.svg").size(13).flex_none().text_color(color).spin(1400)
        : a.status === "idle"
          ? div().relative().size(14).flex_none().loop("top", { from: 1.5, to: -2, period: 2400 })
              .child(svg("mods/sakamichi-agents/zzz.svg").size(14).text_color(color).loop("opacity", { from: 0.3, to: 1, period: 2400 }))
          : a.status === "blocked"
            ? div().relative().size(14).flex_none().loop("top", { from: 0, to: -2, period: 700 })
                .child(svg("mods/sakamichi-agents/message.svg").size(14).text_color(color))
            : a.status === "done"
              ? svg("mods/sakamichi-agents/check.svg").size(14).flex_none().text_color(color).loop("opacity", { from: 0.45, to: 1, period: 1600 })
              : null;
    return h_flex().flex_none().gap(4).items_center().when(Boolean(icon), (el) => el.child(icon))
      .child(div().text_size(11).text_color(color).child(w[a.status] ?? a.status));
  }

  card(a, m, t, w, now, map, lang) {
    const frame = a.status === "blocked" ? t.blocked : a.focused ? t.accent : t.border;
    const s = isClaude(a) ? this.sessions[a.address] ?? null : null;
    return h_flex()
      .id(`sakamichi-${a.address}`)
      .w_full().flex_none().p(10).gap(12).items_center().rounded(12)
      .bg(`${t.surface}c8`).border(1).border_color(frame)
      .cursor_pointer().hover((s) => s.bg(t.hover))
      .on_click(() => run("agent.focus", { terminal: a.address }))
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openSettings(m?.ja); })
      .child(this.avatar(m, a, t, AVATAR_PX, map, lang))
      .child(
        v_flex().flex_1().min_w(0).gap(7)
          .child(
            h_flex().w_full().min_w(0).gap(8).items_center()
              // "岡本姫奈 / Opus 5.5": the model from statusline.mjs (Claude Code only).
              .child(h_flex().flex_1().min_w(0).gap(5).items_baseline()
                .child(div().flex_none().text_size(14).font_semibold().child(nameOf(m, lang) || a.address))
                .when(Boolean(s?.model), (el) => el.child(div().min_w(0).truncate().text_size(11).text_color(t.muted).child(`/ ${s.model}`))))
              .child(this.status(a, t, w)))
          // HP = 5-hour quota left (gone means game over); MP = context left (compaction
          // restores it).
          // A bar with no number (null) is left out, not shown as "—".
          .when(s?.quota != null, (el) => el.child(this.bar(w.hp, gauge(s.quota, s.updatedAt, now), t.done, t)))
          .when(s?.context != null, (el) => el.child(this.bar(w.mp, gauge(s.context, s.updatedAt, now), t.ansi12 ?? t.working, t))));
  }

  // Numbers from statusline.mjs for the given addresses (default: every agent), in
  // parallel; redraws only when something changed. Remote agents have no file: "—".
  readSessions(cx, addresses = agents().map((a) => a.address)) {
    const files = addresses.map((a) => [a, sessionFile(SESSION_DIR, a), (this.reads[a] = (this.reads[a] ?? 0) + 1)]).filter(([, f]) => f);
    cx.spawn(async (cx) => {
      const read = await Promise.all(files.map(async ([a, f, n]) => [a, parseSession(await readTextFile(f).catch(() => null)), n]));
      const fresh = read.filter(([a, , n]) => this.reads[a] === n).map(([a, s]) => [a, s]);
      const next = { ...this.sessions, ...Object.fromEntries(fresh) };
      if (JSON.stringify(next) === JSON.stringify(this.sessions)) return;
      this.sessions = next;
      cx.notify();
    });
  }

  // Rereads just the files that changed (a batch with the folder itself means "all").
  watchSessions(cx) {
    if (this.watching) return;
    this.watching = true;
    cx.spawn(async (cx) => {
      for (;;) {
        let changed;
        try { changed = await watchFolder(SESSION_DIR); } catch { break; }
        const names = changed.map((p) => p.split("/").pop()).filter((n) => /^[^.].*\.json$/.test(n));
        this.readSessions(cx, changed.includes(SESSION_DIR) ? undefined : names.map((n) => n.slice(0, -5)));
      }
      this.watching = false;
    });
  }

  render(cx) {
    if (this.settings) return this.settings.render(cx);
    const t = theme();
    const cfg = this.cfg;
    const w = WORDS[cfg.lang];
    // Pinned first, like the built-in agents list.
    const all = agents();
    const list = [...all.filter((a) => a.pinned), ...all.filter((a) => !a.pinned)];
    // address → member's ja name, read fresh each time (shared: it survives restarts, the dialog
    // sees it, and with two lists open the one that wrote last wins in both).
    // A terminal's label (set by any client) wins over this client's memory.
    const prev = assignedMap(shared(ASSIGNED_KEY));
    const labels = labelMap(terminals());
    const map = assign(list, cfg, { ...prev, ...labels });
    // Not before members.json has loaded (or when it is empty or broken): every name would be ja.
    if (cfg.known.length) { this.remember(map, prev, cfg); this.label(map, labels, cfg); }
    setAgentOrder(list.map((a) => a.address));
    const now = Math.floor(Date.now() / 1000);
    const avatarsMap = avatars();

    if (narrow()) {
      return v_flex().id("sakamichi-rail").size_full().items_center().gap(8).py(8).overflow_y_scrollbar()
        .children(list.map((a) =>
          div().id(`sakamichi-r-${a.address}`).cursor_pointer()
            .on_click(() => run("agent.focus", { terminal: a.address }))
            .child(this.avatar(map.get(a.address), a, t, 30, avatarsMap, cfg.lang))));
    }

    return v_flex().id("sakamichi-agents").size_full().min_h(0).text_color(t.foreground).text_size(13)
      .child(
        h_flex().flex_none().px(12).pt(10).pb(4).gap(6).items_center()
          .child(div().text_size(12).font_semibold().text_color(t.muted).child(w.title))
          .child(div().flex_1().text_size(11).text_color(t.dim).child(`${list.length}`))
          .child(div().id("sakamichi-gear").px(6).rounded(6).text_size(14).text_color(t.dim).cursor_pointer()
            .hover((s) => s.bg(t.hover).text_color(t.foreground))
            .on_click(() => openSettings(null)).child("⚙")))
      .child(
        v_flex().flex_1().min_h(0).gap(6).p(6).overflow_y_scrollbar()
          .children(list.map((a) => this.card(a, map.get(a.address), t, w, now, avatarsMap, cfg.lang)))
          .when(list.length === 0, (el) => el.child(div().p(8).text_size(12).text_color(t.dim).child(w.none))));
  }
}
