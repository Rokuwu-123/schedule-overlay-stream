// ==========================================
// STREAM SCHEDULE OVERLAY - MAIN APPLICATION JS
// ==========================================

let scheduleList = [];
let previewRotationIndex = 0;
let countdownInterval = null;
let mainLoopTimeout = null;

// --- DEFAULT CUSTOM HTML TEMPLATE & MODE STATE ---
const DEFAULT_CUSTOM_HTML = `<div id="with-schedules" class="fade-content">
  <div class="tag">{tag}</div>
  <div class="title">{title}</div>
  <div class="time-info">{time}</div>
  <div class="countdown">{countdown}</div>
</div>
<div id="no-schedules" class="fade-content" style="display: none !important;">
  <div class="tag">{tag}</div>
  <div class="title">{empty_text}</div>
  <div class="time-info">-</div>
</div>`;

let savedSimpleCss = "";
let savedAdvancedCss = "";
let savedAdvancedHtml = DEFAULT_CUSTOM_HTML;
let isSwitchingMode = false;

function getStyleMode() {
  const modeRadio = document.querySelector('input[name="styleMode"]:checked');
  let mode = modeRadio ? modeRadio.value : "manual";
  if (mode === "custom") mode = "custom-advanced";
  return mode;
}

// --- CODEMIRROR INITIALIZATION ---
let editorHtml = null;
let editorCss = null;

function initCodeMirror() {
  if (!window.CodeMirror) return;

  const htmlArea = document.getElementById("customHtmlInput");
  if (htmlArea && !editorHtml) {
    editorHtml = CodeMirror.fromTextArea(htmlArea, {
      mode: "htmlmixed",
      theme: "dracula",
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      autoCloseTags: true,
      styleActiveLine: true,
      tabSize: 2,
      lineWrapping: true,
    });
    editorHtml.on("change", () => {
      if (isSwitchingMode) return;
      htmlArea.value = editorHtml.getValue();
      const mode = getStyleMode();
      if (mode === "custom-advanced") {
        savedAdvancedHtml = editorHtml.getValue();
      }
      saveAndApplySettings();
      restartPreviewRotation();
    });
  }

  const cssArea = document.getElementById("customCssInput");
  if (cssArea && !editorCss) {
    editorCss = CodeMirror.fromTextArea(cssArea, {
      mode: "css",
      theme: "dracula",
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      tabSize: 2,
      lineWrapping: true,
    });
    editorCss.on("change", () => {
      if (isSwitchingMode) return;
      cssArea.value = editorCss.getValue();
      const mode = getStyleMode();
      if (mode === "custom-simple") {
        savedSimpleCss = editorCss.getValue();
      } else if (mode === "custom-advanced") {
        savedAdvancedCss = editorCss.getValue();
      }
      saveAndApplySettings();
    });
  }
}

function insertSnippet(target, text) {
  const editor = target === "html" ? editorHtml : editorCss;
  if (editor) {
    const doc = editor.getDoc();
    const cursor = doc.getCursor();
    doc.replaceRange(text, cursor);
    editor.focus();
  } else {
    const area = document.getElementById(
      target === "html" ? "customHtmlInput" : "customCssInput"
    );
    if (area) {
      const start = area.selectionStart || 0;
      const end = area.selectionEnd || 0;
      area.value =
        area.value.substring(0, start) + text + area.value.substring(end);
      area.dispatchEvent(new Event("input"));
    }
  }
}
window.insertSnippet = insertSnippet;

// --- NAVIGATION DRAWER LOGIC ---
const vtubeToggleBtn = document.getElementById("vtubeToggleBtn");
if (vtubeToggleBtn) {
  vtubeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("menu-open");
  });
}

function openTab(tabId, element) {
  document
    .querySelectorAll(".vtube-nav-item")
    .forEach((item) => item.classList.remove("active"));
  if (element) element.classList.add("active");

  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add("active");

  document.body.classList.add("drawer-open");

  if (tabId === "tab-settings") {
    setTimeout(() => {
      if (editorHtml) editorHtml.refresh();
      if (editorCss) editorCss.refresh();
    }, 50);
  }
}
window.openTab = openTab;

function closeAllMenus() {
  document.body.classList.remove("menu-open", "drawer-open");
  document
    .querySelectorAll(".vtube-nav-item")
    .forEach((item) => item.classList.remove("active"));
}
window.closeAllMenus = closeAllMenus;

const streamTimeEl = document.getElementById("streamTime");
if (streamTimeEl) {
  streamTimeEl.value = "";
}

// --- COLORIS CONFIGURATION ---
if (typeof Coloris !== "undefined") {
  Coloris({
    el: "[data-coloris]",
    alpha: true,
    formatToggle: true,
    defaultColor: "#ffffff",
  });
}

function setupColorInput(inputId) {
  const colorInput = document.getElementById(inputId);
  if (!colorInput) return;
  // Trigger pada event input dan change agar preview langsung update saat color picker digeser
  colorInput.addEventListener("input", saveAndApplySettings);
  colorInput.addEventListener("change", saveAndApplySettings);
}

setupColorInput("globalAccentColor");
setupColorInput("cardBorderColor");
setupColorInput("colorTag");
setupColorInput("colorTitle");
setupColorInput("colorTime");
setupColorInput("colorCountdown");
setupColorInput("shadowColor");

// Global Event Listener Coloris Picker
document.addEventListener("coloris:pick", () => {
  saveAndApplySettings();
});

// --- MODE SWITCHER ---
const styleModeRadios = document.querySelectorAll('input[name="styleMode"]');
styleModeRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    switchStyleMode(e.target.value);
    saveAndApplySettings();
    restartPreviewRotation();
  });
});

