importScripts("shared.js");

const ALARM_NAME = "dailyReminder";
const NOTIF_PREFIX = "ngantor-reminder-";

// ---------- Badge: nunjukin progress "ngantor / target" di icon ----------
async function refreshBadge() {
  const today = new Date();
  const mKey = monthKey(today);
  const [log, settings] = await Promise.all([getMonthLog(mKey), getSettings()]);
  const officeCount = countByStatus(log, "office");

  chrome.action.setBadgeText({ text: String(officeCount) });
  chrome.action.setBadgeBackgroundColor({
    color: officeCount >= settings.target ? "#0F4C46" : "#C97B2E",
  });
}

chrome.storage.onChanged.addListener((changes) => {
  const today = new Date();
  if (changes[monthKey(today)] || changes.settings) {
    refreshBadge();
  }
});

// ---------- Reminder scheduling ----------
function nextOccurrence(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

async function scheduleReminder() {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  if (!settings.reminderEnabled) return;
  const next = nextOccurrence(settings.reminderTime);
  await chrome.alarms.create(ALARM_NAME, { when: next.getTime() });
}

async function maybeFireReminder() {
  const settings = await getSettings();
  if (!settings.reminderEnabled) {
    return;
  }
  const today = new Date();
  if (isWeekend(today)) {
    return; // skip Sabtu/Minggu
  }
  const mKey = monthKey(today);
  const dKey = dayKey(today);
  const log = await getMonthLog(mKey);

  if (!log[dKey]) {
    chrome.notifications.create(NOTIF_PREFIX + dKey, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Udah ngelog belum hari ini?",
      message: "Tandain hari ini ngantor atau WFH biar progress bulan ini ke-update.",
      buttons: [{ title: "🏢 Ngantor" }, { title: "🏠 WFH" }],
      priority: 2,
      requireInteraction: true,
    });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  await maybeFireReminder();
  await scheduleReminder(); // jadwalin lagi buat besok
});

chrome.notifications.onButtonClicked.addListener(async (notifId, btnIdx) => {
  if (!notifId.startsWith(NOTIF_PREFIX)) return;
  const dKey = notifId.slice(NOTIF_PREFIX.length);
  const mKey = dKey.slice(0, 7); // YYYY-MM
  const status = btnIdx === 0 ? "office" : "wfh";
  await setDayStatus(mKey, dKey, status);
  await refreshBadge();
  chrome.notifications.clear(notifId);

  chrome.notifications.create(NOTIF_PREFIX + "confirm-" + Date.now(), {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Tercatat ✓",
    message: status === "office" ? "Hari ini: Ngantor 🏢" : "Hari ini: WFH 🏠",
    priority: 0,
  });
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (!notifId.startsWith(NOTIF_PREFIX)) return;
  try {
    chrome.action.openPopup();
  } catch (e) {
    // openPopup butuh user gesture & cuma didukung browser tertentu; aman diabaikan.
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "settingsUpdated") {
    scheduleReminder();
    refreshBadge();
  }
  if (msg?.type === "testNotification") {
    chrome.notifications.create("ngantor-test-" + Date.now(), {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Udah ngelog belum hari ini?",
      message: "Ini test — kalau ini muncul + ada tombol di bawah, notifikasi berjalan normal.",
      buttons: [{ title: "🏢 Ngantor" }, { title: "🏠 WFH" }],
      priority: 2,
      requireInteraction: true,
    });
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings); // pastikan default tersimpan
  await scheduleReminder();
  await refreshBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await scheduleReminder();
  await refreshBadge();
});
