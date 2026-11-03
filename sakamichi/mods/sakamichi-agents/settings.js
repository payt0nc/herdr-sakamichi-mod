// The settings dialog: pick the group (乃木坂46 / 櫻坂46 / 日向坂46, which also switches the
// theme), then an image for any of its members, by drop or by path / URL, or import the
// group's official photos. Opened from the Members panel as an overlay of this same mod.
import { div, image } from "gpui-kit";
import { h_flex, v_flex, InputState, Input } from "gpui-base";
import { agents, appHome, closeOverlay, exec, home, props, run, settings, setShared, shared, theme } from "herdr";
import * as fs from "fs/promises";
import { AVATAR_DIR, AVATAR_OUT, GROUPS, WORDS, avatarMap, assignedMap, avatarSource, badge, isOfficial, nameOf, officialPhotos, squareCrop, themeGroup } from "./lib.js";

export const AVATARS_KEY = "sakamichi-agents.avatars"; // shared: member ja name → image path
export const ASSIGNED_KEY = "sakamichi-agents.assigned"; // shared: agent address → member ja name
export const NAMES_KEY = "sakamichi-agents.names"; // shared: agent address → the name its card shows (same keys)
export const GROUP_KEY = "sakamichi-agents.group"; // shared: "n46" | "s46" | "h46"

const FACE_SCRIPT = `${appHome()}/mods/sakamichi-agents/face.jxa`;
const IMPORTS_AT_ONCE = 4;
const ok = async (cmd, args) => (await exec(cmd, args).catch(() => ({ code: 1 }))).code === 0;
const rm = (...rel) => Promise.all(rel.map((p) => fs.unlink(`${appHome()}/${p}`).catch(() => {})));

export const avatars = () => avatarMap(shared(AVATARS_KEY));

// Saves (or, with null, removes) a member's avatar, then deletes the file it replaced.
async function store(member, path) {
  const map = avatars();
  const old = map[member];
  if (path) map[member] = path;
  else delete map[member];
  setShared(AVATARS_KEY, map);
  if (old && old !== path) await rm(old);
}

// The rounded-square avatar: the picture at `path`, else the name's first letter on accent.
export function avatarBox(m, size, t, lang, path, ring) {
  const r = Math.round(size * 0.22);
  const box = div().size(size).flex_none().rounded(r).when(Boolean(ring), (el) => el.border(2).border_color(ring));
  return path
    ? box.overflow_hidden().child(image(path).size_full().rounded(r))
    : box.flex().items_center().justify_center().bg(t.accent).text_color(t.accent_foreground)
        .text_size(Math.round(size * 0.42)).font_semibold().child(badge(m, lang));
}

