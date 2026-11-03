// node tests/lib.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GROUPS, MEMBER_LABEL, activeGroup, movedAvatars, assign, assignedMap, avatarMap, avatarSource, badge, forGroup, groupOf, isOfficial, officialPhotos, squareCrop, themeGroup, findMember, gauge, labelMap, parseConfig, parseSession, sessionFile } from "../sakamichi/mods/sakamichi-agents/lib.js";

const all = parseConfig(readFileSync(new URL("../sakamichi/mods/sakamichi-agents/members.json", import.meta.url), "utf8"));
assert.equal(all.lang, "ja");
for (const g of Object.keys(GROUPS)) assert.ok(all.members[g].length > 0, `no ${g} members`);
const everyone = Object.values(all.members).flat();
assert.equal(new Set(everyone.map((m) => m.ja)).size, everyone.length, "duplicate member (avatars are keyed by name)");
const cfg = forGroup(all, "n46");
assert.deepEqual(forGroup(all, "bogus").members, cfg.members); // unknown group → n46
assert.equal(forGroup(all, "s46").members[0].ja, "遠藤光莉");
assert.equal(groupOf("h46"), "h46");
assert.equal(groupOf("toString"), "n46");
assert.equal(groupOf(undefined), "n46");
// the group follows the theme (dark half first: our themes are dark), else the saved pick, else n46
assert.equal(activeGroup({ theme_light: "n46", theme_dark: "s46", dark: false }, "h46"), "s46");
assert.equal(activeGroup({ theme_light: "h46", theme_dark: "graphite" }, "s46"), "h46");
assert.equal(activeGroup({ theme_light: "paper", theme_dark: "graphite" }, "s46"), "s46");
assert.equal(activeGroup({ theme_dark: "toString" }, undefined), "n46");
assert.equal(themeGroup(null), null);
// the old flat `members: [...]` (before groups) is the 乃木坂46 roster
const old = parseConfig(JSON.stringify({ members: [{ ja: "井上和", en: "Nagi Inoue", gen: 5 }] }));
assert.deepEqual(old.members.n46.map((x) => [x.ja, x.group]), [["井上和", "n46"]]);
assert.deepEqual([old.members.s46, old.members.h46], [[], []]);

const ag = (address, tab_name = "1") => ({ address, tab_name });

// distinct members until the list runs out
const many = cfg.members.map((_, i) => ag(`t${i}`));
assert.equal(new Set([...assign(many, cfg).values()].map((m) => m.ja)).size, cfg.members.length);
// picked from the address: the same agent always gets the same member, others spread out
assert.equal(assign([ag("t1")], cfg).get("t1").ja, assign([ag("t1")], cfg).get("t1").ja);
assert.ok(new Set(["t1", "t2", "t3", "t4"].map((x) => assign([ag(x)], cfg).get(x).ja)).size > 1);

// pins win (by en name, case-insensitive tab match), and no one else gets that member
const pinned = { ...cfg, pins: { "Claude Code": "sakura endo" } };
const m = assign([ag("t1"), ag("t2", "claude code")], pinned);
assert.equal(m.get("t2").ja, "遠藤さくら");
assert.notEqual(m.get("t1").ja, "遠藤さくら");

// remembered member is kept; garbage input doesn't throw
assert.equal(assign([ag("tX")], cfg, { tX: "井上和" }).get("tX").ja, "井上和");
assert.deepEqual(parseConfig("nope"), { lang: "ja", pins: {}, members: { n46: [], s46: [], h46: [] } });
assert.equal(new Set(everyone.map((m) => m.en.toLowerCase())).size, everyone.length, "duplicate en name (pins match by it)");
// switching groups keeps every agent's member; only new agents get the shown group's
const s46cfg = forGroup(all, "s46");
const kept = assign([ag("t1"), ag("t2"), ag("t3", "x")], { ...s46cfg, pins: { x: "井上和" } }, { t1: "遠藤さくら" });
assert.equal(kept.get("t1").ja, "遠藤さくら"); // remembered n46 member stays
assert.equal(kept.get("t3").ja, "井上和"); // a pin works from any group
assert.equal(kept.get("t2").group, "s46"); // a new agent gets a 櫻坂46 member
// the shown group repeats only once all of it is taken, however many others are kept
const crowd = assign([...s46cfg.members.map((_, i) => ag(`n${i}`)), ag("old")], s46cfg, { old: "井上和" });
assert.equal(new Set([...crowd.values()].map((m) => m.ja)).size, s46cfg.members.length + 1);
// more agents than the shown group has members: feeding the result back as `prev` (what
// main.js remembers) changes nothing, so nothing is rewritten and re-rendered for ever
const h46cfg = forGroup(all, "h46");
const asPrev = (map) => Object.fromEntries([...map].map(([k, v]) => [k, v.ja]));
for (const agentsNow of [
  h46cfg.members.map((_, i) => ag(`t${i}`)).concat(ag("extra")),
  [ag("extra"), ...h46cfg.members.map((_, i) => ag(`t${i}`)), ag("more")], // the extra ones first
]) {
  const first = assign(agentsNow, h46cfg);
  const second = assign(agentsNow, h46cfg, asPrev(first));
  assert.deepEqual(asPrev(second), asPrev(first));
  assert.deepEqual(asPrev(assign(agentsNow, h46cfg, asPrev(second))), asPrev(first));
}
// a remembered duplicate is kept even when the agent comes before the one it shares with
const before = assign(h46cfg.members.map((_, i) => ag(`t${i}`)).concat(ag("extra")), h46cfg);
const shuffled = [ag("extra"), ...h46cfg.members.map((_, i) => ag(`t${i}`))];
assert.deepEqual(asPrev(assign(shuffled, h46cfg, asPrev(before))), asPrev(before));

