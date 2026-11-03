// Pure functions for sakamichi-agents: no herdr / gpui-kit imports, so node can test them.

// The three groups. The shown one is shared `sakamichi-agents.group`; its theme is themes/<key>.json.
// `api` is where the official photos come from: n46 JSONP, h46 JSON, s46 an HTML page.
export const GROUPS = {
  n46: { ja: "乃木坂46", en: "Nogizaka46", api: "https://www.nogizaka46.com/s/n46/api/list/member", host: "https://www.nogizaka46.com/" },
  s46: { ja: "櫻坂46", en: "Sakurazaka46", api: "https://sakurazaka46.com/s/s46/search/artist?ima=0000", host: "https://sakurazaka46.com/" },
  h46: { ja: "日向坂46", en: "Hinatazaka46", api: "https://www.hinatazaka46.com/s/official/api/list/member", host: "https://cdn.hinatazaka46.com/" },
};
export const groupOf = (v) => (Object.hasOwn(GROUPS, v) ? v : "n46");

// The group the theme names, from settings() (theme_dark / theme_light), or null when neither
// is one of ours. Dark first: our three themes are dark, so `app.theme` (and the theme menu)
// only ever fill the dark half; the light half holds one only from the layout file.
export function themeGroup(s) {
  for (const name of [s?.theme_dark, s?.theme_light]) if (Object.hasOwn(GROUPS, name)) return name;
  return null;
}
// The shown group: the theme's, else the one picked last (shared `sakamichi-agents.group`), else n46.
export const activeGroup = (s, saved) => themeGroup(s) ?? groupOf(saved);

// members.json → { lang, pins, members: { n46: [...], s46: [...], h46: [...] } }, dropping
// anything malformed or repeated in any group (avatars and assignments are keyed by ja name).
export function parseConfig(text) {
  let data = {};
  try { data = JSON.parse(text) ?? {}; } catch { data = {}; }
  const members = {};
  const seen = new Set();
  // The old format, a flat `members: [...]` from before groups, is the 乃木坂46 roster.
  const lists = Array.isArray(data.members) ? { n46: data.members } : data.members;
  for (const g of Object.keys(GROUPS)) {
    members[g] = (Array.isArray(lists?.[g]) ? lists[g] : [])
      .filter((m) => m && typeof m.ja === "string" && m.ja.trim() && !seen.has(m.ja.trim()) && seen.add(m.ja.trim()))
      .map((m) => ({
        ja: m.ja.trim(),
        en: typeof m.en === "string" && m.en.trim() ? m.en.trim() : m.ja.trim(),
        gen: Number(m.gen) || null,
        group: g,
      }));
  }
  const pins = data.pins && typeof data.pins === "object" && !Array.isArray(data.pins) ? data.pins : {};
  return { lang: data.lang === "en" ? "en" : "ja", pins, members };
}

// The config as one group sees it: { lang, pins, group, members: [...], known: [...] }. New agents
// get one of `members`; `known` (every group) is where pins and remembered members are
// looked up, so switching groups never renames an agent that already has a member.
export function forGroup(cfg, group) {
  const g = groupOf(group);
  return { ...cfg, group: g, members: cfg.members[g], known: Object.values(cfg.members).flat() };
}

const norm = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");

// A member by either name, case-insensitive.
export function findMember(name, members) {
  const n = norm(name);
  return n ? members.find((m) => norm(m.ja) === n || norm(m.en) === n) ?? null : null;
}

// Gives every agent a member: a pin (tab name → member) wins, then the member it had
// before (`prev`, address → ja name), both from any group (`cfg.known`), then a free one of
// the shown group picked from its address. Members repeat only once all of the shown group
// are taken; then an agent keeps the member it had (even if another has it too), so feeding
// the result back as `prev` returns the same map. Returns address → member.
export function assign(agents, cfg, prev) {
  prev = assignedMap(prev);
  const out = new Map();
  const used = new Set();
  const { known } = cfg;
  const pinFor = (a) => {
    const key = Object.keys(cfg.pins).find((k) => norm(k) === norm(a.tab_name));
    return key ? findMember(cfg.pins[key], known) : null;
  };
  for (const a of agents) {
    const m = pinFor(a);
    if (m) { out.set(a.address, m); used.add(m.ja); }
  }
  for (const a of agents) {
    if (out.has(a.address)) continue;
    const m = findMember(prev[a.address], known);
    if (m && !used.has(m.ja)) { out.set(a.address, m); used.add(m.ja); }
  }
  const n = cfg.members.length;
  for (const a of agents) {
    if (out.has(a.address) || n === 0) continue;
    // Hashed without the `machine/` prefix, which only some clients see.
    const start = [...a.address.split("/").pop()].reduce((s, c) => s + c.codePointAt(0), 0);
    const ring = Array.from({ length: n }, (_, i) => cfg.members[(start + i) % n]);
    const m = ring.find((x) => !used.has(x.ja)) ?? findMember(prev[a.address], known) ?? ring[0];
    out.set(a.address, m);
    used.add(m.ja);
  }
  return out;
}

