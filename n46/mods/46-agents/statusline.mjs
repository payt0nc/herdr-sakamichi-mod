#!/usr/bin/env node
// Claude Code statusLine for 46-agents. Saves this terminal's model name, context left (MP)
// and 5-hour quota left (HP) to ~/.config/herdr-app/data/46-agents/sessions/<terminal>.json,
// then hands the same input to your own status line, if you name it, and prints its output:
//   node ~/.config/herdr-app/mods/46-agents/statusline.mjs ccstatusline
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
// lib.js sits next to this file. Loaded so a failure (an older node that can't load it)
// only skips saving: a status line must never break.
const lib = await import("./lib.js").catch(() => null);

const pct = (v) => (typeof v === "number" && v >= 0 && v <= 100 ? Math.round(v) : null);

function save(input) {
  const id = process.env.HC_TERMINAL_ID ?? ""; // set by Herdr in every terminal
  const dir = join(process.env.HERDR_APP_HOME || join(homedir(), ".config/herdr-app"), "data/46-agents/sessions");
  const file = lib?.sessionFile(dir, id); // null for anything but a local terminal id
  if (!file) return;
  const raw = JSON.parse(input);
  const used = pct(raw?.rate_limits?.five_hour?.used_percentage);
  const now = Math.floor(Date.now() / 1000);
  const data = {
    updatedAt: now,
    context: pct(raw?.context_window?.remaining_percentage),
    quota: used === null ? null : 100 - used,
    model: typeof raw?.model?.display_name === "string" ? raw.model.display_name.slice(0, 40) : null,
  };
  // Unchanged and fresh: skip the write, so the panel doesn't reread for nothing.
  try {
    const old = JSON.parse(readFileSync(file, "utf8"));
    if (now - old.updatedAt < 60 && old.context === data.context && old.quota === data.quota && old.model === data.model) return;
  } catch {}
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${id}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
  renameSync(tmp, file);
}

let input = "";
try { input = readFileSync(0, "utf8"); } catch {}
try { save(input); } catch {} // a status line must never disturb the session

// The wrapped command and its arguments as given, with no second round of shell quoting.
const [next, ...args] = process.argv.slice(2);
if (next) {
  const r = spawnSync(next, args, { input, encoding: "utf8" });
  process.stdout.write(r.stdout ?? "");
}
