// shared.js — dipakai bareng oleh popup.js dan background.js
// Tidak ada state di sini, cuma kumpulan fungsi murni + akses chrome.storage.

const DEFAULT_SETTINGS = {
  target: 12,
  reminderEnabled: true,
  reminderTime: "09:00",
};

const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dayKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function formatIndoDate(date) {
  return `${DAY_NAMES_ID[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES_ID[date.getMonth()]} ${date.getFullYear()}`;
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function daysInMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

async function getSettings() {
  const data = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

async function saveSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.local.set({ settings: updated });
  return updated;
}

async function getMonthLog(key) {
  const data = await chrome.storage.local.get(key);
  return data[key] || {};
}

async function setDayStatus(key, dKey, status) {
  const log = await getMonthLog(key);
  if (status === null) {
    delete log[dKey];
  } else {
    log[dKey] = status; // "office" | "wfh"
  }
  await chrome.storage.local.set({ [key]: log });
  return log;
}

function countByStatus(monthLog, status) {
  return Object.values(monthLog).filter((s) => s === status).length;
}

// Hitung berapa hari kerja (Senin-Jumat) yang TERSISA di bulan ini, termasuk hari ini.
function workdaysRemainingInMonth(today) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const total = daysInMonth(year, month);
  let count = 0;
  for (let d = today.getDate(); d <= total; d++) {
    const date = new Date(year, month, d);
    if (!isWeekend(date)) count++;
  }
  return count;
}

// Insight singkat ala "on pace" tracker buat ditampilkan di popup.
function computeInsight(monthLog, today, target) {
  const officeCount = countByStatus(monthLog, "office");
  const remaining = target - officeCount;
  const workdaysLeft = workdaysRemainingInMonth(today);

  if (remaining <= 0) {
    return { tone: "good", text: `Target ${target}x ngantor bulan ini udah tercapai 🎉` };
  }
  if (remaining > workdaysLeft) {
    return {
      tone: "bad",
      text: `Sisa ${workdaysLeft} hari kerja, tapi butuh ${remaining}x ngantor lagi. Kemungkinan kekurangan, atur strategi yuk.`,
    };
  }
  if (remaining === workdaysLeft) {
    return {
      tone: "warn",
      text: `Sisa ${workdaysLeft} hari kerja dan butuh ngantor di semua hari itu (${remaining}x). Ketat, tapi masih kekejar.`,
    };
  }
  return {
    tone: "ok",
    text: `Butuh ${remaining}x ngantor lagi dari ${workdaysLeft} hari kerja yang tersisa. Masih aman.`,
  };
}