function switchStyleMode(mode) {
  if (mode === "custom") mode = "custom-advanced";

  const manualWrapper = document.getElementById("manualSettingWrapper");
  const customWrapper = document.getElementById("customCssWrapper");
  const customHtmlSection = document.getElementById("customHtmlSection");
  const customCssSection = document.getElementById("customCssSection");

  const lblManual = document.getElementById("labelModeManual");
  const lblSimple = document.getElementById("labelModeSimple");
  const lblAdvanced = document.getElementById("labelModeAdvanced");

  const presetWrapper = document.getElementById("presetThemeWrapper");

  if (lblManual) lblManual.classList.remove("active");
  if (lblSimple) lblSimple.classList.remove("active");
  if (lblAdvanced) lblAdvanced.classList.remove("active");

  isSwitchingMode = true;

  if (mode === "custom-simple") {
    if (manualWrapper) manualWrapper.style.display = "none";
    if (customWrapper) customWrapper.style.display = "block";
    if (customHtmlSection) customHtmlSection.style.display = "none";
    if (customCssSection) customCssSection.style.display = "block";
    if (lblSimple) lblSimple.classList.add("active");

    if (presetWrapper) presetWrapper.style.display = "block";

    const cssInput = document.getElementById("customCssInput");
    if (cssInput) cssInput.value = savedSimpleCss;
    if (editorCss) editorCss.setValue(savedSimpleCss);

    setTimeout(() => {
      if (editorCss) editorCss.refresh();
    }, 50);
  } else if (mode === "custom-advanced") {
    if (manualWrapper) manualWrapper.style.display = "none";
    if (customWrapper) customWrapper.style.display = "block";
    if (customHtmlSection) customHtmlSection.style.display = "block";
    if (customCssSection) customCssSection.style.display = "block";
    if (lblAdvanced) lblAdvanced.classList.add("active");

    if (presetWrapper) presetWrapper.style.display = "none";

    const htmlVal = savedAdvancedHtml || DEFAULT_CUSTOM_HTML;
    const cssVal = savedAdvancedCss !== undefined ? savedAdvancedCss : "";

    const htmlInput = document.getElementById("customHtmlInput");
    const cssInput = document.getElementById("customCssInput");
    if (htmlInput) htmlInput.value = htmlVal;
    if (cssInput) cssInput.value = cssVal;

    if (editorHtml) editorHtml.setValue(htmlVal);
    if (editorCss) editorCss.setValue(cssVal);

    setTimeout(() => {
      if (editorHtml) editorHtml.refresh();
      if (editorCss) editorCss.refresh();
    }, 50);
  } else {
    if (manualWrapper) manualWrapper.style.display = "block";
    if (customWrapper) customWrapper.style.display = "none";
    if (lblManual) lblManual.classList.add("active");

    if (presetWrapper) presetWrapper.style.display = "none";
  }

  isSwitchingMode = false;
  updateGlobalStylesPreview();
}

// --- PRESET THEME LOADER ---
let loadedThemesList = [];
let selectedPresetThemeId = "default";

function renderThemePresetCards(themes) {
  const gridEl = document.getElementById("presetThemeGrid");
  if (!gridEl) return;

  gridEl.innerHTML = "";

  const allItems = [
    {
      id: "default",
      name: "Manual / Default",
      description: "Standard custom color settings",
      file: "Manual",
      location: "",
    },
    ...themes.map((t) => ({
      id: t.file || t.id,
      name: t.name,
      description: t.description || "",
      file: t.file || t.id,
      location: t.location || `/css-themes/${t.file || t.id}`,
    })),
  ];

  allItems.forEach((theme) => {
    const card = document.createElement("div");
    card.className = `theme-card-item ${selectedPresetThemeId === theme.id ? "active" : ""}`;
    card.dataset.themeId = theme.id;
    card.dataset.themeName = theme.name;
    card.dataset.themeFile = theme.file;

    card.innerHTML = `
      <div class="theme-card-info">
        <span class="theme-card-title">${theme.name}</span>
        ${theme.description ? `<span class="theme-card-desc">${theme.description}</span>` : ""}
      </div>
      <span class="theme-card-badge">${theme.file}</span>
    `;

    card.addEventListener("click", async () => {
      closeThemePickerDropdown();

      if (theme.id === "default") {
        selectedPresetThemeId = "default";
        updateActiveThemeCardUI();
        const manualRadio = document.querySelector(
          'input[name="styleMode"][value="manual"]'
        );
        if (manualRadio) {
          manualRadio.checked = true;
          switchStyleMode("manual");
        }
        saveAndApplySettings();
        restartPreviewRotation();
        return;
      }

      try {
        const response = await fetch(theme.location);
        if (response.ok) {
          const cssText = await response.text();
          selectedPresetThemeId = theme.id;
          savedSimpleCss = cssText;

          const customCssInput = document.getElementById("customCssInput");
          if (customCssInput) customCssInput.value = cssText;

          if (editorCss) {
            isSwitchingMode = true;
            editorCss.setValue(cssText);
            isSwitchingMode = false;
          }

          const simpleRadio = document.querySelector(
            'input[name="styleMode"][value="custom-simple"]'
          );
          if (simpleRadio) {
            simpleRadio.checked = true;
            switchStyleMode("custom-simple");
          }

          updateActiveThemeCardUI();
          saveAndApplySettings();
          restartPreviewRotation();
        } else {
          console.error("Failed to load theme CSS from " + theme.location);
        }
      } catch (err) {
        console.error("Error applying preset theme:", err);
      }
    });

    gridEl.appendChild(card);
  });

  updateActiveThemeCardUI();
}

function closeThemePickerDropdown() {
  const picker = document.getElementById("customThemePicker");
  const dropdown = document.getElementById("themePickerDropdown");
  if (picker) picker.classList.remove("open");
  if (dropdown) dropdown.style.display = "none";
}

function updateActiveThemeCardUI() {
  const cards = document.querySelectorAll("#presetThemeGrid .theme-card-item");
  let activeTheme = null;

  cards.forEach((card) => {
    if (card.dataset.themeId === selectedPresetThemeId) {
      card.classList.add("active");
      activeTheme = {
        name: card.dataset.themeName,
        file: card.dataset.themeFile,
      };
    } else {
      card.classList.remove("active");
    }
  });

  const nameEl = document.getElementById("selectedThemeName");
  const badgeEl = document.getElementById("selectedThemeBadge");

  if (activeTheme) {
    if (nameEl) nameEl.textContent = activeTheme.name;
    if (badgeEl) badgeEl.textContent = activeTheme.file;
  } else if (selectedPresetThemeId === "default") {
    if (nameEl) nameEl.textContent = "Manual / Default";
    if (badgeEl) badgeEl.textContent = "Manual";
  }
}

