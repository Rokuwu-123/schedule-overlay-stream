import { io } from "/socket.io/socket.io.esm.min.js";

console.log("tes")
const socket = io();
 socket.on("getID", (data) => {
  localStorage.setItem("uuid", data);
  console.log("UUID received from server:", data);
});

socket.emit("createID", localStorage.getItem("uuid"));

window.exportOverlayHTML = function () {
  const storageDataRaw = localStorage.getItem("raimu-schedule-storage");
  const storageData = storageDataRaw ? JSON.parse(storageDataRaw) : {};

  const mode = storageData.styleMode || "manual";
  const interval = (parseInt(storageData.interval) || 4) * 1000;
  const animEffect = storageData.animEffect || "fade";

  const selectedFontFamily =
    storageData.fontFamily || "'Plus Jakarta Sans', sans-serif";
  const selectedFontWeight = storageData.fontWeight || "700";

  const sizeTag = (storageData.sizeTag || 14) + "px";
  const sizeTitle = (storageData.sizeTitle || 32) + "px";
  const sizeTime = (storageData.sizeTime || 18) + "px";
  const sizeCd = (storageData.sizeCd || 14) + "px";

  const colorTag = storageData.colorTag || "#a0a5c1";
  const colorTitle = storageData.colorTitle || "#ffffff";
  const colorTime = storageData.colorTime || "#97f66b";
  const colorCd = storageData.colorCountdown || "#a0a5c1";

  const shadowX = storageData.shadowX || 0;
  const shadowY = storageData.shadowY || 2;
  const shadowBlur = storageData.shadowBlur || 8;
  const shadowColor = storageData.shadowColor || "rgba(0,0,0,0.5)";
  const textShadowValue = `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`;

  let activeCustomCss = "";
  if (mode === "custom-simple") {
    activeCustomCss = storageData.savedSimpleCss || storageData.customCss || "";
  } else if (mode === "custom-advanced" || mode === "custom") {
    activeCustomCss =
      storageData.savedAdvancedCss || storageData.customCss || "";
  }

  let fontImports = "";
  let cleanCustomCss = activeCustomCss.replace(
    /@import\s+url\([^)]+\);?|@import\s+['"][^'"]+['"];?/gi,
    (match) => {
      fontImports += match + "\n";
      return "";
    },
  );

  // Base Overlay Rules diambil langsung dari style.css
  const baseOverlayRules = `
    .schedule-card {
      width: 700px;
      height: auto;
      border-radius: 24px;
      padding: 35px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      box-sizing: border-box;
      position: relative;
    }
    .tag {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      opacity: 0.8;
      color: var(--text-muted, #a0a5c1);
    }
    .title {
      font-size: 32px;
      font-weight: 800;
      line-height: 1.3;
      margin-bottom: 20px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      color: #ffffff;
    }
    .time-info {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #97f66b;
    }
    .countdown {
      font-size: 14px;
      opacity: 0.8;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 12px;
      color: #a0a5c1;
    }
  `;

  const cardStyleManual = `
    border-radius: ${storageData.borderRadius || 24}px;
    background-color: ${storageData.bg || "#181a26f2"};
    border: ${storageData.borderWidth || 0}px solid ${storageData.borderColor || "#ffffff"};
    font-family: ${selectedFontFamily};
    font-weight: ${selectedFontWeight};
  `;

  const manualCss = `
    .schedule-card {
      ${cardStyleManual}
    }
    .tag {
      font-size: ${sizeTag} !important;
      color: ${colorTag} !important;
      text-shadow: ${textShadowValue} !important;
    }
    .title {
      font-size: ${sizeTitle} !important;
      color: ${colorTitle} !important;
      text-shadow: ${textShadowValue} !important;
      font-weight: ${selectedFontWeight} !important;
    }
    .time-info {
      font-size: ${sizeTime} !important;
      color: ${colorTime} !important;
      text-shadow: ${textShadowValue} !important;
    }
    .countdown {
      font-size: ${sizeCd} !important;
      color: ${colorCd} !important;
      text-shadow: ${textShadowValue} !important;
    }
  `;

  const standaloneHTML = `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Stream Schedule Overlay</title>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Mali:wght@500;700;800&family=Montserrat:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&family=Press+Start+2P&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />

  <style>
    ${fontImports}

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: transparent !important;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      width: 100vw;
      font-family: ${selectedFontFamily};
    }
    .viewport-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    /* 1. Base structure mandatory CSS */
    ${baseOverlayRules}

    .fade-content {
      opacity: 1 !important;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateY(0) scale(1);
    }
    .fade-content.hidden[data-anim="fade"] { opacity: 0 !important; }
    .fade-content.hidden[data-anim="slide"] { opacity: 0 !important; transform: translateY(20px); }
    .fade-content.hidden[data-anim="zoom"] { opacity: 0 !important; transform: scale(0.92); }

    /* 2. Custom CSS Theme OR Manual Styles Override */
    ${mode === "manual" ? manualCss : cleanCustomCss}
  </style>
</head>
<body>
  <div class="viewport-overlay">
    <div class="schedule-card" id="previewCard">
      <div class="fade-content" id="previewFadeWrapper" data-anim="${animEffect}">
      </div>
    </div>
  </div>

  <script>
    const config = ${JSON.stringify(storageData)};
    const scheduleList = config.scheduleList || [];
    let currentIndex = 0;
    let countdownInterval = null;

    function isSameDay(d1, d2) {
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }

    function getValidSchedules() {
      const now = new Date();
      return scheduleList.filter(item => {
        const itemDate = new Date(item.time);
        return itemDate.getTime() >= now.getTime() || isSameDay(itemDate, now);
      });
    }

    function renderCard(activeItem, hasSchedules) {
      const card = document.getElementById("previewCard");
      const mode = config.styleMode || "manual";
      const globalTag = config.tagText || "Next Stream";
      const emptyText = config.emptyText || "No Upcoming Schedule";
      const timeFormat = config.formatTime || "24";
      const dateFormat = config.formatDate || "long";
      const showCd = config.showCd !== false;
      const cdLabel = config.cdLabel || "Countdown: ";

      let titleText = emptyText;
      let dateText = "-";
      let fullTimeText = "-";

      if (hasSchedules && activeItem) {
        titleText = activeItem.title;
        const dateObj = new Date(activeItem.time);
        const timeOpts = { hour: "2-digit", minute: "2-digit", hour12: timeFormat === "12" };
        let timeStr = dateObj.toLocaleTimeString("id-ID", timeOpts);
        if (timeFormat === "24") timeStr = timeStr.replace(".", ":");

        const dateOpts = dateFormat === "long"
          ? { day: "numeric", month: "long", year: "numeric" }
          : { day: "2-digit", month: "2-digit", year: "numeric" };
        dateText = dateObj.toLocaleDateString("id-ID", dateOpts);
        fullTimeText = \`\${dateText} • \${timeStr} \${timeFormat === "24" ? "WIB" : ""}\`.trim();
      }

      if (mode === "manual" || mode === "custom-simple") {
        card.innerHTML = \`
          <div class="fade-content" id="previewFadeWrapper" data-anim="\${config.animEffect || 'fade'}">
            <div class="tag">\${globalTag}</div>
            <div class="title">\${titleText}</div>
            <div class="time-info">\${fullTimeText}</div>
            <div class="countdown" id="prevCountdown"></div>
          </div>
        \`;
      } else {
        let rawTemplate = config.customHtml || config.savedAdvancedHtml || \`<div id="with-schedules" class="fade-content">
  <div class="tag">{tag}</div>
  <div class="title">{title}</div>
  <div class="time-info">{time}</div>
  <div class="countdown">{countdown}</div>
</div>
<div id="no-schedules" class="fade-content" style="display: none !important;">
  <div class="tag">{tag}</div>
  <div class="title">{empty_text}</div>
  <div class="time-info">-</div>
</div>\`;

        const countdownPlaceholder = \`<span id="prevCountdown" class="countdown-val"></span>\`;
        let rendered = rawTemplate
          .replaceAll("{title}", titleText)
          .replaceAll("{tag}", globalTag)
          .replaceAll("{time}", fullTimeText)
          .replaceAll("{date}", dateText)
          .replaceAll("{countdown}", countdownPlaceholder)
          .replaceAll("{empty_text}", emptyText);

        card.innerHTML = rendered;

        const withBlocks = card.querySelectorAll("#with-schedules, .with-schedules");
        const noBlocks = card.querySelectorAll("#no-schedules, .no-schedules");

        withBlocks.forEach(b => b.style.display = hasSchedules ? "" : "none");
        noBlocks.forEach(b => b.style.display = hasSchedules ? "none" : "");
      }

      clearInterval(countdownInterval);
      const cdEl = document.getElementById("prevCountdown");

      if (hasSchedules && activeItem && showCd && cdEl) {
        cdEl.style.display = "";
        const runCd = () => {
          const diff = new Date(activeItem.time).getTime() - Date.now();
          if (diff <= 0) {
            cdEl.innerHTML = \`<span style="background: #ff3860; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">🔴 LIVE NOW</span>\`;
            return;
          }
          const d = Math.floor(diff / 86400000);
          const h = Math.floor((diff % 86400000) / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          cdEl.innerText = \`\${cdLabel}\${d}d \${h}h \${m}m \${s}s\`;
        };
        runCd();
        countdownInterval = setInterval(runCd, 1000);
      } else if (cdEl) {
        cdEl.style.display = "none";
      }
    }

    function initDisplay() {
      const valid = getValidSchedules();
      if (valid.length === 0) {
        renderCard(null, false);
      } else {
        renderCard(valid[0], true);
      }
    }

    function runRotation() {
      const valid = getValidSchedules();
      if (valid.length === 0) {
        renderCard(null, false);
        setTimeout(runRotation, ${interval});
        return;
      }

      if (currentIndex >= valid.length) currentIndex = 0;
      const activeItem = valid[currentIndex];

      const fader = document.getElementById("previewFadeWrapper") || document.getElementById("previewCard");
      if (fader) fader.classList.add("hidden");

      setTimeout(() => {
        renderCard(activeItem, true);
        const newFader = document.getElementById("previewFadeWrapper") || document.getElementById("previewCard");
        if (newFader) newFader.classList.remove("hidden");
      }, 350);

      currentIndex++;
      setTimeout(runRotation, ${interval});
    }

    initDisplay();
    runRotation();
  <\/script>
</body>
</html>`;

 socket.emit("html", { uuid: localStorage.getItem("uuid"), html: standaloneHTML });
};