// avatar sources: URLs, absolute paths, ~ paths; nothing else
assert.deepEqual(avatarSource("https://example.com/a.png", "/Users/me"), { url: "https://example.com/a.png" });
assert.deepEqual(avatarSource(" '/tmp/a b.png' ", "/Users/me"), { file: "/tmp/a b.png" });
assert.deepEqual(avatarSource("~/Pictures/x.jpg", "/Users/me/"), { file: "/Users/me/Pictures/x.jpg" });
assert.equal(avatarSource("relative.png", "/Users/me"), null);
assert.equal(avatarSource("file:///etc/passwd", "/Users/me"), null);
assert.equal(avatarSource("", "/Users/me"), null);
assert.equal(avatarSource(undefined, "/Users/me"), null);

// shared avatar map keeps only our own folder
assert.deepEqual(avatarMap({ a: "data/sakamichi-agents/avatars/1.jpg", b: "/etc/x.jpg", c: "data/sakamichi-agents/avatars/../../x", d: 5 }), { a: "data/sakamichi-agents/avatars/1.jpg" });
assert.deepEqual(avatarMap(null), {});

// square crop: face-focused (face 58% wide, centered, head room above), else top square
const f = squareCrop("790 1000 0.3432 0.5816 0.3190 0.2520"); // official portrait (Aruno Nakanishi)
assert.deepEqual(f, { side: 435, top: 61, left: 180 });
assert.ok(Math.abs(f.left + f.side / 2 - (0.3432 + 0.159) * 790) <= 1, "face not centered");
assert.deepEqual(squareCrop("790 1000"), { side: 790, top: 0, left: 0 });
assert.deepEqual(squareCrop("1600 900"), { side: 900, top: 0, left: 350 });
const big = squareCrop("790 1000 0.05 0.05 0.9 0.9"); // face fills the picture: clamped inside
assert.ok(big.side <= 790 && big.top >= 0 && big.left >= 0 && big.top + big.side <= 1000);
const corner = squareCrop("1600 900 0.0 0.0 0.1 0.2"); // face in a corner: clamped inside
assert.ok(corner.left === 0 && corner.top + corner.side <= 900);
assert.equal(squareCrop("none"), null);
assert.deepEqual(movedAvatars({ a: "data/n46-agents/avatars/1.jpg", b: "data/46-agents/avatars/2.jpg", c: 5 }),
  { a: "data/sakamichi-agents/avatars/1.jpg", b: "data/sakamichi-agents/avatars/2.jpg", c: 5 });
assert.deepEqual(avatarMap(movedAvatars({ a: "data/n46-agents/avatars/1.jpg" })), { a: "data/sakamichi-agents/avatars/1.jpg" });
assert.ok(isOfficial("data/sakamichi-agents/avatars/official-1793711293470.jpg"));
assert.ok(isOfficial("data/sakamichi-agents/avatars/official-1793711293470.png")); // no-sips fallback keeps .png
assert.ok(!isOfficial("data/sakamichi-agents/avatars/1793711293470.jpg"));
assert.equal(assign([ag("t1")], forGroup(parseConfig("{}"), "n46")).size, 0);
// before members.json loads (or when it's broken) assign() hands out nothing, so remember() forgets no one
assert.equal(forGroup(parseConfig("{}"), "n46").members.length, 0);
assert.equal(forGroup(parseConfig("{oops"), "h46").members.length, 0);