function initCustomThemePickerEvents() {
  const picker = document.getElementById("customThemePicker");
  const trigger = document.getElementById("themePickerTrigger");
  const dropdown = document.getElementById("themePickerDropdown");

  if (!picker || !trigger || !dropdown) return;

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = picker.classList.contains("open");
    if (isOpen) {
      closeThemePickerDropdown();
    } else {
      picker.classList.add("open");
      dropdown.style.display = "block";
    }
  });

  document.addEventListener("click", (e) => {
    if (!picker.contains(e.target)) {
      closeThemePickerDropdown();
    }
  });
}

function updateCustomSelectUI(selectId, val) {
  const wrapper = document.querySelector(
    `.custom-select-wrapper[data-select-id="${selectId}"]`
  );
  if (!wrapper) return;

  const labelEl = wrapper.querySelector(".custom-select-label");
  const options = wrapper.querySelectorAll(".custom-select-option");

  options.forEach((opt) => {
    if (opt.dataset.value === String(val)) {
      opt.classList.add("active");
      if (labelEl) labelEl.textContent = opt.textContent;
    } else {
      opt.classList.remove("active");
    }
  });
}

function initCustomSelects() {
  const wrappers = document.querySelectorAll(".custom-select-wrapper");

  wrappers.forEach((wrapper) => {
    const input = wrapper.querySelector("input[type='hidden']");
    const trigger = wrapper.querySelector(".custom-select-trigger");
    const dropdown = wrapper.querySelector(".custom-select-dropdown");
    const labelEl = wrapper.querySelector(".custom-select-label");
    const options = wrapper.querySelectorAll(".custom-select-option");

    if (!trigger || !dropdown || !input) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();

      document.querySelectorAll(".custom-select-wrapper").forEach((w) => {
        if (w !== wrapper) {
          w.classList.remove("open");
          const d = w.querySelector(".custom-select-dropdown");
          if (d) d.style.display = "none";
        }
      });
      closeThemePickerDropdown();

      const isOpen = wrapper.classList.contains("open");
      if (isOpen) {
        wrapper.classList.remove("open");
        dropdown.style.display = "none";
      } else {
        wrapper.classList.add("open");
        dropdown.style.display = "flex";
      }
    });

    options.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const selectedValue = opt.dataset.value;
        input.value = selectedValue;
        if (labelEl) labelEl.textContent = opt.textContent;

        options.forEach((o) => o.classList.remove("active"));
        opt.classList.add("active");

        wrapper.classList.remove("open");
        dropdown.style.display = "none";

        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  });

  document.addEventListener("click", (e) => {
    wrappers.forEach((w) => {
      if (!w.contains(e.target)) {
        w.classList.remove("open");
        const d = w.querySelector(".custom-select-dropdown");
        if (d) d.style.display = "none";
      }
    });
  });
}

async function loadPresetThemesFromJSON() {
  initCustomThemePickerEvents();
  initCustomSelects();
  const gridEl = document.getElementById("presetThemeGrid");
  if (!gridEl) return;

  try {
    let response = await fetch("/css-themes/themes.json");
    if (!response.ok) {
      response = await fetch("/css-themes.json");
    }
    if (response.ok) {
      const data = await response.json();
      const themes = data.themes || [];
      loadedThemesList = themes;
      renderThemePresetCards(themes);
    }
  } catch (err) {
    console.warn("Unable to load themes.json:", err);
  }
}

const inputIdsToWatch = [
  "globalTagText",
  "globalRotationInterval",
  "globalCountdownLabel",
  "customHtmlInput",
  "customCssInput",
  "fontSizeTag",
  "fontSizeTitle",
  "fontSizeTime",
  "fontSizeCountdown",
  "globalFontFamily",
  "globalFontWeight",
  "cardBorderRadius",
  "cardBorderWidth",
  "formatTime",
  "formatDate",
  "animEffect",
  "emptyStatusText",
  "shadowX",
  "shadowY",
  "shadowBlur",
];

inputIdsToWatch.forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", () => {
      saveAndApplySettings();
      if (
        [
          "formatTime",
          "formatDate",
          "animEffect",
          "emptyStatusText",
          "customHtmlInput",
        ].includes(id)
      ) {
        restartPreviewRotation();
      }
    });
  }
});

const borderRadiusEl = document.getElementById("cardBorderRadius");
if (borderRadiusEl) {
  borderRadiusEl.addEventListener("input", (e) => {
    const lbl = document.getElementById("radiusLabel");
    if (lbl) lbl.innerText = e.target.value + "px";
  });
}

const showCdEl = document.getElementById("globalShowCountdown");
if (showCdEl) {
  showCdEl.addEventListener("change", () => {
    const isChecked = showCdEl.checked;
    const cdGroup = document.getElementById("labelCountdownGroup");
    if (cdGroup) cdGroup.style.display = isChecked ? "block" : "none";
    saveAndApplySettings();
    restartPreviewRotation();
  });
}