// shared.json is per Herdr client, so each terminal also carries its member as a core label,
// which every client connected to that machine sees. terminals() → address → ja name.
export const MEMBER_LABEL = "sakamichi.member";
export function labelMap(terms) {
  const out = {};
  for (const x of Array.isArray(terms) ? terms : []) {
    const v = x?.labels?.[MEMBER_LABEL];
    if (typeof x?.address === "string" && typeof v === "string" && v) out[x.address] = v;
  }
  return out;
}

// The remembered assignment (address → ja name) from shared state, whatever it holds.
export function assignedMap(value) {
  const out = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) if (typeof v === "string") out[k] = v;
  }
  return out;
}

// Avatar size on a card, and the saved image: 2× for sharp Retina, no bigger.
export const AVATAR_PX = 72;
export const AVATAR_OUT = AVATAR_PX * 2;

// The square to crop for an avatar, from face.jxa's output ("W H" or "W H x y w h").
// With a face: face-focused. The face is 58% of the width, centered across, with 0.42 face
// heights above it, so the top of the head meets the top edge. Without: the biggest
// square, top-aligned, centered across. Clamped inside the picture.
// Returns { side, top, left } in pixels (sips -c side side --cropOffset top left), or null.
export function squareCrop(text) {
  const n = String(text ?? "").trim().split(/\s+/).map(Number);
  const [W, H] = n;
  if (!(W > 0 && H > 0) || n.some((v) => !Number.isFinite(v))) return null;
  let side = Math.min(W, H), cx = W / 2, top = 0;
  if (n.length === 6 && n[4] > 0 && n[5] > 0) {
    const [, , x, y, w, h] = n;
    side = Math.min(w * W / 0.58, W, H);
    cx = (x + w / 2) * W;
    top = (1 - y - h) * H - 0.42 * h * H; // Vision's origin is bottom-left
  }
  side = Math.round(side);
  const clamp = (v, max) => Math.round(Math.max(0, Math.min(v, max)));
  return { side, top: clamp(top, H - side), left: clamp(cx - side / 2, W - side) };
}

// Official imports are named official-<ms>.jpg, so a later import may refresh them
// without touching pictures the person chose.
export const isOfficial = (path) => typeof path === "string" && /\/official-\d+\.\w+$/.test(path);

// Context left, 5-hour quota left and model, written by statusline.mjs per local terminal.
export const STALE_SECONDS = 600;
const pct = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null);

// Only local terminal ids (t1y), never paths; remote ones (vps/t7) have no file here.
export const sessionFile = (dir, address) =>
  typeof address === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(address) ? `${dir}/${address}.json` : null;

export function parseSession(text) {
  let d;
  try { d = JSON.parse(text); } catch { return null; }
  if (!d || typeof d !== "object" || !(typeof d.updatedAt === "number" && d.updatedAt >= 0)) return null;
  const model = typeof d.model === "string" && d.model.trim() ? d.model.trim().slice(0, 40) : null;
  return { updatedAt: d.updatedAt, context: pct(d.context), quota: pct(d.quota), model };
}

// One bar: "—" and no fill without a number; old numbers stay true but are marked stale.
export function gauge(value, updatedAt, now) {
  const p = pct(value);
  if (p === null || typeof updatedAt !== "number") return { text: "—", pct: null, stale: false };
  return { text: `${p}%`, pct: p, stale: now - updatedAt > STALE_SECONDS };
}

export const nameOf = (m, lang) => (m ? (lang === "en" ? m.en : m.ja) : "");

// What the avatar shows without an image: the first character in Japanese, initials in English.
export function badge(m, lang) {
  if (!m) return "?";
  if (lang !== "en") return [...m.ja][0];
  return m.en.split(/\s+/).map((w) => [...w][0] ?? "").join("").slice(0, 2).toUpperCase();
}

