# Changelog

## 0.1.0 (2026-11-03)


### ⚠ BREAKING CHANGES

* **statusline:** data/sakamichi-agents/sessions/ is no longer written or read. Update statusline.mjs on every machine that runs Claude Code; anything reading the session files should read the sakamichi.session label instead (hc get <terminal> --json).
* the layout, mod and data folder names change. Switch to the sakamichi layout, point the Claude Code statusLine command at mods/sakamichi-agents/statusline.mjs, then delete the old files with the rm lines under Uninstall in the README.

### Features

* initial release of herdr-sakamichi-mod ([2b54ba3](https://github.com/payt0nc/herdr-sakamichi-mod/commit/2b54ba33e0fd04e264f3e8f1f570ca801b8788bc))
* rename the layout to sakamichi and sync members across clients ([af72abe](https://github.com/payt0nc/herdr-sakamichi-mod/commit/af72abe702f7d5419092518f72fa7c0dfc605411))
* **statusline:** sync HP/MP to every client through a terminal label ([97366d4](https://github.com/payt0nc/herdr-sakamichi-mod/commit/97366d41f9a3c974f153b300d2faa0324ec12dcb))