// --- STORAGE MANAGER ---
function loadAllSettings() {
  const rawData = localStorage.getItem("raimu-schedule-storage");

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) {
      el.value = val;
      updateCustomSelectUI(id, val);
    }
  };
  const setCkb = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.checked = val;
  };

  if (!rawData) {
    savedSimpleCss = "";
    savedAdvancedCss = "";
    savedAdvancedHtml = DEFAULT_CUSTOM_HTML;
    setVal("customHtmlInput", DEFAULT_CUSTOM_HTML);
    setVal("customCssInput", "");
    if (editorHtml) editorHtml.setValue(DEFAULT_CUSTOM_HTML);
    if (editorCss) editorCss.setValue("");
    return;
  }

  try {
    const data = JSON.parse(rawData);

    if (data.scheduleList) scheduleList = data.scheduleList;

    if (data.savedSimpleCss !== undefined) {
      savedSimpleCss = data.savedSimpleCss;
    } else if (data.styleMode === "custom-simple") {
      savedSimpleCss = data.customCss || "";
    } else {
      savedSimpleCss = "";
    }

    if (data.savedAdvancedCss !== undefined) {
      savedAdvancedCss = data.savedAdvancedCss;
    } else if (
      data.styleMode === "custom-advanced" ||
      data.styleMode === "custom"
    ) {
      savedAdvancedCss = data.customCss || "";
    } else {
      savedAdvancedCss = "";
    }

    if (data.savedAdvancedHtml !== undefined) {
      savedAdvancedHtml = data.savedAdvancedHtml;
    } else if (
      data.styleMode === "custom-advanced" ||
      data.styleMode === "custom"
    ) {
      savedAdvancedHtml = data.customHtml || DEFAULT_CUSTOM_HTML;
    } else {
      savedAdvancedHtml = DEFAULT_CUSTOM_HTML;
    }

    if (data.styleMode) {
      let modeVal = data.styleMode;
      if (modeVal === "custom") modeVal = "custom-advanced";
      const modeRadio = document.querySelector(
        `input[name="styleMode"][value="${modeVal}"]`
      );
      if (modeRadio) {
        modeRadio.checked = true;
      }
      switchStyleMode(modeVal);
    } else {
      switchStyleMode("manual");
    }

    setVal("globalAccentColor", data.bg);
    setVal("cardBorderColor", data.borderColor);
    setVal("colorTag", data.colorTag);
    setVal("colorTitle", data.colorTitle);
    setVal("colorTime", data.colorTime);
    setVal("colorCountdown", data.colorCountdown);
    setVal("shadowColor", data.shadowColor);

    setVal("globalTagText", data.tagText);
    setVal("globalCountdownLabel", data.cdLabel);

    selectedPresetThemeId = data.presetTheme || "default";
    updateActiveThemeCardUI();
    setVal("globalRotationInterval", data.interval);
    setCkb("globalShowCountdown", data.showCd);
    setVal("emptyStatusText", data.emptyText);

    setVal("fontSizeTag", data.sizeTag);
    setVal("fontSizeTitle", data.sizeTitle);
    setVal("fontSizeTime", data.sizeTime);
    setVal("fontSizeCountdown", data.sizeCd);

    setVal("globalFontFamily", data.fontFamily);
    setVal("globalFontWeight", data.fontWeight);
    setVal("cardBorderRadius", data.borderRadius);
    setVal("cardBorderWidth", data.borderWidth);

    setVal("shadowX", data.shadowX);
    setVal("shadowY", data.shadowY);
    setVal("shadowBlur", data.shadowBlur);

    setVal("formatTime", data.formatTime);
    setVal("formatDate", data.formatDate);
    setVal("animEffect", data.animEffect);

    if (document.getElementById("cardBorderRadius")) {
      const lbl = document.getElementById("radiusLabel");
      if (lbl) lbl.innerText = (data.borderRadius || 24) + "px";
    }
    if (document.getElementById("labelCountdownGroup")) {
      document.getElementById("labelCountdownGroup").style.display =
        data.showCd !== false ? "block" : "none";
    }
  } catch (e) {
    console.error("Gagal memuat konfigurasi dari storage:", e);
  }
}

function saveAndApplySettings() {
  const modeRadio = document.querySelector('input[name="styleMode"]:checked');
  const currentMode = modeRadio ? modeRadio.value : "manual";

  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
  };
  const getCkb = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };

  if (!isSwitchingMode) {
    if (currentMode === "custom-simple") {
      savedSimpleCss = editorCss
        ? editorCss.getValue()
        : getVal("customCssInput");
    } else if (currentMode === "custom-advanced" || currentMode === "custom") {
      savedAdvancedHtml = editorHtml
        ? editorHtml.getValue()
        : getVal("customHtmlInput") || DEFAULT_CUSTOM_HTML;
      savedAdvancedCss = editorCss
        ? editorCss.getValue()
        : getVal("customCssInput");
    }
  }

  const storageData = {
    scheduleList: scheduleList,
    styleMode: currentMode,
    bg: getVal("globalAccentColor"),
    borderColor: getVal("cardBorderColor"),
    colorTag: getVal("colorTag"),
    colorTitle: getVal("colorTitle"),
    colorTime: getVal("colorTime"),
    colorCountdown: getVal("colorCountdown"),
    shadowColor: getVal("shadowColor"),

    tagText: getVal("globalTagText"),
    cdLabel: getVal("globalCountdownLabel"),

    savedSimpleCss: savedSimpleCss,
    savedAdvancedCss: savedAdvancedCss,
    savedAdvancedHtml: savedAdvancedHtml,

    customHtml: savedAdvancedHtml,
    customCss:
      currentMode === "custom-simple" ? savedSimpleCss : savedAdvancedCss,

    presetTheme: selectedPresetThemeId,
    interval: getVal("globalRotationInterval"),
    showCd: getCkb("globalShowCountdown"),
    emptyText: getVal("emptyStatusText"),

    sizeTag: getVal("fontSizeTag"),
    sizeTitle: getVal("fontSizeTitle"),
    sizeTime: getVal("fontSizeTime"),
    sizeCd: getVal("fontSizeCountdown"),

    fontFamily: getVal("globalFontFamily"),
    fontWeight: getVal("globalFontWeight"),
    borderRadius: getVal("cardBorderRadius"),
    borderWidth: getVal("cardBorderWidth"),

    shadowX: getVal("shadowX"),
    shadowY: getVal("shadowY"),
    shadowBlur: getVal("shadowBlur"),

    formatTime: getVal("formatTime"),
    formatDate: getVal("formatDate"),
    animEffect: getVal("animEffect"),
  };

  localStorage.setItem("raimu-schedule-storage", JSON.stringify(storageData));
  updateGlobalStylesPreview();

  // Memicu event sync real-time jika socket terhubung
  if (window.socket && typeof window.socket.emit === "function") {
    const uuid = localStorage.getItem("uuid");
    window.socket.emit("update_settings", { uuid, data: storageData });
  }

  return storageData;
}

// --- INITIAL LOAD ---
window.onload = () => {
  loadPresetThemesFromJSON();
  initInlineDateTimePicker();
  initCodeMirror();
  loadAllSettings();
  renderScheduleList();
  updateGlobalStylesPreview();
  restartPreviewRotation();
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
};