// remembered assignment: anything but a plain object of strings is ignored, and assign() never throws on it
for (const bad of [null, undefined, "x", 5, ["井上和"], JSON.parse("null")]) {
  assert.deepEqual(assignedMap(bad), {});
  assert.equal(assign([ag("t1")], cfg, bad).size, 1);
}
assert.deepEqual(assignedMap({ t1: "井上和", t2: 3, t3: null }), { t1: "井上和" });

// a repeated ja name is dropped (it would leave assign() with no free member and throw)
const dup = forGroup(parseConfig(JSON.stringify({ members: { n46: [{ ja: "A", en: "a" }, { ja: " A ", en: "b" }, { ja: "B" }] } })), "n46");
assert.deepEqual(dup.members.map((x) => [x.ja, x.en]), [["A", "a"], ["B", "B"]]);
const dupMap = assign(["t1", "t2", "t3", "t4", "t5"].map((x) => ag(x)), dup);
assert.equal(dupMap.size, 5);
assert.ok([...dupMap.values()].every((x) => x.ja === "A" || x.ja === "B"));

const nagi = findMember("井上和", cfg.members);
assert.equal(badge(nagi, "ja"), "井");
assert.equal(badge(nagi, "en"), "NI");
// session cache
assert.equal(sessionFile("/d", "t1y"), "/d/t1y.json");
assert.equal(sessionFile("/d", "vps/t7"), null);
assert.equal(sessionFile("/d", "../x"), null);
assert.deepEqual(parseSession('{"updatedAt":100,"context":62,"quota":"x"}'), { updatedAt: 100, context: 62, quota: null, model: null });
assert.equal(parseSession('{"updatedAt":100,"model":" Opus 5.5 "}').model, "Opus 5.5");
assert.equal(parseSession('{"updatedAt":100,"model":5}').model, null);
assert.equal(parseSession("nope"), null);
assert.equal(parseSession('{"context":5}'), null);
assert.deepEqual(gauge(62, 100, 200), { text: "62%", pct: 62, stale: false });
assert.equal(gauge(62, 100, 100 + 601).stale, true);
assert.deepEqual(gauge(null, 100, 200), { text: "—", pct: null, stale: false });
assert.deepEqual(gauge(150, 100, 200), { text: "—", pct: null, stale: false });
// official list: JSONP unwrapped, names joined, graduates and foreign hosts dropped
const official = officialPhotos('res({"data":[' +
  '{"name":"井上 和","graduation":"NO","img":"https://www.nogizaka46.com/images/46/a.jpg"},' +
  '{"name":"乃木 卒業","graduation":"YES","img":"https://www.nogizaka46.com/images/46/b.jpg"},' +
  '{"name":"偽 物","graduation":"NO","img":"https://evil.example/c.jpg"},' +
  '{"name":"不 明","img":"https://www.nogizaka46.com/images/46/d.jpg"}]})'); // no graduation: not listed
assert.deepEqual([...official], [["井上和", "https://www.nogizaka46.com/images/46/a.jpg"]]);
assert.equal(officialPhotos("nope").size, 0);
// h46: plain JSON, thumbnails swapped for the 1000px version, other hosts dropped
const hinata = officialPhotos(JSON.stringify({ member: [
  { name: "金村 美玖", image_src: "https://cdn.hinatazaka46.com/images/14/807/abc/400_320_102400.jpg" },
  { name: "偽 物", image_src: "https://evil.example/400_320_102400.jpg" }] }), "h46");
assert.deepEqual([...hinata], [["金村美玖", "https://cdn.hinatazaka46.com/images/14/807/abc/1000_1000_102400.jpg"]]);
// s46: HTML, relative src made absolute, padded alt trimmed, empty alt ignored
const sakura = officialPhotos('<li><img src="/images/14/8a5/x/400_320_102400.jpg" alt="山田 桃実    "><img src="/a.png" alt="">' +
  '<img src="https://evil.example/b.jpg" alt="偽 物"></li>', "s46");
assert.deepEqual([...sakura], [["山田桃実", "https://sakurazaka46.com/images/14/8a5/x/1000_1000_102400.jpg"]]);
console.log("ok");

// Two clients of one machine: the address has a `machine/` prefix on one only. Same hash,
// and the terminal's label beats each client's own memory.
assert.equal(assign([ag("t3x")], cfg).get("t3x").ja, assign([ag("mac/t3x")], cfg).get("mac/t3x").ja);
const labels = labelMap([{ address: "mac/t3x", labels: { [MEMBER_LABEL]: "井上和" } }, { address: "t9", labels: {} }, null]);
assert.deepEqual(labels, { "mac/t3x": "井上和" });
assert.equal(assign([ag("mac/t3x")], cfg, { ...{ "mac/t3x": "遠藤さくら" }, ...labels }).get("mac/t3x").ja, "井上和");
