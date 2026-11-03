#!/usr/bin/env node
// Claude Code statusLine for sakamichi-agents. Saves this terminal's model name, context left (MP)
// and 5-hour quota left (HP) as its core label sakamichi.session (`hc label`), which every
// Herdr client connected to this machine sees, then hands the same input to your own status
// line, if you name it, and prints its output:
//   node ~/.config/herdr-app/mods/sakamichi-agents/statusline.mjs ccstatusline
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LABEL = "sakamichi.session"; // SESSION_LABEL in lib.js
const pct = (v) => (typeof v === "number" && v >= 0 && v <= 100 ? Math.round(v) : null);
const hc = (...args) => spawnSync("hc", args, { encoding: "utf8", timeout: 2000 });

function save(input) {
  const id = process.env.HC_TERMINAL_ID; // set by Herdr in every terminal
  if (!id) return;
  const raw = JSON.parse(input);
  const used = pct(raw?.rate_limits?.five_hour?.used_percentage);
  const now = Math.floor(Date.now() / 1000);
  const data = {
    updatedAt: now,
    context: pct(raw?.context_window?.remaining_percentage),
    quota: used === null ? null : 100 - used,
    model: typeof raw?.model?.display_name === "string" ? raw.model.display_name.slice(0, 40) : null,
  };
  // Unchanged and fresh: skip the write, so every client doesn't redraw for nothing.
  try {
    const old = JSON.parse(JSON.parse(hc("get", id, "--json").stdout).labels[LABEL]);
    if (now - old.updatedAt < 60 && old.context === data.context && old.quota === data.quota && old.model === data.model) return;
  } catch {}
  hc("label", id, `${LABEL}=${JSON.stringify(data)}`);
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