// --- SEPARATE DATE & TIME PICKER MODULE ---
function formatIsoDateTime(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function showScheduleError(msg) {
  const errEl = document.getElementById("scheduleFormError");
  if (errEl) {
    errEl.innerHTML = `<i data-lucide="alert-circle" style="width:16px;height:16px;vertical-align:middle;display:inline-block;margin-right:6px;"></i> ${msg}`;
    errEl.style.display = "block";
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  }
}

function hideScheduleError() {
  const errEl = document.getElementById("scheduleFormError");
  if (errEl) {
    errEl.textContent = "";
    errEl.style.display = "none";
  }
  const titleEl = document.getElementById("streamTitle");
  const dateInput = document.getElementById("scheduleDateInput");
  const timeInput = document.getElementById("scheduleTimeInput");
  if (titleEl) titleEl.classList.remove("input-error");
  if (dateInput) dateInput.classList.remove("input-error");
  if (timeInput) timeInput.classList.remove("input-error");
}

function initInlineDateTimePicker() {
  const dateInput = document.getElementById("scheduleDateInput");
  const timeInput = document.getElementById("scheduleTimeInput");
  const streamTime = document.getElementById("streamTime");

  if (!dateInput || !timeInput || !streamTime) return;

  dateInput.value = "";
  timeInput.value = "";
  streamTime.value = "";

  function updateCombinedStreamTime() {
    if (dateInput.value && timeInput.value) {
      streamTime.value = `${dateInput.value}T${timeInput.value}`;
    } else {
      streamTime.value = "";
    }
  }

  dateInput.addEventListener("change", updateCombinedStreamTime);
  dateInput.addEventListener("input", updateCombinedStreamTime);
  timeInput.addEventListener("change", updateCombinedStreamTime);
  timeInput.addEventListener("input", updateCombinedStreamTime);

  ["streamTitle", "scheduleDateInput", "scheduleTimeInput"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      const clearErr = () => {
        el.classList.remove("input-error");
        const t = document.getElementById("streamTitle")?.value.trim();
        const d = document.getElementById("scheduleDateInput")?.value;
        const tm = document.getElementById("scheduleTimeInput")?.value;
        if (t && d && tm) {
          hideScheduleError();
        }
      };
      el.addEventListener("input", clearErr);
      el.addEventListener("change", clearErr);
    }
  });

  const dateChips = document.querySelectorAll("#dateQuickChips .chip-btn");
  dateChips.forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.getAttribute("data-date-preset");
      const d = new Date();
      if (preset === "today") {
      } else if (preset === "tomorrow") {
        d.setDate(d.getDate() + 1);
      } else if (preset === "nextweek") {
        d.setDate(d.getDate() + 7);
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dateInput.value = `${y}-${m}-${day}`;
      updateCombinedStreamTime();

      dateChips.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const timeChips = document.querySelectorAll("#timeQuickChips .chip-btn");
  timeChips.forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.getAttribute("data-time-preset");
      if (preset) {
        timeInput.value = preset;
        updateCombinedStreamTime();
        timeChips.forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
      }
    });
  });
}

function setPickerFromIsoString(isoStr) {
  const dateInput = document.getElementById("scheduleDateInput");
  const timeInput = document.getElementById("scheduleTimeInput");
  const streamTime = document.getElementById("streamTime");

  if (!isoStr) return;
  const parts = isoStr.split("T");
  if (parts.length === 2) {
    if (dateInput) dateInput.value = parts[0];
    if (timeInput) timeInput.value = parts[1].substring(0, 5);
  } else {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      if (dateInput) dateInput.value = `${y}-${m}-${day}`;
      if (timeInput) timeInput.value = `${hh}:${mm}`;
    }
  }
  if (streamTime) streamTime.value = isoStr;
}