// What the person typed or dropped as an avatar: an http(s) URL or an absolute file path
// ("~/" expands to `home`). Returns { url } or { file }, or null.
export function avatarSource(text, home) {
  const v = String(text ?? "").trim().replace(/^["']|["']$/g, "");
  if (/^https?:\/\/[^\s/]+\S*$/i.test(v)) return { url: v };
  const file = v.startsWith("~/") && home ? `${home.replace(/\/+$/, "")}/${v.slice(2)}` : v;
  return file.startsWith("/") && !/[\0\n]/.test(file) ? { file } : null;
}

// A group's official member list → member ja name → photo URL, for current members, keeping
// only URLs on that group's host. The three sites answer differently:
// - n46: JSONP res({"data":[{name: "井上 和", img, graduation: "NO"}]})
// - h46: JSON {"member":[{name: "金村 美玖", image_src}]} (current members only)
// - s46: an HTML page, <img src="/images/…/400_320_102400.jpg" alt="森田 ひかる">
export function officialPhotos(text, group = "n46") {
  const out = new Map();
  if (typeof text !== "string") return out;
  const g = groupOf(group);
  const { host } = GROUPS[g];
  let list;
  if (g === "s46") {
    list = [...text.matchAll(/<img src="([^"]+)" alt="([^"]+)"/g)]
      .map(([, img, name]) => ({ name, img: img.startsWith("/") ? host + img.slice(1) : img }));
  } else {
    let data;
    try { data = JSON.parse(text); } catch {
      try { data = JSON.parse(text.slice(text.indexOf("(") + 1, text.lastIndexOf(")"))); } catch { return out; }
    }
    const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data?.member) ? data.member : [];
    list = raw.filter((m) => g !== "n46" || m?.graduation === "NO").map((m) => ({ name: m?.name, img: m?.img ?? m?.image_src }));
  }
  for (const { name, img } of list) {
    if (typeof name !== "string" || typeof img !== "string" || !img.startsWith(host) || /\s/.test(img)) continue;
    // s46 / h46 list thumbnails (…/400_320_102400.jpg, 247×320); the same path serves 1000_1000.
    out.set(name.replace(/\s+/g, ""), img.replace(/\/\d+_\d+_102400\.jpg$/, "/1000_1000_102400.jpg"));
  }
  return out;
}

// The shared avatars map (member ja name → home-relative image path), keeping only
// paths inside our own avatars folder.
export const AVATAR_DIR = "data/sakamichi-agents/avatars";
// ponytail: the mod was named n46-agents, then 46-agents, until November 2026. Drop these
// (and migrate() in main.js) once old installs have moved. Newest old name first.
export const OLD_NAMES = ["46-agents", "n46-agents"];
export const movedAvatars = (map) =>
  Object.fromEntries(Object.entries(map ?? {}).map(([k, p]) =>
    [k, typeof p === "string" ? p.replace(/^data\/n?46-agents\/avatars\//, `${AVATAR_DIR}/`) : p]));
export function avatarMap(value) {
  const out = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, p] of Object.entries(value)) {
      if (typeof p === "string" && p.startsWith(`${AVATAR_DIR}/`) && !p.includes("..")) out[k] = p;
    }
  }
  return out;
}

export const WORDS = {
  ja: { title: "メンバー", none: "エージェントなし", hp: "HP", mp: "MP",
    official: "公式サイトの写真を取り込む", officialHint: "自分で設定した画像はそのまま", resetAll: "すべてリセット", resetAllConfirm: "もう一度押すと全員リセット", importing: (n, all) => `取り込み中… ${n}/${all}`, imported: (n) => `${n}人の写真を取り込みました`, offline: "公式サイトに接続できませんでした",
    settings: "設定", hint: "画像をドラッグ＆ドロップ、またはファイルのパス / URL を入力",
    set: "設定", reset: "リセット", inUse: "使用中", busy: "処理中…", saved: "設定しました", bad: "パスまたは URL が正しくありません", failed: "画像を読み込めませんでした", gen: (g) => `${g}期生`, working: "作業中", blocked: "要対応", done: "完了", idle: "待機" },
  en: { title: "Members", none: "No agents", hp: "HP", mp: "MP",
    official: "Import official photos", officialHint: "Pictures you set stay", resetAll: "Reset all", resetAllConfirm: "Click again to reset everyone", importing: (n, all) => `Importing… ${n}/${all}`, imported: (n) => `Imported ${n} photos`, offline: "Couldn't reach the official site",
    settings: "Settings", hint: "Drop an image on a member, or enter a file path / URL",
    set: "Set", reset: "Reset", inUse: "In use", busy: "Working…", saved: "Saved", bad: "Not a file path or URL", failed: "Couldn't load that image", gen: (g) => `Gen ${g}`, working: "Working", blocked: "Needs you", done: "Done", idle: "Idle" },
};
