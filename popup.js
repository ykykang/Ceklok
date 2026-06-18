const today = new Date();
const mKey = monthKey(today);
const dKey = dayKey(today);

let activePastCell = null;

function showPastDatePicker(date, dateKey, currentStatus) {
  const pastMKey = dateKey.slice(0, 7);
  const panel = document.getElementById("pastDatePanel");

  panel.innerHTML = `
    <div class="past-date-header">
      <p class="prompt">${formatIndoDate(date)}</p>
      <button class="link-btn" id="closePastPanel" type="button">✕</button>
    </div>
    <div class="stamp-row">
      <button class="stamp-btn office" data-status="office" type="button">■ Ngantor</button>
      <button class="stamp-btn wfh" data-status="wfh" type="button">□ WFH</button>
    </div>
    ${currentStatus ? '<button class="link-btn clear-btn" id="clearPastBtn" type="button">Hapus catatan</button>' : ""}`;

  panel.classList.remove("hidden");

  document.getElementById("closePastPanel").addEventListener("click", closePastDatePanel);

  panel.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await setDayStatus(pastMKey, dateKey, btn.dataset.status);
      closePastDatePanel();
      await refreshAll();
    });
  });

  const clearBtn = document.getElementById("clearPastBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", async () => {
      await setDayStatus(pastMKey, dateKey, null);
      closePastDatePanel();
      await refreshAll();
    });
  }
}

function closePastDatePanel() {
  if (activePastCell) {
    activePastCell.classList.remove("selected");
    activePastCell = null;
  }
  document.getElementById("pastDatePanel").classList.add("hidden");
}

function renderTodayCard(status, editing) {
  const el = document.getElementById("todayAction");

  if (status && !editing) {
    const label = status === "office" ? "■ Ngantor" : "□ WFH";
    el.innerHTML = `
      <div class="status-badge ${status}">
        <span>Hari ini: <strong>${label}</strong></span>
        <button id="changeBtn" class="link-btn" type="button">Ubah</button>
      </div>`;
    document.getElementById("changeBtn").addEventListener("click", () => {
      renderTodayCard(status, true);
    });
    return;
  }

  el.innerHTML = `
    <p class="prompt">Hari ini ngantor atau WFH?</p>
    <div class="stamp-row">
      <button class="stamp-btn office" data-status="office" type="button">■ Ngantor</button>
      <button class="stamp-btn wfh" data-status="wfh" type="button">□ WFH</button>
    </div>`;
  el.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", () => handlePick(btn.dataset.status));
  });
}

function renderProgress(monthLog, settings) {
  const officeCount = countByStatus(monthLog, "office");
  const target = settings.target;
  const pct = Math.max(0, Math.min(1, officeCount / target));

  document.getElementById("officeCount").textContent = officeCount;
  document.getElementById("targetVal").textContent = target;

  document.getElementById("progressBar").style.width = `${Math.round(pct * 100)}%`;

  const insight = computeInsight(monthLog, today, target);
  const insightEl = document.getElementById("insightText");
  insightEl.textContent = insight.text;
  insightEl.className = "insight " + (insight.tone === "good" ? "good" : insight.tone === "warn" ? "warn" : insight.tone === "bad" ? "bad" : "");
}

function renderGrid(monthLog) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const total = daysInMonth(year, month);
  const firstDayDow = new Date(year, month, 1).getDay(); // 0=Min..6=Sab
  const leadingBlanks = firstDayDow === 0 ? 6 : firstDayDow - 1; // grid mulai Senin

  document.getElementById("monthLabel").textContent = `${MONTH_NAMES_ID[month]} ${year}`;

  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (let i = 0; i < leadingBlanks; i++) {
    const blank = document.createElement("div");
    blank.className = "cell empty";
    grid.appendChild(blank);
  }

  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month, d);
    const key = dayKey(date);
    const status = monthLog[key];
    const cell = document.createElement("div");
    const classes = ["cell"];

    if (isWeekend(date)) classes.push("weekend");
    if (status === "office") classes.push("office");
    if (status === "wfh") classes.push("wfh");
    if (key === dKey) classes.push("today");
    if (!status && !isWeekend(date) && date < today && key !== dKey) classes.push("missed");

    cell.className = classes.join(" ");
    cell.textContent = String(d);
    cell.title = status ? (status === "office" ? "Ngantor" : "WFH") : "Belum dicatat";
    grid.appendChild(cell);

    if (!isWeekend(date) && key < dKey) {
      cell.classList.add("editable");
      cell.addEventListener("click", () => {
        if (activePastCell === cell) {
          closePastDatePanel();
          return;
        }
        if (activePastCell) activePastCell.classList.remove("selected");
        cell.classList.add("selected");
        activePastCell = cell;
        showPastDatePicker(date, key, status);
      });
    }
  }
}

function renderSettingsForm(settings) {
  document.getElementById("targetInput").value = settings.target;
  document.getElementById("reminderToggle").checked = settings.reminderEnabled;
  document.getElementById("reminderTimeInput").value = settings.reminderTime;
}

async function refreshAll() {
  const [monthLog, settings] = await Promise.all([getMonthLog(mKey), getSettings()]);
  renderTodayCard(monthLog[dKey], false);
  renderProgress(monthLog, settings);
  renderGrid(monthLog);
  renderSettingsForm(settings);
  return { monthLog, settings };
}

async function handlePick(status) {
  await setDayStatus(mKey, dKey, status);
  await refreshAll();
}

async function handleSaveSettings() {
  const targetRaw = parseInt(document.getElementById("targetInput").value, 10);
  const target = Number.isFinite(targetRaw) ? Math.min(31, Math.max(1, targetRaw)) : 12;
  const reminderEnabled = document.getElementById("reminderToggle").checked;
  const reminderTime = document.getElementById("reminderTimeInput").value || "09:00";

  await saveSettings({ target, reminderEnabled, reminderTime });
  chrome.runtime.sendMessage({ type: "settingsUpdated" });
  await refreshAll();

  const note = document.getElementById("savedNote");
  note.classList.remove("hidden");
  setTimeout(() => note.classList.add("hidden"), 1500);
}

function init() {
  document.getElementById("todayDate").textContent = formatIndoDate(today);

  document.getElementById("settingsBtn").addEventListener("click", () => {
    document.getElementById("settingsPanel").classList.toggle("hidden");
  });
  document.getElementById("saveSettingsBtn").addEventListener("click", handleSaveSettings);
  document.getElementById("testNotifBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "testNotification" });
  });

  refreshAll();
}

document.addEventListener("DOMContentLoaded", init);
