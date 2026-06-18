importScripts("shared.js");

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

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
  await refreshBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await refreshBadge();
});
