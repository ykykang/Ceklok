# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Chrome extension (Manifest V3) — "Ngantor Tracker". Tracks office vs WFH days against a monthly target. No build step, no npm, no bundler. Pure vanilla JS loaded directly by Chrome.

## Loading / testing

No install command. Load as unpacked extension:
1. `chrome://extensions` → enable Developer mode
2. "Load unpacked" → select this folder
3. After any change to JS/HTML/CSS: click the refresh icon on the extension card in `chrome://extensions`
4. After any change to `background.js` (service worker): also click "Service Worker" link → "Update" or close and reopen DevTools

Open popup DevTools: right-click extension icon → "Inspect popup".
Open background DevTools: `chrome://extensions` → "Service Worker" link.

## Architecture

```
shared.js      → pure helpers + chrome.storage API wrappers
                 loaded via <script> in popup AND via importScripts() in background
background.js  → service worker: chrome.alarms (daily reminder), chrome.notifications
                 (with action buttons), badge text/color updates
popup.html/js  → UI: today-card, SVG progress ring, punch-card grid, settings panel
popup.css      → all styles
```

### Storage schema

`chrome.storage.local` keys:
- `"settings"` → `{ target: number, reminderEnabled: bool, reminderTime: "HH:MM" }`
- `"YYYY-MM"` (e.g. `"2026-06"`) → `{ "YYYY-MM-DD": "office" | "wfh", ... }`

Month logs are per-key so history persists across resets automatically.

### Data flow

- `shared.js` functions are the single source of truth for date keys, storage reads/writes, and insight computation — both `popup.js` and `background.js` call them directly.
- When popup saves settings it sends `{ type: "settingsUpdated" }` via `chrome.runtime.sendMessage` so the service worker reschedules the alarm and refreshes the badge without a restart.
- Badge color: orange (`#C97B2E`) if below target, green (`#0F4C46`) if at/above.

### Key constraints

- `shared.js` must stay side-effect-free (no listeners, no state) — it runs in both popup (window) and service worker (importScripts) contexts.
- Alarm fires daily; after firing it immediately reschedules for next day (`scheduleReminder()` called in `onAlarm` handler).
- Notification buttons map by index: `0` = office, `1` = wfh.
