# ceklok

Chrome extension for logging office vs WFH days and tracking your monthly office attendance target (default: 12 days/month). Auto-resets each month — previous month data stays in storage, progress ring and insight start fresh.

## Installation (load unpacked — not published to Chrome Web Store)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (toggle top-right).
3. Click **Load unpacked**.
4. Select this folder (the one containing `manifest.json`).
5. Pin the icon to your toolbar (click the puzzle icon 🧩 → pin "ceklok").

## Usage

- **Click the extension icon** → popup opens. If today isn't logged yet, two big buttons appear: "🏢 Ngantor" / "🏠 WFH" — click one.
- Already logged? Popup shows today's status + an "Ubah" button to change it.
- **Progress ring** shows `X/target` office days this month, plus a short insight (e.g. "butuh 5x lagi dari 8 hari kerja tersisa").
- **Punch-card grid** shows the full month: solid green = office, orange outline = WFH, grey = weekend, small red dot = past weekday not yet logged. Click any past weekday cell to log or edit it.
- Badge on the toolbar icon = office day count this month (orange if below target, green if at/above).

## Daily reminder

Default: every weekday (Mon–Fri) at **09:00**, if today isn't logged, a notification fires with two action buttons — "🏢 Ngantor" / "🏠 WFH". Clicking one logs the day directly without opening the popup.

To change the time, disable reminders, or change the target: click ⚙ (top-right of popup) → adjust → **Simpan pengaturan**. Use **Tes notifikasi sekarang** to verify notifications are working.

### Making reminders work on macOS

1. **System Settings → Notifications → Google Chrome** → set style to **Alerts** (not Banners). Banners auto-dismiss and hide the action buttons.
2. Make sure Chrome notifications are not blocked by an active Focus mode (System Settings → Focus → your active Focus → Apps → check Chrome is allowed, or turn Focus off).
3. If nothing appears at all: in System Settings → Notifications → Google Chrome, toggle **Allow notifications** off and back on.

### Making reminders work on Windows

1. **Settings → System → Notifications** → scroll to **Google Chrome** → make sure it's turned on.
2. If Chrome is in the system tray and notifications still don't fire: go to **Settings → System → Notifications → Additional settings** and make sure "Get notifications from apps and other senders" is on.
3. Do Not Disturb / Focus Assist will suppress all notifications — check **Settings → System → Notifications → Do not disturb** is off during working hours.
4. In Chrome itself: `chrome://settings/content/notifications` → make sure notifications are allowed (not blocked).

## Monthly reset

Data is stored per-month (key `YYYY-MM` in `chrome.storage.local`). Once the 1st passes, progress resets to 0/target automatically — no manual action needed. Previous months remain in storage (no history UI yet, but data is there if needed).

## File structure

```
manifest.json     → extension config (Manifest V3)
background.js     → service worker: reminder scheduling + badge updates
popup.html/css/js → popup UI and logic
shared.js         → date helpers and storage utilities, shared by popup and background
icons/            → 16/32/48/128px icons
```

## Notes

- All data is stored locally in your browser (`chrome.storage.local`) — no external server.
- To sync across devices, replace `chrome.storage.local` with `chrome.storage.sync` in `shared.js` and `background.js` (requires same Chrome login on all devices).