// --- HELPERS & STYLE RENDERER ---
function formatColor(colorString, fallback) {
  if (!colorString) return fallback;
  let clean = colorString.trim();

  // Jika sudah format rgb/rgba
  if (/^rgba?\(/i.test(clean)) return clean;

  if (!clean.startsWith("#")) clean = "#" + clean;

  // Jika HEX 3/4 karakter (#fff / #ffff)
  if (clean.length === 4) {
    clean = "#" + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3] + "ff";
  } else if (clean.length === 5) {
    clean = "#" + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3] + clean[4] + clean[4];
  } else if (clean.length === 7) {
    clean = clean + "ff";
  }

  // Jika tidak valid HEX 8 karakter
  if (!/^#[0-9a-fA-F]{8}$/.test(clean)) return fallback;

  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
  const a = (parseInt(clean.slice(7, 9), 16) / 255).toFixed(2);

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function scopeCssCode(cssString, parentSelector) {
  if (!cssString || !cssString.trim()) return "";
  let cleanCss = cssString.replace(/\/\*[\s\S]*?\*\//g, "");

  const imports = [];
  cleanCss = cleanCss.replace(/@import\s+[^;]+;/gi, (match) => {
    imports.push(match);
    return "";
  });

  const scoped = cleanCss.replace(
    /([^{}\s][^{}]*)\{/g,
    (match, selectorGroup) => {
      const selectors = selectorGroup.split(",");
      const scopedSelectors = selectors.map((sel) => {
        const trimmed = sel.trim();
        if (
          trimmed.startsWith("@keyframes") ||
          trimmed.startsWith("@media") ||
          trimmed.startsWith("@font-face") ||
          trimmed.startsWith("from") ||
          trimmed.startsWith("to") ||
          /^\d+%$/.test(trimmed)
        ) {
          return trimmed;
        }
        return `${parentSelector} ${trimmed}`;
      });
      return scopedSelectors.join(", ") + " {";
    }
  );

  return imports.join("\n") + "\n" + scoped;
}

function updateGlobalStylesPreview() {
  const modeRadio = document.querySelector('input[name="styleMode"]:checked');
  let mode = modeRadio ? modeRadio.value : "manual";
  if (mode === "custom") mode = "custom-advanced";

  const card = document.getElementById("previewCard");
  if (!card) return;

  const getVal = (id, defaultVal) => {
    const el = document.getElementById(id);
    return el && el.value !== "" ? el.value : defaultVal;
  };

  const rotInterval = getVal("globalRotationInterval", "4");
  card.style.setProperty("--rotation-interval", rotInterval + "s");

  const fontFamily = getVal(
    "globalFontFamily",
    "'Plus Jakarta Sans', sans-serif"
  );
  const fontWeight = getVal("globalFontWeight", "700");

  const sizeTag = getVal("fontSizeTag", "14");
  const sizeTitle = getVal("fontSizeTitle", "32");
  const sizeTime = getVal("fontSizeTime", "18");
  const sizeCd = getVal("fontSizeCountdown", "14");

  const colorTag = formatColor(getVal("colorTag", "#a0a5c1"), "#a0a5c1");
  const colorTitle = formatColor(getVal("colorTitle", "#ffffff"), "#ffffff");
  const colorTime = formatColor(getVal("colorTime", "#97f66b"), "#97f66b");
  const colorCd = formatColor(getVal("colorCountdown", "#a0a5c1"), "#a0a5c1");

  const shadowColor = formatColor(
    getVal("shadowColor", "transparent"),
    "transparent"
  );
  const shadowX = getVal("shadowX", "0");
  const shadowY = getVal("shadowY", "0");
  const shadowBlur = getVal("shadowBlur", "0");
  const textShadowValue = `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`;

  const borderRadius = getVal("cardBorderRadius", "24");
  const dynamicCss = document.getElementById("customDynamicCss");

  if (mode === "manual") {
    const bg = formatColor(
      getVal("globalAccentColor", "#181a26f2"),
      "#181a26f2"
    );
    const borderColor = formatColor(
      getVal("cardBorderColor", "#ffffff"),
      "#ffffff"
    );
    const borderWidth = getVal("cardBorderWidth", "0");

    // Menggunakan setProperty dengan !important agar langsung meng-override CSS stylesheet
    card.style.setProperty("background-color", bg, "important");
    card.style.setProperty("border", `${borderWidth}px solid ${borderColor}`, "important");
    card.style.setProperty("border-radius", `${borderRadius}px`, "important");
    card.style.setProperty("font-family", fontFamily);
    card.style.setProperty("font-weight", fontWeight);

    const tagEl = document.getElementById("prevTag");
    const titleEl = document.getElementById("prevTitle");
    const timeEl = document.getElementById("prevTime");
    const cdEl = document.getElementById("prevCountdown");

    if (tagEl) {
      tagEl.style.color = colorTag;
      tagEl.style.fontSize = sizeTag + "px";
      tagEl.style.textShadow = textShadowValue;
    }
    if (titleEl) {
      titleEl.style.color = colorTitle;
      titleEl.style.fontSize = sizeTitle + "px";
      titleEl.style.fontWeight = fontWeight;
      titleEl.style.textShadow = textShadowValue;
    }
    if (timeEl) {
      timeEl.style.color = colorTime;
      timeEl.style.fontSize = sizeTime + "px";
      timeEl.style.textShadow = textShadowValue;
    }
    if (cdEl) {
      cdEl.style.color = colorCd;
      cdEl.style.fontSize = sizeCd + "px";
      cdEl.style.textShadow = textShadowValue;
    }

    if (dynamicCss) dynamicCss.innerHTML = "";
  } else {
    card.style.removeProperty("background-color");
    card.style.removeProperty("border");
    card.style.removeProperty("border-radius");
    card.style.fontFamily = fontFamily;
    card.style.fontWeight = fontWeight;

    let customCss = "";
    if (mode === "custom-simple") {
      customCss = editorCss ? editorCss.getValue() : savedSimpleCss;
    } else if (mode === "custom-advanced") {
      customCss = editorCss ? editorCss.getValue() : savedAdvancedCss;
    }
    if (dynamicCss) {
      dynamicCss.innerHTML = scopeCssCode(customCss, ".viewport-overlay");
    }
  }

  const fader = document.getElementById("previewFadeWrapper");
  if (fader) {
    const animEffect = getVal("animEffect", "fade");
    fader.setAttribute("data-anim", animEffect);
  }
}

// --- SCHEDULE LOGIC & ROTATION ---
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getValidSchedules() {
  const now = new Date();
  return scheduleList.filter((item) => {
    const itemDate = new Date(item.time);
    return itemDate.getTime() >= now.getTime() || isSameDay(itemDate, now);
  });
}

function renderScheduleList() {
  const container = document.getElementById("scheduleListContainer");
  if (!container) return;
  container.innerHTML = "";

  if (scheduleList.length === 0) {
    container.innerHTML = `<div class="empty-schedule-msg">No schedules added yet. Add a new stream schedule above.</div>`;
    return;
  }

  const now = new Date();

  scheduleList.forEach((item, index) => {
    const dateObj = new Date(item.time);
    const isToday = isSameDay(dateObj, now);
    const isPassedTime = dateObj.getTime() < now.getTime();

    const isExpired = isPassedTime && !isToday;
    const isLiveNow = isPassedTime && isToday;

    const formattedDate =
      dateObj.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      ` • ${dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

    const card = document.createElement("div");
    card.className = `schedule-item-card ${isExpired ? "expired" : ""}`;
    card.id = `schedule-card-${index}`;

    let statusBadgeClass = "standby";
    let statusBadgeText = "In Loop";

    if (isExpired) {
      statusBadgeClass = "expired";
      statusBadgeText = "Expired";
    } else if (isLiveNow) {
      statusBadgeClass = "live";
      statusBadgeText = "LIVE NOW";
    }

    card.innerHTML = `
      <div class="card-header">
        <span class="badge-status ${statusBadgeClass}" id="badge-${index}">${statusBadgeText}</span>
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 700;">#${index + 1}</span>
      </div>
      <div class="card-title">${item.title}</div>
      <div class="card-time"><i data-lucide="calendar" style="width:13px;height:13px;margin-right:4px;vertical-align:middle;display:inline-block;"></i>${formattedDate}</div>
      <div class="card-actions">
        <button class="btn-card-action btn-card-edit" onclick="editSchedule(${index})"><i data-lucide="pencil" style="width:12px;height:12px;margin-right:4px;"></i>Edit</button>
        <button class="btn-card-action btn-card-del" onclick="deleteSchedule(${index})"><i data-lucide="trash-2" style="width:12px;height:12px;margin-right:4px;"></i>Delete</button>
      </div>
    `;
    container.appendChild(card);
  });

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

// Forms CRUD
const addScheduleBtn = document.getElementById("addScheduleBtn");
const clearBtn = document.getElementById("clearFormBtn");

if (addScheduleBtn) {
  addScheduleBtn.addEventListener("click", () => {
    const titleEl = document.getElementById("streamTitle");
    const dateInput = document.getElementById("scheduleDateInput");
    const timeInput = document.getElementById("scheduleTimeInput");
    const editIndexVal = document.getElementById("editIndex").value;

    const titleVal = titleEl ? titleEl.value.trim() : "";
    const dateVal = dateInput ? dateInput.value : "";
    const timeVal = timeInput ? timeInput.value : "";

    let missing = [];
    if (!titleVal) {
      missing.push("Stream Title / Game");
      if (titleEl) titleEl.classList.add("input-error");
    }
    if (!dateVal) {
      missing.push("Date");
      if (dateInput) dateInput.classList.add("input-error");
    }
    if (!timeVal) {
      missing.push("Time");
      if (timeInput) timeInput.classList.add("input-error");
    }

    if (missing.length > 0) {
      showScheduleError(`Harap isi semua bidang: ${missing.join(", ")}!`);
      return;
    }

    hideScheduleError();
    const fullTimeIso = `${dateVal}T${timeVal}`;

    if (editIndexVal !== "" && editIndexVal !== "-1") {
      const idx = parseInt(editIndexVal);
      scheduleList[idx] = { title: titleVal, time: fullTimeIso };
    } else {
      scheduleList.push({ title: titleVal, time: fullTimeIso });
    }

    scheduleList.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    saveAndApplySettings();
    renderScheduleList();
    resetFormFields();
    restartPreviewRotation();

    document.getElementById("editIndex").value = "-1";
    addScheduleBtn.innerText = "+ Add Schedule";
    if (clearBtn) clearBtn.style.display = "none";
  });
}

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    document.getElementById("editIndex").value = "-1";
    resetFormFields();
    addScheduleBtn.innerText = "+ Add Schedule";
    clearBtn.style.display = "none";
  });
}

function deleteSchedule(index) {
  scheduleList.splice(index, 1);
  saveAndApplySettings();
  renderScheduleList();
  restartPreviewRotation();
}
window.deleteSchedule = deleteSchedule;

function editSchedule(index) {
  const item = scheduleList[index];
  document.getElementById("streamTitle").value = item.title;
  document.getElementById("streamTime").value = item.time;
  document.getElementById("editIndex").value = index;
  document.getElementById("addScheduleBtn").innerText = "Update Schedule";
  if (clearBtn) clearBtn.style.display = "block";
  setPickerFromIsoString(item.time);
  hideScheduleError();
}
window.editSchedule = editSchedule;

function resetFormFields() {
  const titleEl = document.getElementById("streamTitle");
  if (titleEl) titleEl.value = "";
  const dateInput = document.getElementById("scheduleDateInput");
  const timeInput = document.getElementById("scheduleTimeInput");
  const streamTime = document.getElementById("streamTime");

  if (dateInput) dateInput.value = "";
  if (timeInput) timeInput.value = "";
  if (streamTime) streamTime.value = "";

  hideScheduleError();
}

// RENDER CARD HTML ENGINE
function renderCardContent(activeItem, hasSchedules) {
  const modeRadio = document.querySelector('input[name="styleMode"]:checked');
  let mode = modeRadio ? modeRadio.value : "manual";
  if (mode === "custom") mode = "custom-advanced";
  const card = document.getElementById("previewCard");
  if (!card) return;

  const getVal = (id, defaultVal) => {
    const el = document.getElementById(id);
    return el && el.value !== "" ? el.value : defaultVal;
  };
  const getCkb = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };

  const globalTag = getVal("globalTagText", "Next Stream");
  const emptyText = getVal("emptyStatusText", "No Upcoming Schedule");
  const timeFormat = getVal("formatTime", "24");
  const dateFormat = getVal("formatDate", "long");
  const showCd = getCkb("globalShowCountdown");
  const cdLabel = getVal("globalCountdownLabel", "Countdown: ");

  let titleText = emptyText;
  let dateText = "-";
  let fullTimeText = "-";

  if (hasSchedules && activeItem) {
    titleText = activeItem.title;
    const dateObj = new Date(activeItem.time);
    const timeOpts = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat === "12",
    };
    let timeStr = dateObj.toLocaleTimeString("id-ID", timeOpts);
    if (timeFormat === "24") timeStr = timeStr.replace(".", ":");

    const dateOpts =
      dateFormat === "long"
        ? { day: "numeric", month: "long", year: "numeric" }
        : { day: "2-digit", month: "2-digit", year: "numeric" };
    dateText = dateObj.toLocaleDateString("id-ID", dateOpts);
    fullTimeText =
      `${dateText} • ${timeStr} ${timeFormat === "24" ? "WIB" : ""}`.trim();
  }

  if (mode === "manual" || mode === "custom-simple") {
    let fader = document.getElementById("previewFadeWrapper");
    if (!fader || !document.getElementById("prevTitle")) {
      card.innerHTML = `
        <div class="fade-content" id="previewFadeWrapper" data-anim="${getVal("animEffect", "fade")}">
          <div class="tag" id="prevTag">${globalTag}</div>
          <div class="title" id="prevTitle">${titleText}</div>
          <div class="time-info" id="prevTime">${fullTimeText}</div>
          <div class="countdown" id="prevCountdown"></div>
        </div>
      `;
    } else {
      const prevTag = document.getElementById("prevTag");
      const prevTitle = document.getElementById("prevTitle");
      const prevTime = document.getElementById("prevTime");
      if (prevTag) {
        prevTag.style.display = globalTag.trim() === "" ? "none" : "block";
        prevTag.innerText = globalTag;
      }
      if (prevTitle) prevTitle.innerText = titleText;
      if (prevTime) prevTime.innerText = fullTimeText;
    }
  } else {
    let rawTemplate = editorHtml
      ? editorHtml.getValue()
      : getVal("customHtmlInput", DEFAULT_CUSTOM_HTML);
    if (!rawTemplate || rawTemplate.trim() === "") {
      rawTemplate = DEFAULT_CUSTOM_HTML;
    }

    const countdownPlaceholder = `<span id="prevCountdown" class="countdown-val"></span>`;
    let rendered = rawTemplate
      .replaceAll("{title}", titleText)
      .replaceAll("{tag}", globalTag)
      .replaceAll("{time}", fullTimeText)
      .replaceAll("{date}", dateText)
      .replaceAll("{countdown}", countdownPlaceholder)
      .replaceAll("{empty_text}", emptyText);

    card.innerHTML = rendered;

    const withBlocks = card.querySelectorAll(
      "#with-schedules, .with-schedules"
    );
    const noBlocks = card.querySelectorAll("#no-schedules, .no-schedules");

    withBlocks.forEach((block) => {
      if (hasSchedules) {
        block.style.removeProperty("display");
      } else {
        block.style.setProperty("display", "none", "important");
      }
    });

    noBlocks.forEach((block) => {
      if (hasSchedules) {
        block.style.setProperty("display", "none", "important");
      } else {
        block.style.setProperty("display", "none", "important");
      }
    });
  }

  // Terapkan kembali warna dan gaya instan ke preview card setelah HTML dirender
  updateGlobalStylesPreview();

  clearInterval(countdownInterval);
  const cdEl = document.getElementById("prevCountdown");

  if (hasSchedules && activeItem && showCd && cdEl) {
    cdEl.style.display = "";
    const runCountdown = () => {
      const diff = new Date(activeItem.time).getTime() - Date.now();
      if (diff <= 0) {
        cdEl.innerHTML = `<span style="background: #ff3860; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">🔴 LIVE NOW</span>`;
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      cdEl.innerText = `${cdLabel}${d}d ${h}h ${m}m ${s}s`;
    };
    runCountdown();
    countdownInterval = setInterval(runCountdown, 1000);
  } else if (cdEl) {
    cdEl.style.display = "none";
  }
}

// Rotation engine
function runRotationStep() {
  const validSchedules = getValidSchedules();

  if (validSchedules.length === 0) {
    renderCardContent(null, false);
    const rotEl = document.getElementById("globalRotationInterval");
    const currentSecs = ((rotEl && parseInt(rotEl.value)) || 4) * 1000;
    mainLoopTimeout = setTimeout(runRotationStep, currentSecs);
    return;
  }

  if (previewRotationIndex >= validSchedules.length) previewRotationIndex = 0;

  const now = new Date();

  scheduleList.forEach((item, i) => {
    const cardEl = document.getElementById(`schedule-card-${i}`);
    const badge = document.getElementById(`badge-${i}`);
    const itemDate = new Date(item.time);
    const isToday = isSameDay(itemDate, now);
    const isPassedTime = itemDate.getTime() < now.getTime();

    if (cardEl && badge) {
      cardEl.classList.remove("active-showing");
      if (isPassedTime && !isToday) {
        badge.className = "badge-status expired";
        badge.innerText = "Expired";
      } else if (isPassedTime && isToday) {
        badge.className = "badge-status live";
        badge.innerText = "LIVE NOW";
      } else {
        badge.className = "badge-status standby";
        badge.innerText = "In Loop";
      }
    }
  });

  const activeItem = validSchedules[previewRotationIndex];
  const originalIndex = scheduleList.indexOf(activeItem);

  if (originalIndex !== -1) {
    const currentCard = document.getElementById(
      `schedule-card-${originalIndex}`
    );
    const currentBadge = document.getElementById(`badge-${originalIndex}`);
    if (currentCard && currentBadge) {
      currentCard.classList.add("active-showing");
      if (!currentBadge.classList.contains("live")) {
        currentBadge.className = "badge-status showing";
        currentBadge.innerText = "Showing";
      }
    }
  }

  const fader =
    document.getElementById("previewFadeWrapper") ||
    document.getElementById("previewCard");
  if (fader) fader.classList.add("hidden");

  setTimeout(() => {
    renderCardContent(activeItem, true);
    const newFader =
      document.getElementById("previewFadeWrapper") ||
      document.getElementById("previewCard");
    if (newFader) newFader.classList.remove("hidden");
  }, 350);

  previewRotationIndex++;
  const rotEl = document.getElementById("globalRotationInterval");
  const currentSecs = ((rotEl && parseInt(rotEl.value)) || 4) * 1000;
  mainLoopTimeout = setTimeout(runRotationStep, currentSecs);
}

function restartPreviewRotation() {
  clearTimeout(mainLoopTimeout);
  previewRotationIndex = 0;
  runRotationStep();
}

// --- DOCUMENTATION MODAL LOGIC ---
function openDocsModal() {
  const modal = document.getElementById("docsModal");
  if (modal) {
    modal.classList.add("active");
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  }
}
window.openDocsModal = openDocsModal;

function closeDocsModal() {
  const modal = document.getElementById("docsModal");
  if (modal) modal.classList.remove("active");
}
window.closeDocsModal = closeDocsModal;

function closeDocsModalOnBackdrop(e) {
  if (e.target && e.target.classList.contains("modal-overlay")) {
    closeDocsModal();
  }
}
window.closeDocsModalOnBackdrop = closeDocsModalOnBackdrop;

// ==========================================
// COPY OVERLAY URL LOGIC
// ==========================================
function copyOverlayURL() {
  const uuid = localStorage.getItem("uuid") || "";
  const overlayUrl = `${window.location.origin}/overlay${uuid ? "/" + uuid : ""}`;

  navigator.clipboard
    .writeText(overlayUrl)
    .then(() => {
      const copyTextEl = document.getElementById("copyUrlText");
      if (copyTextEl) {
        const originalText = copyTextEl.textContent;
        copyTextEl.textContent = "Copied!";
        setTimeout(() => {
          copyTextEl.textContent = originalText;
        }, 2000);
      }
    })
    .catch((err) => {
      console.error("Gagal menyalin URL:", err);
      alert("URL Overlay: " + overlayUrl);
    });
}
window.copyOverlayURL = copyOverlayURL;

// --- HANDLE SAVE BUTTON CLICK WITH ANIMATION & FEEDBACK ---
function handleSaveSettings() {
 
  const saveBtn = document.getElementById("saveSettingsBtn");
  const saveText = document.getElementById("saveBtnText");

  // Simpan konfigurasi
  // saveAndApplySettings();
  exportOverlayHTML()

  if (saveBtn) {
    // 1. Efek animasi tekan (click scale animation)
    saveBtn.style.transform = "scale(0.92)";
    
    setTimeout(() => {
      saveBtn.style.transform = "scale(1)";
    }, 150);

    // 2. Ubah teks & gaya visual tombol secara sementara
    if (saveText) {
      const originalText = "Save";
      saveText.textContent = "OBS Client Terupdate!";
      
      // Ubah background menjadi warna hijau sukses aktif
      saveBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
      saveBtn.style.boxShadow = "0 4px 18px rgba(16, 185, 129, 0.6)";

      // Kembalikan ke tampilan semula setelah 2.5 detik
      setTimeout(() => {
        saveText.textContent = originalText;
        saveBtn.style.background = "linear-gradient(135deg, #4bac1c, #83d45c)";
        saveBtn.style.boxShadow = "0 4px 15px rgba(75, 172, 28, 0.4)";
      }, 2500);
    }
  }
}
window.handleSaveSettings = handleSaveSettings;