// Copies or downloads the image, crops a face-focused square (macOS Vision + sips; the top
// square without a face), shrinks it to AVATAR_OUT and returns its home-relative path, or
// null. Every image gets a new name: Herdr caches images by path.
let lastStamp = 0; // ms, but never repeated, so overlapping imports never share a file
export async function importAvatar(source, prefix = "") {
  const dir = `${appHome()}/${AVATAR_DIR}`;
  const name = `${prefix}${(lastStamp = Math.max(Date.now(), lastStamp + 1))}`;
  const part = `${dir}/.${name}.part.jpg`; // an image extension, or Vision can't read it
  const out = `${dir}/${name}.jpg`;
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  try {
    const got = source.url
      ? await ok("curl", ["-fsSL", "--proto", "=http,https", "--max-time", "25", "--max-filesize", "20000000", "-A", "herdr-sakamichi-agents", "-o", part, source.url])
      : await ok("cp", ["-f", source.file, part]);
    if (!got) return null;
    const jpeg = await exec("sips", ["-s", "format", "jpeg", part, "--out", part]).catch(() => null);
    if (!jpeg) {
      // ponytail: no sips (Linux, Windows; exec rejects when it can't start): keep a png/jpg as it is, uncropped.
      const ext = (source.url ?? source.file).match(/\.(png|jpe?g)(?:[?#].*)?$/i)?.[1]?.toLowerCase();
      const plain = `${name}.${ext}`;
      return ext && (await ok("mv", ["-f", part, `${dir}/${plain}`])) ? `${AVATAR_DIR}/${plain}` : null;
    }
    if (jpeg.code !== 0) return null; // not an image
    const face = await exec("osascript", ["-l", "JavaScript", FACE_SCRIPT, part]).catch(() => null);
    let c = face?.code === 0 ? squareCrop(face.stdout) : null;
    if (!c) { // no Vision: the top square, from sips' own size
      const size = await exec("sips", ["-g", "pixelWidth", "-g", "pixelHeight", part]).catch(() => null);
      const px = (k) => size?.stdout.match(new RegExp(`${k}: (\\d+)`))?.[1];
      c = size?.code === 0 ? squareCrop(`${px("pixelWidth")} ${px("pixelHeight")}`) : null;
    }
    const done = c && await ok("sips", ["-c", `${c.side}`, `${c.side}`, "--cropOffset", `${c.top}`, `${c.left}`, part, "--out", out]);
    return done && (await ok("sips", ["-Z", `${AVATAR_OUT}`, out])) ? `${AVATAR_DIR}/${name}.jpg` : null;
  } finally {
    await fs.unlink(part).catch(() => {});
  }
}

export class Settings {
  constructor(view) {
    this.view = view;
    this.selected = props()?.member ?? null;
    this.message = null;
    this.busy = null;
    this.input = InputState.new({ placeholder: "/path/to/image.png  ·  ~/Pictures/me.jpg  ·  https://…" });
    this.input.on("submit", (_e, cx) => this.submit(cx));
  }

  // Sets `member`'s avatar from a typed / dropped source.
  apply(member, text, cx) {
    const w = WORDS[this.view.cfg.lang];
    const source = avatarSource(text, home());
    if (!member || this.busy) return; // one import (or official run) at a time
    if (!source) { this.message = { text: w.bad, error: true }; return cx.notify(); }
    this.busy = member;
    this.message = { text: w.busy };
    cx.notify();
    cx.spawn(async (cx) => {
      const path = await importAvatar(source).catch(() => null);
      this.busy = null;
      if (!path) { this.message = { text: w.failed, error: true }; return cx.notify(); }
      await store(member, path);
      this.message = { text: `${w.saved}: ${member}` };
      this.input.set_value("");
      cx.notify();
    });
  }

  // Only when the person clicks: fetch the official member list, then import the photo of
  // every member without an avatar, or with an earlier official one (refreshed). Pictures
  // the person chose are never replaced. A few at a time, saved as each one lands.
  importOfficial(cx) {
    if (this.busy) return;
    const { lang, group } = this.view.cfg;
    const w = WORDS[lang];
    this.busy = "official";
    this.message = { text: w.importing(0, "…") };
    cx.notify();
    cx.spawn(async (cx) => {
      const res = await fetch(GROUPS[group].api).catch(() => null);
      const urls = officialPhotos(res?.ok ? await res.text().catch(() => "") : "", group);
      if (urls.size === 0) { this.busy = null; this.message = { text: w.offline, error: true }; return cx.notify(); }
      const free = (m) => !avatars()[m.ja] || isOfficial(avatars()[m.ja]);
      const todo = this.view.cfg.members.filter((m) => urls.has(m.ja) && free(m));
      let next = 0, tried = 0, done = 0;
      const worker = async () => {
        while (next < todo.length) {
          const m = todo[next++];
          const path = await importAvatar({ url: urls.get(m.ja) }, "official-").catch(() => null);
          if (path && !free(m)) await rm(path); // the person set one meanwhile
          else if (path) { await store(m.ja, path); done++; }
          this.message = { text: w.importing(++tried, todo.length) };
          cx.notify();
        }
      };
      await Promise.all(Array.from({ length: IMPORTS_AT_ONCE }, worker));
      this.busy = null;
      this.message = { text: w.imported(done) };
      cx.notify();
    });
  }

  reset(member, cx) { if (!this.busy) cx.spawn(() => store(member, null)); }

  // Two clicks: the first arms it (the label asks to confirm), the second clears everyone:
  // every group, members no longer in members.json, and every picture in the avatars folder
  // (not an import still in progress: those are dot files).
  resetAll(cx) {
    if (this.busy) return;
    this.armed = !this.armed;
    if (!this.armed) {
      setShared(AVATARS_KEY, {});
      cx.spawn(async () => {
        const names = await fs.readdir(`${appHome()}/${AVATAR_DIR}`).catch(() => []);
        await rm(...names.filter((n) => !n.startsWith(".")).map((n) => `${AVATAR_DIR}/${n}`));
      });
    }
    cx.notify();
  }

  // Shows another group: its members get handed out to the agents, and on the sakamichi layout (or
  // one already on a group's theme, which the group follows) its theme applies. `app.theme`
  // fills only the half of the theme's lightness, the dark one for our themes; there is no
  // call for the light half, so in light mode the colours stay as the layout file has them.
  pickGroup(group, cx) {
    if (this.busy) return;
    this.selected = null;
    this.armed = false;
    this.message = null;
    setShared(GROUP_KEY, group);
    if (shared("layout") === "sakamichi" || themeGroup(settings())) run("app.theme", { name: group });
    cx.notify();
  }

  submit(cx) { this.apply(this.selected, this.input.value(), cx); }

  row(m, used, path, t, w, cfg) {
    const lang = cfg.lang;
    const selected = this.selected === m.ja;
    const other = m.group !== cfg.group ? GROUPS[m.group]?.[lang] : "";
    return h_flex().id(`set-${m.ja}`)
      .w_full().flex_none().px(10).py(8).gap(12).items_center().rounded(10)
      .border(1).border_color(selected ? t.accent : "#00000000")
      .bg(selected ? t.selected : "#00000000").hover((s) => s.bg(t.hover)).cursor_pointer()
      .on_click((_e, cx) => { this.selected = m.ja; this.message = null; cx.notify(); })
      // Drop an image file straight onto a member.
      .on_drop((e, cx) => { cx.stop_propagation(); this.selected = m.ja; this.apply(m.ja, e.paths?.[0], cx); })
      .child(avatarBox(m, 44, t, lang, path))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().truncate().text_size(14).font_semibold().child(nameOf(m, lang)))
        .child(div().truncate().text_size(11).text_color(t.dim)
          .child([other, m.gen ? w.gen(m.gen) : "", used.length ? `${w.inUse} · ${used.join(", ")}` : ""].filter(Boolean).join("  ·  "))))
      .when(this.busy === m.ja, (el) => el.child(div().text_size(11).text_color(t.muted).child(w.busy)))
      .when(Boolean(path) && this.busy !== m.ja, (el) => el.child(
        h_flex().id(`reset-${m.ja}`).flex_none().h(26).px(10).items_center().rounded(7)
          .border(1).border_color(t.input).bg(t.raised).text_size(11.5).cursor_pointer()
          .hover((s) => s.opacity(0.85))
          .on_click((_e, cx) => { cx.stop_propagation(); this.reset(m.ja, cx); })
          .child(w.reset)));
  }

  // Esc closes the dialog by itself (Herdr closes the top dialog).
  render() {
    const t = theme();
    const cfg = this.view.cfg;
    const w = WORDS[cfg.lang];
    const { group } = cfg;
    const map = avatars();
    // Which agents each member stands for, so people find "their" agent first.
    const assigned = assignedMap(shared(ASSIGNED_KEY));
    const tabs = Object.fromEntries(agents().map((a) => [a.address, a.tab_name || a.address]));
    const usedBy = {};
    for (const [addr, ja] of Object.entries(assigned)) if (tabs[addr]) (usedBy[ja] ??= []).push(tabs[addr]);
    // Agents keep their member when the group changes, so members of other groups still in
    // use are listed too (first), to keep their avatars settable.
    const others = cfg.known.filter((m) => m.group !== group && usedBy[m.ja]);
    const members = [...others, ...[...cfg.members].sort((a, b) => (usedBy[b.ja] ? 1 : 0) - (usedBy[a.ja] ? 1 : 0))];
    const sel = members.find((m) => m.ja === this.selected) ?? null;

    return v_flex().id("sakamichi-settings")
      .on_drop((e, cx) => this.apply(this.selected, e.paths?.[0], cx))
      .size_full().min_h(0).p(18).gap(10).bg(t.popover).text_color(t.foreground)
      .child(h_flex().items_center().gap(8)
        .child(div().flex_1().text_size(16).font_semibold().child(w.settings))
        .child(div().id("set-close").text_size(12).text_color(t.dim).cursor_pointer()
          .on_click(() => closeOverlay(props().overlay)).child("Esc ✕")))
      .child(h_flex().gap(6)
        .children(Object.entries(GROUPS).map(([g, name]) => {
          const on = g === group;
          return h_flex().id(`set-group-${g}`).flex_1().h(32).items_center().justify_center().rounded(8)
            .border(1).border_color(on ? t.accent : t.input).bg(on ? t.selected : "#00000000")
            .text_size(13).font_semibold().text_color(on ? t.foreground : t.muted)
            .cursor_pointer().hover((s) => s.bg(t.hover))
            .on_click((_e, cx) => this.pickGroup(g, cx))
            .child(name[cfg.lang]);
        })))
      .child(div().text_size(12).text_color(t.muted).child(w.hint))
      .child(h_flex().gap(10).items_center()
        .child(h_flex().id("set-official").flex_none().h(30).px(12).items_center().rounded(8)
          .border(1).border_color(t.accent).text_size(12).font_semibold()
          .text_color(this.busy === "official" ? t.dim : t.foreground)
          .cursor_pointer().hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => this.importOfficial(cx))
          .child(w.official))
        .child(div().flex_1().text_size(11).text_color(t.dim).child(w.officialHint))
        .child(h_flex().id("set-reset-all").flex_none().h(30).px(12).items_center().rounded(8)
          .border(1).border_color(this.armed ? t.blocked : t.input).text_size(12)
          .text_color(this.armed ? t.blocked : t.muted).cursor_pointer().hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => this.resetAll(cx))
          .child(this.armed ? w.resetAllConfirm : w.resetAll)))
      .child(v_flex().id("set-list").flex_1().min_h(0).gap(2).overflow_y_scrollbar()
        .children(members.map((m) => this.row(m, usedBy[m.ja] ?? [], map[m.ja], t, w, cfg))))
      .child(v_flex().flex_none().gap(8).pt(6)
        .child(div().text_size(12).text_color(sel ? t.foreground : t.dim).child(sel ? nameOf(sel, cfg.lang) : "—"))
        .child(h_flex().gap(8).items_center()
          .child(div().flex_1().min_w(0).child(Input.new(this.input).h(34).px(10).rounded(8).border_1()
            .border_color(t.input).bg(t.background).text_size(12.5).text_color(t.foreground)))
          .child(h_flex().id("set-apply").flex_none().h(34).px(16).items_center().rounded(8)
            .bg(t.solid).text_color(t.solid_foreground).text_size(12.5).font_semibold().cursor_pointer()
            .hover((s) => s.opacity(0.88)).on_click((_e, cx) => this.submit(cx)).child(w.set)))
        .child(div().h(16).text_size(11.5).text_color(this.message?.error ? t.blocked : t.muted).child(this.message?.text ?? "")));
  }
}
