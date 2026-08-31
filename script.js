const defaults = {
  nameA: "D",
  nameB: "T",
  accessCode: "20260526",
  editCode: "20260610",
  startDate: "2026-05-26",
  startTime: "23:29:00",
  wishes: [
    { text: "\u4e00\u8d77\u770b\u4e00\u6b21\u6d77\u8fb9\u65e5\u51fa", done: false },
    { text: "\u62cd\u4e00\u7ec4\u53ea\u5c5e\u4e8e\u6211\u4eec\u7684\u7167\u7247", done: false },
    { text: "\u628a\u559c\u6b22\u7684\u57ce\u5e02\u6162\u6162\u8d70\u5b8c", done: false }
  ],
  photos: ["", "", ""],
  photoPositions: [
    { x: 50, y: 50 },
    { x: 50, y: 50 },
    { x: 50, y: 50 }
  ],
  photoEntries: [],
  travelEntries: [
    { id: "travel-beijing", place: "\u5317\u4eac", status: "visited", note: "\u628a\u7b2c\u4e00\u9897\u661f\u6807\u7559\u7ed9\u4e00\u8d77\u60f3\u5ff5\u7684\u5730\u65b9\u3002", photo: "", x: 70, y: 45 },
    { id: "travel-chengdu", place: "\u6210\u90fd", status: "wishlist", note: "\u60f3\u53bb\u8857\u5df7\u91cc\u6162\u6162\u8d70\uff0c\u5403\u4e00\u987f\u70ed\u6c14\u817e\u817e\u7684\u706b\u9505\u3002", photo: "", x: 51, y: 68 },
    { id: "travel-sanya", place: "\u4e09\u4e9a", status: "next", note: "\u4e0b\u4e00\u6b21\u53bb\u770b\u6d77\uff0c\u628a\u65e5\u843d\u548c\u98ce\u90fd\u5e26\u56de\u6765\u3002", photo: "", x: 65, y: 94 }
  ],
  contentEntries: {
    story: [],
    daily: [],
    notes: [],
    storyTimeline: []
  },
  capsules: [],
  edits: {},
  editTimes: {},
  updatedAt: ""
};

const storageKey = "couple-home-state";
const authKey = "couple-home-auth";
const editTokenKey = "couple-home-edit-token";
const guestKey = "couple-home-guest";
const capsuleDismissedKey = "couple-home-dismissed-capsules";
const capsuleNotifiedKey = "couple-home-notified-capsules";
const apiStateUrl = "/api/state";
const apiLoginUrl = "/api/login";
const apiAuthUrl = "/api/auth";
const apiImagesUrl = "/api/images";
const staticStateUrl = "data/site-state.json";
const editorStateRefreshIntervalMs = 30000;
const viewerStateRefreshIntervalMs = 120000;
let staticStateMode = false;
const page = document.body.dataset.page;
const state = { ...defaults };
const editableDefaults = {};
let lastPersistedStateSignature = "";
const entryFilterState = {
  story: { query: "", month: "" },
  notes: { query: "", month: "" },
  album: { query: "", month: "" }
};
const editor = {
  activeScope: null,
  panel: null,
};
const homeMusic = document.querySelector("#homeMusic");
const albumMusic = document.querySelector("#albumMusic");
const storyMusic = document.querySelector("#storyMusic");
const notesMusic = document.querySelector("#notesMusic");
const travelMusic = document.querySelector("#travelMusic");
const wishesMusic = document.querySelector("#wishesMusic");
let editingTravelId = null;
let draggingTravelId = null;
let activeTravelFilter = "all";
let capsuleUnlockTimer = 0;
let focusedMemoryHash = "";
let pendingStateSaveTimer = 0;
const chinaPlaces = [
  { name: "\u5317\u4eac", x: 70, y: 45, aliases: ["beijing"] },
  { name: "\u5929\u6d25", x: 72, y: 47, aliases: ["tianjin"] },
  { name: "\u4e0a\u6d77", x: 79, y: 70, aliases: ["shanghai"] },
  { name: "\u91cd\u5e86", x: 57, y: 68, aliases: ["chongqing"] },
  { name: "\u54c8\u5c14\u6ee8", x: 80, y: 25, aliases: ["haerbin", "harbin"] },
  { name: "\u957f\u6625", x: 80, y: 31, aliases: ["changchun"] },
  { name: "\u6c88\u9633", x: 77, y: 38, aliases: ["shenyang"] },
  { name: "\u5927\u8fde", x: 76, y: 44, aliases: ["dalian"] },
  { name: "\u547c\u548c\u6d69\u7279", x: 58, y: 40, aliases: ["huhehaote"] },
  { name: "\u77f3\u5bb6\u5e84", x: 66, y: 49, aliases: ["shijiazhuang"] },
  { name: "\u592a\u539f", x: 62, y: 50, aliases: ["taiyuan"] },
  { name: "\u6d4e\u5357", x: 72, y: 53, aliases: ["jinan"] },
  { name: "\u9752\u5c9b", x: 76, y: 54, aliases: ["qingdao"] },
  { name: "\u90d1\u5dde", x: 65, y: 58, aliases: ["zhengzhou"] },
  { name: "\u6d1b\u9633", x: 63, y: 58, aliases: ["luoyang"] },
  { name: "\u897f\u5b89", x: 57, y: 59, aliases: ["xian", "xi'an"] },
  { name: "\u5170\u5dde", x: 47, y: 55, aliases: ["lanzhou"] },
  { name: "\u94f6\u5ddd", x: 53, y: 49, aliases: ["yinchuan"] },
  { name: "\u897f\u5b81", x: 42, y: 56, aliases: ["xining"] },
  { name: "\u4e4c\u9c81\u6728\u9f50", x: 24, y: 36, aliases: ["wulumuqi", "urumqi"] },
  { name: "\u62c9\u8428", x: 31, y: 73, aliases: ["lasa", "lhasa"] },
  { name: "\u6210\u90fd", x: 51, y: 68, aliases: ["chengdu"] },
  { name: "\u5fb7\u9633", x: 51, y: 66, aliases: ["deyang"] },
  { name: "\u4e50\u5c71", x: 51, y: 71, aliases: ["leshan"] },
  { name: "\u4e5d\u5be8\u6c9f", x: 51, y: 62, aliases: ["jiuzhaigou"] },
  { name: "\u8d35\u9633", x: 57, y: 77, aliases: ["guiyang"] },
  { name: "\u6606\u660e", x: 50, y: 82, aliases: ["kunming"] },
  { name: "\u5927\u7406", x: 47, y: 82, aliases: ["dali"] },
  { name: "\u4e3d\u6c5f", x: 47, y: 78, aliases: ["lijiang"] },
  { name: "\u5357\u5b81", x: 60, y: 88, aliases: ["nanning"] },
  { name: "\u6842\u6797", x: 63, y: 82, aliases: ["guilin"] },
  { name: "\u6d77\u53e3", x: 64, y: 92, aliases: ["haikou"] },
  { name: "\u4e09\u4e9a", x: 65, y: 94, aliases: ["sanya"] },
  { name: "\u957f\u6c99", x: 65, y: 75, aliases: ["changsha"] },
  { name: "\u6b66\u6c49", x: 67, y: 67, aliases: ["wuhan"] },
  { name: "\u5357\u660c", x: 71, y: 75, aliases: ["nanchang"] },
  { name: "\u5408\u80a5", x: 72, y: 64, aliases: ["hefei"] },
  { name: "\u5357\u4eac", x: 75, y: 65, aliases: ["nanjing"] },
  { name: "\u82cf\u5dde", x: 78, y: 68, aliases: ["suzhou"] },
  { name: "\u676d\u5dde", x: 77, y: 72, aliases: ["hangzhou"] },
  { name: "\u5b81\u6ce2", x: 80, y: 73, aliases: ["ningbo"] },
  { name: "\u6e29\u5dde", x: 78, y: 78, aliases: ["wenzhou"] },
  { name: "\u798f\u5dde", x: 74, y: 82, aliases: ["fuzhou"] },
  { name: "\u53a6\u95e8", x: 73, y: 86, aliases: ["xiamen"] },
  { name: "\u53f0\u5317", x: 80, y: 85, aliases: ["taibei", "taipei"] },
  { name: "\u5e7f\u5dde", x: 67, y: 86, aliases: ["guangzhou"] },
  { name: "\u6df1\u5733", x: 69, y: 89, aliases: ["shenzhen"] },
  { name: "\u73e0\u6d77", x: 67, y: 90, aliases: ["zhuhai"] },
  { name: "\u9999\u6e2f", x: 70, y: 90, aliases: ["hongkong", "xianggang"] },
  { name: "\u6fb3\u95e8", x: 68, y: 91, aliases: ["macao", "aomen"] }
];
const travelStatusLabels = {
  visited: "\u6765\u8fc7",
  wishlist: "\u60f3\u53bb",
  next: "\u4e0b\u4e00\u7ad9"
};
const contentEntryConfig = {
  story: {
    fields: ["time", "title", "text"],
    listSelector: '[data-content-list="story"]',
    formSelector: '[data-content-form="story"]',
    cardClass: "content-entry-card timeline-entry",
    defaults: { time: "\u65b0\u7684\u7247\u6bb5", title: "\u65b0\u7684\u6545\u4e8b", text: "\u5199\u4e0b\u8fd9\u4e2a\u77ac\u95f4\u3002", image: "", imageSize: "medium" },
    submitText: "\u65b0\u589e\u6545\u4e8b"
  },
  daily: {
    fields: ["label", "title", "text"],
    listSelector: '[data-content-list="daily"]',
    formSelector: '[data-content-form="daily"]',
    cardClass: "content-entry-card daily-card-item",
    defaults: { label: "Daily", title: "\u65b0\u7684\u65e5\u5e38", text: "\u5199\u4e0b\u4eca\u5929\u7684\u5c0f\u4e8b\u3002" },
    submitText: "\u65b0\u589e\u65e5\u5e38"
  },
  notes: {
    fields: ["time", "text"],
    listSelector: '[data-content-list="notes"]',
    formSelector: '[data-content-form="notes"]',
    cardClass: "content-entry-card note-card",
    defaults: { time: "\u4eca\u5929", text: "\u5199\u4e0b\u6b64\u523b\u60f3\u8bf4\u7684\u8bdd\u3002" },
    submitText: "\u65b0\u589e\u788e\u788e\u5ff5"
  },
  storyTimeline: {
    fields: ["eventDate", "title", "text"],
    listSelector: '[data-content-list="storyTimeline"]',
    formSelector: '[data-content-form="storyTimeline"]',
    cardClass: "story-timeline-item",
    defaults: { eventDate: "", title: "\u65b0\u7684\u6545\u4e8b", text: "\u5199\u4e0b\u8fd9\u4e00\u5929\u7684\u8bb0\u5fc6\u3002", image: "", imageSize: "medium" },
    submitText: "\u6dfb\u52a0\u4e8b\u4ef6"
  }
};
const chinaProvinceLabels = [
  { name: "\u5317\u4eac", capital: "\u5317\u4eac", x: 70, y: 45 },
  { name: "\u5929\u6d25", capital: "\u5929\u6d25", x: 73, y: 48 },
  { name: "\u6cb3\u5317", capital: "\u77f3\u5bb6\u5e84", x: 67, y: 50 },
  { name: "\u5c71\u897f", capital: "\u592a\u539f", x: 62, y: 51 },
  { name: "\u5185\u8499\u53e4", capital: "\u547c\u548c\u6d69\u7279", x: 56, y: 36 },
  { name: "\u8fbd\u5b81", capital: "\u6c88\u9633", x: 77, y: 39 },
  { name: "\u5409\u6797", capital: "\u957f\u6625", x: 80, y: 32 },
  { name: "\u9ed1\u9f99\u6c5f", capital: "\u54c8\u5c14\u6ee8", x: 79, y: 24 },
  { name: "\u4e0a\u6d77", capital: "\u4e0a\u6d77", x: 81, y: 70 },
  { name: "\u6c5f\u82cf", capital: "\u5357\u4eac", x: 76, y: 65 },
  { name: "\u6d59\u6c5f", capital: "\u676d\u5dde", x: 78, y: 73 },
  { name: "\u5b89\u5fbd", capital: "\u5408\u80a5", x: 72, y: 66 },
  { name: "\u798f\u5efa", capital: "\u798f\u5dde", x: 74, y: 82 },
  { name: "\u6c5f\u897f", capital: "\u5357\u660c", x: 70, y: 75 },
  { name: "\u5c71\u4e1c", capital: "\u6d4e\u5357", x: 72, y: 54 },
  { name: "\u6cb3\u5357", capital: "\u90d1\u5dde", x: 65, y: 59 },
  { name: "\u6e56\u5317", capital: "\u6b66\u6c49", x: 66, y: 68 },
  { name: "\u6e56\u5357", capital: "\u957f\u6c99", x: 65, y: 76 },
  { name: "\u5e7f\u4e1c", capital: "\u5e7f\u5dde", x: 67, y: 86 },
  { name: "\u5e7f\u897f", capital: "\u5357\u5b81", x: 60, y: 86 },
  { name: "\u6d77\u5357", capital: "\u6d77\u53e3", x: 64, y: 94 },
  { name: "\u91cd\u5e86", capital: "\u91cd\u5e86", x: 57, y: 68 },
  { name: "\u56db\u5ddd", capital: "\u6210\u90fd", x: 50, y: 68 },
  { name: "\u8d35\u5dde", capital: "\u8d35\u9633", x: 57, y: 78 },
  { name: "\u4e91\u5357", capital: "\u6606\u660e", x: 49, y: 83 },
  { name: "\u897f\u85cf", capital: "\u62c9\u8428", x: 31, y: 73 },
  { name: "\u9655\u897f", capital: "\u897f\u5b89", x: 57, y: 60 },
  { name: "\u7518\u8083", capital: "\u5170\u5dde", x: 45, y: 55 },
  { name: "\u9752\u6d77", capital: "\u897f\u5b81", x: 39, y: 58 },
  { name: "\u5b81\u590f", capital: "\u94f6\u5ddd", x: 52, y: 50 },
  { name: "\u65b0\u7586", capital: "\u4e4c\u9c81\u6728\u9f50", x: 23, y: 38 },
  { name: "\u53f0\u6e7e", capital: "\u53f0\u5317", x: 81, y: 85 },
  { name: "\u9999\u6e2f", capital: "\u9999\u6e2f", x: 70, y: 90 },
  { name: "\u6fb3\u95e8", capital: "\u6fb3\u95e8", x: 68, y: 91 }
];
const fallbackLoveLines = [
  "谢谢你在世界的角落找到我了",
  "小小的世界灰蒙蒙，你的出现亮晶晶",
  "永远在一起是我们的约定",
  "有你在的每个瞬间我都想说好幸福",
  "明天太久了，我们今天见",
  "我想和你一直走下去，期待你的每一天",
  "散步、吹风、看日落，遇到你之后都变成了浪漫",
  "你没有什么要改变的，我只想爱你",
  "过去、从今、往后，没什么区别呀，因为都是和你一起",
  "我想和你谈论天空、宇宙和缘分，只想和你"
];
let loveLines = [...fallbackLoveLines];
const loveLineHistoryKey = "couple-home-love-line-history";
let loveLineHistory = new Set();
let currentLoveLine = "";
let chinaAreaIndex = [];
let chinaAreaIndexPromise = null;

document.body.classList.add("page-prep");

const els = {
  heroNameA: document.querySelector("#heroNameA"),
  heroNameB: document.querySelector("#heroNameB"),
  footerNameA: document.querySelector("#footerNameA"),
  footerNameB: document.querySelector("#footerNameB"),
  days: document.querySelector("#daysTogether"),
  hours: document.querySelector("#hoursTogether"),
  minutes: document.querySelector("#minutesTogether"),
  seconds: document.querySelector("#secondsTogether"),
  settingsForm: document.querySelector("#settingsForm"),
  copyGuestLink: document.querySelector("[data-copy-guest-link]"),
  nameA: document.querySelector("#nameA"),
  nameB: document.querySelector("#nameB"),
  startDate: document.querySelector("#startDate"),
  startTime: document.querySelector("#startTime"),
  loginCodeSetting: document.querySelector("#loginCodeSetting"),
  wishForm: document.querySelector("#wishForm"),
  wishInput: document.querySelector("#wishInput"),
  wishList: document.querySelector("#wishList"),
  loginForm: document.querySelector("#loginForm"),
  loginCode: document.querySelector("#loginCode"),
  loginError: document.querySelector("#loginError"),
  travelPlaceForm: document.querySelector("#travelPlaceForm"),
  travelPlaceInput: document.querySelector("#travelPlaceInput"),
  travelStatus: document.querySelector("#travelStatus"),
  travelNote: document.querySelector("#travelNote"),
  travelPhoto: document.querySelector("#travelPhoto"),
  travelPlaceOptions: document.querySelector("#travelPlaceOptions"),
  travelFormMessage: document.querySelector("#travelFormMessage"),
  chinaMapMarkers: document.querySelector("#chinaMapMarkers"),
  travelEntryList: document.querySelector("#travelEntryList"),
  chinaProvinceLabels: document.querySelector("#chinaProvinceLabels"),
  travelVisitedCount: document.querySelector("#travelVisitedCount"),
  travelWishlistCount: document.querySelector("#travelWishlistCount"),
  travelNextCount: document.querySelector("#travelNextCount"),
  travelAllCount: document.querySelector("#travelAllCount"),
  travelNextPlace: document.querySelector("#travelNextPlace"),
  travelNextNote: document.querySelector("#travelNextNote"),
  travelNextStatus: document.querySelector("#travelNextStatus"),
  travelRecordCount: document.querySelector("#travelRecordCount"),
  albumPhotoForm: document.querySelector("#albumPhotoForm"),
  albumPhotoCaption: document.querySelector("#albumPhotoCaption"),
  albumPhotoContent: document.querySelector("#albumPhotoContent"),
  albumPhotoInput: document.querySelector("#albumPhotoInput"),
  albumPhotoMessage: document.querySelector("#albumPhotoMessage"),
  albumPhotoList: document.querySelector("#albumPhotoList"),
  albumPhotoCount: document.querySelector("#albumPhotoCount"),
  albumPhotoOpen: document.querySelector("[data-album-photo-open]"),
  loveLineCard: document.querySelector("#loveLineCard"),
  loveLineText: document.querySelector("#loveLineText"),
  todayMemoryDate: document.querySelector("#todayMemoryDate"),
  todayMemoryCount: document.querySelector("#todayMemoryCount"),
  todayMemoryPrompt: document.querySelector("#todayMemoryPrompt"),
  todayMemoryList: document.querySelector("#todayMemoryList")
};

init();

async function init() {
  activateGuestModeFromUrl();
  collectEditableDefaults();
  await loadState();
  if (!guardPage()) return;
  setEditorMode(isEditorMode());
  applyAllState();
  initPageTransitions();
  initScrollParallax();
  initNavigation();
  keepAddControlsAtBottom();
  initForms();
  initEntryFilters();
  initPhotos();
  initTravelMap();
  initInlineEditor();
  initHomeMusic();
  initStoryMusic();
  initAlbumMusic();
  initNotesMusic();
  initTravelMusic();
  initWishesMusic();
  initLoveLine();
  initCanvas();
  setInterval(updateTogetherTime, 1000);
  setInterval(() => {
    if (isEditorMode()) refreshStateFromServer();
  }, editorStateRefreshIntervalMs);
  setInterval(() => {
    if (!isEditorMode()) refreshStateFromServer();
  }, viewerStateRefreshIntervalMs);
  setInterval(checkCapsuleUnlockAlerts, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flushScheduledStateSave();
      return;
    }
    if (!document.hidden) {
      refreshStateFromServer();
      checkCapsuleUnlockAlerts();
    }
  });
  window.addEventListener("pagehide", flushScheduledStateSave);
  window.addEventListener("focus", () => {
    refreshStateFromServer();
    checkCapsuleUnlockAlerts();
  });
  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);
  initPwaServiceWorker();
}

async function initLoveLine() {
  if (!els.loveLineCard || !els.loveLineText) return;

  loveLineHistory = loadLoveLineHistory();
  let lastTouchRotation = 0;
  els.loveLineCard.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "touch") return;
    event.preventDefault();
    lastTouchRotation = Date.now();
    showRandomLoveLine();
  });
  els.loveLineCard.addEventListener("click", () => {
    if (Date.now() - lastTouchRotation < 600) return;
    showRandomLoveLine();
  });
  showRandomLoveLine();

  try {
    const response = await fetch("data/love-lines.md", { cache: "no-store" });
    if (!response.ok) throw new Error("love lines request failed");
    const text = await response.text();
    const loaded = text
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*-\s+(.+?)\s*$/)?.[1]?.trim())
      .filter(Boolean);
    const uniqueLines = [...new Set(loaded)];
    if (uniqueLines.length >= 2) {
      loveLines = uniqueLines;
      loveLineHistory = new Set([...loveLineHistory].filter((line) => loveLines.includes(line)));
      showRandomLoveLine();
    }
  } catch {
    // Keep the built-in lines available when the data file is unavailable.
  }
}

function showRandomLoveLine() {
  if (!loveLines.length || !els.loveLineText) return;
  let candidates = loveLines.filter((line) => !loveLineHistory.has(line));
  if (!candidates.length) {
    loveLineHistory.clear();
    candidates = loveLines.filter((line) => line !== currentLoveLine);
  }
  if (!candidates.length) candidates = loveLines;

  const nextLine = candidates[Math.floor(Math.random() * candidates.length)];
  currentLoveLine = nextLine;
  loveLineHistory.add(nextLine);
  saveLoveLineHistory();
  els.loveLineCard?.classList.remove("is-changing");
  void els.loveLineCard?.offsetWidth;
  els.loveLineText.textContent = nextLine;
  els.loveLineCard?.classList.add("is-changing");
}

function loadLoveLineHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(loveLineHistoryKey) || "[]");
    return new Set(Array.isArray(value) ? value.map((line) => String(line)) : []);
  } catch {
    return new Set();
  }
}

function saveLoveLineHistory() {
  try {
    localStorage.setItem(loveLineHistoryKey, JSON.stringify([...loveLineHistory]));
  } catch {
    // The quote rotation still works when browser storage is unavailable.
  }
}

function normalizeState(value) {
  const next = value && typeof value === "object" ? value : {};
  return {
    ...defaults,
    ...next,
    accessCode: String(next.accessCode || next.loginCode || defaults.accessCode),
    startDate: !next.startDate || next.startDate === "2024-05-20" ? defaults.startDate : next.startDate,
    startTime: next.startTime || defaults.startTime,
    wishes: Array.isArray(next.wishes) ? next.wishes.map(normalizeWish).filter(Boolean) : defaults.wishes,
    photos: Array.isArray(next.photos) ? next.photos.concat(defaults.photos).slice(0, 3) : defaults.photos,
    photoPositions: normalizePhotoPositions(next.photoPositions),
    photoEntries: Array.isArray(next.photoEntries) ? next.photoEntries.map(normalizePhotoEntry).filter(Boolean) : defaults.photoEntries,
    travelEntries: Array.isArray(next.travelEntries) ? next.travelEntries.map(normalizeTravelEntry).filter(Boolean) : defaults.travelEntries,
    contentEntries: normalizeContentEntries(next.contentEntries),
    capsules: Array.isArray(next.capsules) ? next.capsules.map(normalizeCapsule).filter(Boolean) : defaults.capsules,
    edits: next.edits && typeof next.edits === "object" ? next.edits : {},
    editTimes: next.editTimes && typeof next.editTimes === "object" ? next.editTimes : {},
    updatedAt: String(next.updatedAt || "")
  };
}

function normalizeTravelEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const place = String(entry.place || "").trim();
  if (!place) return null;
  const knownPlace = findChinaPlace(place);
  const x = Number.isFinite(Number(entry.x)) ? Number(entry.x) : knownPlace?.x;
  const y = Number.isFinite(Number(entry.y)) ? Number(entry.y) : knownPlace?.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  let visitDate = String(entry.visitDate || "").trim();
  if (!visitDate && entry.updatedAt) {
    const date = new Date(Number(entry.updatedAt));
    if (!Number.isNaN(date.getTime())) {
      const pad = (n) => String(n).padStart(2, "0");
      visitDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
  }

  return {
    id: String(entry.id || `travel-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    place,
    status: travelStatusLabels[entry.status] ? entry.status : "visited",
    note: String(entry.note || ""),
    photo: String(entry.photo || ""),
    position: normalizePhotoPosition(entry.position),
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(4, Math.min(96, y)),
    visitDate,
    updatedAt: entry.updatedAt || ""
  };
}

function normalizeContentEntries(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.keys(contentEntryConfig).map((type) => {
    const config = contentEntryConfig[type];
    const entries = Array.isArray(source[type]) ? source[type] : defaults.contentEntries[type];
    return [type, entries.map((entry) => normalizeContentEntry(type, entry, config)).filter(Boolean)];
  }));
}

function normalizeContentEntry(type, entry, config = contentEntryConfig[type]) {
  if (!entry || typeof entry !== "object") return null;
  const output = {
    id: String(entry.id || `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  };

  config.fields.forEach((field) => {
    output[field] = String(entry[field] || "").trim();
  });

  // Timeline stories keep their media settings so newly added cards match the design after reload.
  if (type === "storyTimeline" || type === "story") {
    output.image = String(entry.image || "");
    output.imageSize = ["small", "medium", "large"].includes(entry.imageSize) ? entry.imageSize : (config.defaults.imageSize || "medium");
    output.imagePosition = normalizePhotoPosition(entry.imagePosition);
  }

  if (!output.text && !output.title) return null;
  output.updatedAt = entry.updatedAt || "";
  return output;
}

function normalizeCapsule(entry) {
  if (!entry || typeof entry !== "object") return null;
  const title = String(entry.title || "").trim();
  const text = String(entry.text || "").trim();
  const unlockAt = Number(entry.unlockAt);
  if (!title && !text) return null;
  if (!Number.isFinite(unlockAt)) return null;
  return {
    id: String(entry.id || `capsule-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    title,
    text,
    unlockAt,
    createdAt: Number(entry.createdAt) || Number(entry.updatedAt) || Date.now(),
    updatedAt: Number(entry.updatedAt) || ""
  };
}

function normalizeWish(entry) {
  if (!entry || typeof entry !== "object") return null;
  const text = String(entry.text || "").trim();
  if (!text) return null;
  const done = Boolean(entry.done);
  const updatedAt = Number(entry.updatedAt) || "";
  const doneAt = done ? (Number(entry.doneAt) || updatedAt || "") : "";
  return {
    text,
    done,
    doneAt,
    updatedAt
  };
}

function normalizePhotoEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const caption = String(entry.caption || "").trim();
  const content = String(entry.content || "").trim();
  const photo = String(entry.photo || "");
  if (!photo) return null;
  return {
    id: String(entry.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    caption,
    content,
    photo,
    position: normalizePhotoPosition(entry.position),
    updatedAt: entry.updatedAt || ""
  };
}

function normalizePhotoPositions(value) {
  const positions = Array.isArray(value) ? value : [];
  return defaults.photoPositions.map((position, index) => normalizePhotoPosition(positions[index] || position));
}

function normalizePhotoPosition(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    x: clampPercent(source.x),
    y: clampPercent(source.y)
  };
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.max(0, Math.min(100, number));
}

function getStateSyncSignature(value) {
  const snapshot = normalizeState(value);
  snapshot.updatedAt = "";
  return JSON.stringify(snapshot);
}

function buildStateEtag(updatedAt, authorized) {
  const version = String(updatedAt || "").trim();
  if (!version) return "";
  return `W/"state-${version}-${authorized ? "editor" : "viewer"}"`;
}

function formatHttpDate(updatedAt) {
  const value = Number(updatedAt);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Date(value).toUTCString();
}

function buildStateRequestHeaders() {
  const headers = { "X-Edit-Token": sessionStorage.getItem(editTokenKey) || "" };
  const etag = buildStateEtag(state.updatedAt, isEditorMode());
  const lastModified = formatHttpDate(state.updatedAt);
  if (etag) headers["If-None-Match"] = etag;
  if (lastModified) headers["If-Modified-Since"] = lastModified;
  return headers;
}

async function loadState() {
  let saved = {};
  let savedRaw = "";
  try {
    savedRaw = localStorage.getItem(storageKey) || "";
    saved = JSON.parse(savedRaw) || {};
  } catch {
    saved = {};
  }

  const localState = normalizeState(saved);
  Object.assign(state, localState);

  try {
    const response = await fetch(apiStateUrl, {
      cache: "no-store",
      headers: { "X-Edit-Token": sessionStorage.getItem(editTokenKey) || "" }
    });
    if (!response.ok) throw new Error("state request failed");
    const serverState = normalizeState(await response.json());
    if (!serverState.updatedAt && hasMeaningfulLocalState(localState, savedRaw)) {
      Object.assign(state, serverState, localState);
      localStorage.setItem(storageKey, JSON.stringify(state));
      if (canEdit()) await saveState();
      return;
    }
    const localIsNewer = hasMeaningfulLocalState(localState, savedRaw)
      && Number(localState.updatedAt || 0) > Number(serverState.updatedAt || 0);
    const mergedCapsules = mergeCapsules(localState.capsules, serverState.capsules);
    if (localIsNewer) {
      Object.assign(state, localState, { capsules: mergedCapsules });
      localStorage.setItem(storageKey, JSON.stringify(state));
      if (canEdit()) await saveState();
      return;
    }
    Object.assign(state, serverState, { capsules: mergedCapsules });
    localStorage.setItem(storageKey, JSON.stringify(state));
    lastPersistedStateSignature = getStateSyncSignature(state);
  } catch {
    // Netlify and other static hosts cannot run server.py. Load the last
    // exported state file so a fresh deployment still renders saved entries.
    try {
      const response = await fetch(staticStateUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("static state request failed");
      const staticState = normalizeState(await response.json());
      const localIsNewer = hasMeaningfulLocalState(localState, savedRaw)
        && Number(localState.updatedAt || 0) > Number(staticState.updatedAt || 0);
      const mergedCapsules = mergeCapsules(localState.capsules, staticState.capsules);
      Object.assign(state, localIsNewer ? localState : staticState, { capsules: mergedCapsules });
      localStorage.setItem(storageKey, JSON.stringify(state));
      lastPersistedStateSignature = getStateSyncSignature(state);
      staticStateMode = true;
      document.body.classList.remove("offline-state");
    } catch {
      document.body.classList.add("offline-state");
    }
  }
}

function hasMeaningfulLocalState(localState, rawValue) {
  if (!rawValue) return false;

  return ["nameA", "nameB", "accessCode", "startDate", "startTime", "wishes", "photos", "photoPositions", "photoEntries", "travelEntries", "contentEntries", "capsules", "edits"].some((key) => {
    return JSON.stringify(localState[key]) !== JSON.stringify(defaults[key]);
  });
}

function mergeCapsules(primary, fallback) {
  const ordered = [];
  const seen = new Set();
  [primary, fallback].forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const id = String(entry.id || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      ordered.push(entry);
    });
  });
  return ordered;
}

async function saveState() {
  if (canEdit() && !staticStateMode) {
    await moveInlineImagesToUploads(state);
  }

  const normalized = normalizeState(state);
  const signature = getStateSyncSignature(normalized);
  if (signature === lastPersistedStateSignature) {
    Object.assign(state, normalized);
    localStorage.setItem(storageKey, JSON.stringify(state));
    return;
  }

  Object.assign(state, normalized);
  if (!canEdit()) {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return;
  }

  Object.assign(state, { updatedAt: String(Date.now()) });
  localStorage.setItem(storageKey, JSON.stringify(state));

  if (staticStateMode) {
    document.body.classList.remove("offline-state");
    lastPersistedStateSignature = getStateSyncSignature(state);
    return;
  }

  try {
    const response = await fetch(apiStateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Edit-Token": sessionStorage.getItem(editTokenKey) || ""
      },
      body: JSON.stringify(state)
    });
    if (!response.ok) throw new Error("state save failed");
    Object.assign(state, normalizeState(await response.json()));
    localStorage.setItem(storageKey, JSON.stringify(state));
    lastPersistedStateSignature = getStateSyncSignature(state);
    document.body.classList.remove("offline-state");
  } catch {
    document.body.classList.add("offline-state");
  }
}

function scheduleStateSave(delay = 180) {
  if (!canEdit()) return;
  if (pendingStateSaveTimer) {
    window.clearTimeout(pendingStateSaveTimer);
  }
  pendingStateSaveTimer = window.setTimeout(() => {
    pendingStateSaveTimer = 0;
    saveState().catch(() => {});
  }, delay);
}

function flushScheduledStateSave() {
  if (!pendingStateSaveTimer) return;
  window.clearTimeout(pendingStateSaveTimer);
  pendingStateSaveTimer = 0;
  saveState().catch(() => {});
}

function exportStateFile() {
  const exported = {
    ...normalizeState(state),
    updatedAt: String(Date.now())
  };
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "site-state.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function refreshStateFromServer() {
  if (staticStateMode) return;
  if (document.hidden) return;
  if (draggingTravelId) return;

  try {
    const response = await fetch(apiStateUrl, {
      cache: "no-store",
      headers: buildStateRequestHeaders()
    });
    if (response.status === 304) {
      document.body.classList.remove("offline-state");
      return;
    }
    if (!response.ok) throw new Error("state refresh failed");
    const incoming = normalizeState(await response.json());
    if (incoming.updatedAt && incoming.updatedAt !== state.updatedAt) {
      Object.assign(state, incoming);
      localStorage.setItem(storageKey, JSON.stringify(state));
      lastPersistedStateSignature = getStateSyncSignature(state);
      applyAllState();
      syncOpenEditor();
    } else {
      lastPersistedStateSignature = getStateSyncSignature(state);
    }
    document.body.classList.remove("offline-state");
  } catch {
    document.body.classList.add("offline-state");
  }
}

function applyAllState() {
  applyNames();
  applyEditableContent();
  updateTogetherTime();
  renderWishes();
  renderContentEntries();
  renderCapsules();
  renderTravelMap();
  refreshSettingsForm();
  refreshPhotos();
  renderPhotoEntries();
  renderTodayMemories();
  refreshEntryFilters();
  checkCapsuleUnlockAlerts();
  scheduleNextCapsuleUnlockAlert();
  window.requestAnimationFrame(focusDeepLinkedMemory);
}

function navigateWithTransition(url, direction = -1) {
  document.body.style.setProperty("--page-exit-x", `${direction * 22}px`);
  document.body.classList.add("page-leaving");
  window.setTimeout(() => {
    window.location.href = url;
  }, 230);
}

function focusDeepLinkedMemory() {
  if (!window.location.hash) return;
  const rawHash = window.location.hash.slice(1);
  const hash = decodeURIComponent(rawHash);
  if (!hash || focusedMemoryHash === hash) return;
  const target = document.getElementById(hash);
  if (!target) return;

  focusedMemoryHash = hash;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("is-memory-focused");
  window.setTimeout(() => {
    target.classList.remove("is-memory-focused");
  }, 1800);
}

function isLoggedIn() {
  return isGuestMode() || sessionStorage.getItem(authKey) === "yes";
}

function isEditorMode() {
  return !isGuestMode() && isLoggedIn() && Boolean(sessionStorage.getItem(editTokenKey));
}

function canEdit() {
  return isEditorMode();
}

function isGuestMode() {
  return sessionStorage.getItem(guestKey) === "yes";
}

function activateGuestModeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("guest") !== "1" && params.get("mode") !== "guest") return;
  sessionStorage.setItem(guestKey, "yes");
  sessionStorage.setItem(authKey, "yes");
  sessionStorage.removeItem(editTokenKey);
}

function setEditorMode(enabled) {
  if (enabled) {
    sessionStorage.setItem(authKey, "yes");
    sessionStorage.removeItem(guestKey);
  } else closeEditor();

  const guest = isGuestMode();
  document.body.classList.toggle("guest-mode", guest);
  document.body.classList.toggle("editor-mode", enabled);
  document.body.classList.toggle("viewer-mode", !enabled);
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.textContent = enabled ? "\u9000\u51fa\u7f16\u8f91" : "\u7f16\u8f91";
    button.setAttribute("aria-label", enabled ? "\u9000\u51fa\u7f16\u8f91\u6a21\u5f0f" : "\u8f93\u5165\u7f16\u8f91\u5bc6\u7801");
  });
}

function guardPage() {
  if (page === "login" || isLoggedIn()) return true;
  window.location.replace("login.html");
  return false;
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function applyNames() {
  const cleanA = state.nameA.trim() || defaults.nameA;
  const cleanB = state.nameB.trim() || defaults.nameB;
  setText(els.heroNameA, cleanA);
  setText(els.footerNameA, cleanA);
  setText(els.heroNameB, cleanB);
  setText(els.footerNameB, cleanB);
  document.title = page === "home"
    ? `${cleanA} & ${cleanB}`
    : document.title.replace(/^.*?\|/, `${cleanA} & ${cleanB} |`);
}

function updateTogetherTime() {
  if (!els.days || !els.hours || !els.minutes || !els.seconds) return;

  const start = new Date(`${state.startDate}T${state.startTime || defaults.startTime}`);
  const now = new Date();
  const diff = Math.max(0, now - start);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  els.days.textContent = String(days);
  els.hours.textContent = String(hours).padStart(2, "0");
  els.minutes.textContent = String(minutes).padStart(2, "0");
  els.seconds.textContent = String(seconds).padStart(2, "0");
}

function getEntrySortTime(entry) {
  if (!entry) return 0;
  if (entry.visitDate) {
    const time = new Date(entry.visitDate).getTime();
    if (!Number.isNaN(time)) return time;
  }
  return Number(entry.updatedAt) || getTimeFromId(entry.id);
}

function latestFirstEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => ({ entry, index, time: getEntrySortTime(entry) }))
    .sort((a, b) => b.time - a.time || a.index - b.index);
}

function renderTodayMemories() {
  if (!els.todayMemoryList) return;

  const today = new Date();
  const memories = getTodayMemories(today);
  const featured = getFeaturedTodayMemory(memories);
  const dateText = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(today);
  if (els.todayMemoryDate) {
    els.todayMemoryDate.textContent = `\u4eca\u5929\u662f ${dateText}\uff0c\u81ea\u52a8\u56de\u770b\u5f80\u5e74\u4eca\u5929\u7684\u6545\u4e8b\u3001\u76f8\u518c\u3001\u65c5\u884c\u548c\u788e\u788e\u5ff5\u3002`;
  }
  if (els.todayMemoryCount) {
    els.todayMemoryCount.textContent = `${memories.length} \u6761\u56de\u5fc6`;
  }
  renderTodayMemoryPrompt(featured, dateText);

  els.todayMemoryList.innerHTML = "";
  if (!memories.length) {
    const empty = document.createElement("p");
    empty.className = "today-memory-empty";
    empty.textContent = "\u5f80\u5e74\u4eca\u5929\u8fd8\u6ca1\u6709\u7559\u4e0b\u8bb0\u5f55\uff0c\u7b49\u65f6\u95f4\u518d\u5411\u524d\u8d70\u4e00\u70b9\uff0c\u8fd9\u91cc\u5c31\u4f1a\u81ea\u52a8\u4eae\u8d77\u6765\u3002";
    els.todayMemoryList.appendChild(empty);
    return;
  }

  memories.forEach((memory) => {
    const card = document.createElement(memory.href ? "a" : "article");
    card.className = `today-memory-card is-${memory.type}`;
    if (memory.href) {
      card.href = memory.href;
      card.setAttribute("aria-label", `\u53bb\u770b${memory.label}\uff1a${memory.title}`);
    }
    const imageHtml = memory.image
      ? `<img src="${escapeAttribute(memory.image)}" alt="" style="object-position: ${memory.imagePosition.x}% ${memory.imagePosition.y}%;">`
      : "";
    card.innerHTML = `
      <div class="today-memory-meta">
        <span>${escapeHtml(memory.label)}</span>
        <time>${escapeHtml(formatMemoryDate(memory.date))}</time>
      </div>
      ${imageHtml}
      <h3>${escapeHtml(memory.title)}</h3>
      <p>${escapeHtml(memory.text)}</p>
      ${memory.href ? `<span class="today-memory-link">\u53bb\u770b\u770b</span>` : ""}
    `;
    els.todayMemoryList.appendChild(card);
  });
}

function renderTodayMemoryPrompt(memory, dateText) {
  if (!els.todayMemoryPrompt) return;
  if (!memory) {
    els.todayMemoryPrompt.hidden = false;
    els.todayMemoryPrompt.removeAttribute("href");
    els.todayMemoryPrompt.classList.add("is-empty");
    els.todayMemoryPrompt.querySelector("span").textContent = "\u4eca\u5929\u8fd8\u5728\u7b49\u5f85";
    els.todayMemoryPrompt.querySelector("strong").textContent = `${dateText} \u8fd8\u6ca1\u6709\u5f80\u5e74\u7684\u8bb0\u5f55\uff0c\u7b49\u4eca\u5929\u88ab\u8bb0\u5f55\u4e0b\u6765\uff0c\u660e\u5e74\u7684\u8fd9\u91cc\u5c31\u4f1a\u4eae\u8d77\u6765\u3002`;
    els.todayMemoryPrompt.querySelector("em").textContent = "\u5148\u53bb\u5199\u4e00\u6761\u65b0\u7684\u56de\u5fc6";
    return;
  }

  els.todayMemoryPrompt.hidden = false;
  els.todayMemoryPrompt.href = memory.href || "#";
  els.todayMemoryPrompt.classList.remove("is-empty");
  els.todayMemoryPrompt.querySelector("span").textContent = `${memory.ageText}\u7684\u4eca\u5929`;
  els.todayMemoryPrompt.querySelector("strong").textContent = createTodayMemorySentence(memory);
  els.todayMemoryPrompt.querySelector("em").textContent = `\u53bb${memory.label}\u91cc\u770b\u770b`;
}

function getFeaturedTodayMemory(memories) {
  return [...memories].sort((a, b) => {
    const imageScore = Number(Boolean(b.image)) - Number(Boolean(a.image));
    if (imageScore) return imageScore;
    return b.text.length - a.text.length || b.date.getTime() - a.date.getTime();
  })[0] || null;
}

function createTodayMemorySentence(memory) {
  const subject = memory.type === "notes"
    ? "\u4f60\u4eec\u7559\u4e0b\u4e86\u4e00\u53e5\u5f88\u60f3\u5ff5\u7684\u8bdd"
    : memory.type === "album"
      ? "\u4f60\u4eec\u628a\u8fd9\u4e00\u523b\u5b58\u8fdb\u4e86\u7167\u7247\u5899"
      : memory.type === "travel"
        ? "\u4f60\u4eec\u628a\u4e00\u4e2a\u5730\u65b9\u5199\u8fdb\u4e86\u5730\u56fe"
        : "\u4f60\u4eec\u8ba4\u771f\u8bb0\u4e0b\u4e86\u4e00\u4e2a\u7247\u6bb5";
  return `${memory.ageText}\u7684\u4eca\u5929\uff0c${subject}\uff1a${memory.title}`;
}

function getTodayMemories(today = new Date()) {
  const todayKey = getMonthDayKey(today);
  const currentYear = today.getFullYear();
  const configs = [
    {
      type: "story",
      label: "\u6545\u4e8b",
      href: "story.html",
      getEntries: () => state.contentEntries.story || [],
      getDate: (entry) => parseMemoryDate(entry.time) || parseMemoryDate(entry.updatedAt),
      getTitle: (entry) => entry.title || "\u90a3\u5929\u7684\u6545\u4e8b",
      getText: (entry) => entry.text || ""
    },
    {
      type: "storyTimeline",
      label: "\u6545\u4e8b",
      href: "story.html",
      getEntries: () => state.contentEntries.storyTimeline || [],
      getDate: (entry) => parseMemoryDate(entry.eventDate) || parseMemoryDate(entry.updatedAt),
      getTitle: (entry) => entry.title || "\u90a3\u5929\u7684\u91cd\u8981\u65f6\u523b",
      getText: (entry) => entry.text || ""
    },
    {
      type: "notes",
      label: "\u788e\u788e\u5ff5",
      href: "notes.html",
      getEntries: () => state.contentEntries.notes || [],
      getDate: (entry) => parseMemoryDate(entry.time) || parseMemoryDate(entry.updatedAt),
      getTitle: () => "\u90a3\u5929\u7684\u788e\u788e\u5ff5",
      getText: (entry) => entry.text || ""
    },
    {
      type: "album",
      label: "\u76f8\u518c",
      href: "album.html",
      getEntries: () => state.photoEntries || [],
      getDate: (entry) => parseMemoryDate(entry.updatedAt),
      getTitle: (entry) => entry.caption || "\u90a3\u5929\u7684\u7167\u7247",
      getText: (entry) => entry.content || "\u6709\u4e00\u5f20\u7167\u7247\uff0c\u66ff\u4f60\u4eec\u8bb0\u4f4f\u4e86\u90a3\u5929\u7684\u5149\u3002"
    },
    {
      type: "travel",
      label: "\u65c5\u884c\u5730\u56fe",
      href: "travel.html",
      getEntries: () => state.travelEntries || [],
      getDate: (entry) => parseMemoryDate(entry.visitDate) || parseMemoryDate(entry.updatedAt),
      getTitle: (entry) => entry.place || "\u90a3\u5929\u7684\u5730\u65b9",
      getText: (entry) => entry.note || "\u4e00\u4e2a\u5730\u540d\uff0c\u4e00\u6bb5\u4f60\u4eec\u4e00\u8d77\u8d70\u8fc7\u7684\u8def\u3002"
    }
  ];

  return configs
    .flatMap((config) => {
      return config.getEntries().map((entry, index) => {
        const date = config.getDate(entry);
        return { config, entry, index, date };
      });
    })
    .filter(({ date }) => {
      return date
        && date.getFullYear() < currentYear
        && getMonthDayKey(date) === todayKey;
    })
    .map(({ config, entry, index, date }) => ({
      type: config.type,
      label: config.label,
      href: getTodayMemoryHref(config.href, entry),
      date,
      ageText: getMemoryAgeText(currentYear - date.getFullYear()),
      index,
      image: entry.image || entry.photo || "",
      imagePosition: normalizePhotoPosition(entry.imagePosition || entry.position),
      title: getPlainText(config.getTitle(entry), 36),
      text: getPlainText(config.getText(entry), 110) || "\u8fd9\u4e00\u5929\u7684\u7ec6\u8282\uff0c\u90fd\u6536\u5728\u90a3\u65f6\u7684\u5fc3\u60c5\u91cc\u3002"
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime() || a.index - b.index);
}

function getTodayMemoryHref(pagePath, entry) {
  if (!pagePath) return "";
  return `${pagePath}#memory-${encodeURIComponent(entry.id)}`;
}

function getMemoryAgeText(years) {
  if (years <= 1) return "\u53bb\u5e74";
  return `${years}\u5e74\u524d`;
}

function parseMemoryDate(value) {
  if (!value) return null;
  if (typeof value === "number" || /^\d{11,}$/.test(String(value))) {
    const date = new Date(Number(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthDayKey(date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMemoryDate(value) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(value);
}

function getPlainText(value, maxLength = 120) {
  const template = document.createElement("template");
  template.innerHTML = sanitizeEditableHtml(value);
  const text = (template.content.textContent || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}\u2026`;
}

function getTimeFromId(id) {
  const match = String(id || "").match(/-(\d{11,})-/);
  return match ? Number(match[1]) : 0;
}

function keepAddControlsAtBottom() {
  document.querySelectorAll("[data-content-form]").forEach((form) => {
    if (form.closest(".story-form-column")) return;
    const type = form.dataset.contentForm;
    const list = document.querySelector(`[data-content-list="${type}"]`);
    const section = list?.closest(".section");
    if (!list || !section) return;

    const defaultList = Array.from(section.children).find((child) => {
      if (child === form || child === list) return false;
      return (
        child.classList.contains("timeline-page") ||
        child.classList.contains("daily-grid") ||
        child.classList.contains("notes-grid")
      ) && !child.classList.contains("content-entry-list");
    });
    if (defaultList && defaultList.previousElementSibling !== list) {
      defaultList.insertAdjacentElement("beforebegin", list);
    }
    if (section.lastElementChild !== form) {
      section.appendChild(form);
    }
  });

  if (els.albumPhotoForm && els.albumPhotoList) {
    const section = els.albumPhotoList.closest(".section");
    const defaultList = section?.querySelector(".photo-grid-page:not(.content-entry-list):not(.legacy-album-slots)");
    if (defaultList && defaultList.previousElementSibling !== els.albumPhotoList) {
      defaultList.insertAdjacentElement("beforebegin", els.albumPhotoList);
    }
    if (section && section.lastElementChild !== els.albumPhotoForm) {
      section.appendChild(els.albumPhotoForm);
    }
  }

  if (els.wishForm && els.wishList && els.wishList.nextElementSibling !== els.wishForm) {
    els.wishList.insertAdjacentElement("afterend", els.wishForm);
  }
}

function initEntryFilters() {
  [
    { type: "story", listSelector: '[data-content-list="story"]', placeholder: "\u641c\u7d22\u6545\u4e8b\u6807\u9898\u6216\u5185\u5bb9" },
    { type: "notes", listSelector: '[data-content-list="notes"]', placeholder: "\u641c\u7d22\u788e\u788e\u5ff5" },
    { type: "album", listSelector: "#albumPhotoList", placeholder: "\u641c\u7d22\u7167\u7247\u6807\u9898\u6216\u5185\u5bb9" }
  ].forEach((config) => {
    const list = document.querySelector(config.listSelector);
    if (!list || document.querySelector(`[data-entry-filter="${config.type}"]`)) return;

    const filter = document.createElement("div");
    filter.className = "memory-filter";
    filter.dataset.entryFilter = config.type;
    filter.innerHTML = `
      <label class="memory-filter-search">
        <span>\u641c\u7d22</span>
        <input type="search" data-entry-filter-search placeholder="${escapeAttribute(config.placeholder)}" autocomplete="off">
      </label>
      <label class="memory-filter-month">
        <span>\u5e74\u6708</span>
        <select data-entry-filter-month aria-label="\u6309\u5e74\u6708\u7b5b\u9009">
          <option value="">\u5168\u90e8\u65f6\u95f4</option>
        </select>
      </label>
      <button type="button" data-entry-filter-clear>\u6e05\u7a7a</button>
      <p data-entry-filter-status></p>
    `;
    list.insertAdjacentElement("beforebegin", filter);

    const search = filter.querySelector("[data-entry-filter-search]");
    const month = filter.querySelector("[data-entry-filter-month]");
    const clear = filter.querySelector("[data-entry-filter-clear]");
    search.addEventListener("input", () => {
      entryFilterState[config.type].query = search.value.trim().toLowerCase();
      renderFilteredEntryList(config.type);
    });
    month.addEventListener("change", () => {
      entryFilterState[config.type].month = month.value;
      renderFilteredEntryList(config.type);
    });
    clear.addEventListener("click", () => {
      entryFilterState[config.type] = { query: "", month: "" };
      search.value = "";
      month.value = "";
      renderFilteredEntryList(config.type);
    });
  });

  renderContentEntries("story");
  renderContentEntries("notes");
  renderPhotoEntries();
}

function renderFilteredEntryList(type) {
  if (type === "album") {
    renderPhotoEntries();
  } else {
    renderContentEntries(type);
  }
}

function refreshEntryFilters() {
  ["story", "notes"].forEach((type) => refreshEntryFilter(type, state.contentEntries[type] || []));
  refreshEntryFilter("album", state.photoEntries || []);
}

function refreshEntryFilter(type, entries) {
  const filter = document.querySelector(`[data-entry-filter="${type}"]`);
  if (!filter) return;
  const search = filter.querySelector("[data-entry-filter-search]");
  const month = filter.querySelector("[data-entry-filter-month]");
  const current = entryFilterState[type] || { query: "", month: "" };
  if (search && search.value !== current.query) search.value = current.query;
  if (!month) return;

  const months = getEntryFilterMonths(type, entries);
  const options = [`<option value="">\u5168\u90e8\u65f6\u95f4</option>`].concat(months.map((value) => {
    return `<option value="${escapeAttribute(value)}">${escapeHtml(formatEntryFilterMonth(value))}</option>`;
  }));
  month.innerHTML = options.join("");
  if (months.includes(current.month)) {
    month.value = current.month;
  } else {
    current.month = "";
    month.value = "";
  }
}

function updateEntryFilterStatus(type, visibleCount, totalCount) {
  const filter = document.querySelector(`[data-entry-filter="${type}"]`);
  if (!filter) return;
  const current = entryFilterState[type] || { query: "", month: "" };
  const active = Boolean(current.query || current.month);
  filter.classList.toggle("is-filtering", active);
  const status = filter.querySelector("[data-entry-filter-status]");
  const clear = filter.querySelector("[data-entry-filter-clear]");
  if (clear) clear.hidden = !active;
  if (status) {
    status.textContent = active
      ? `\u5df2\u627e\u5230 ${visibleCount} / ${totalCount} \u6761`
      : `\u5171 ${totalCount} \u6761`;
  }
}

function filterEntries(type, entries) {
  const current = entryFilterState[type] || { query: "", month: "" };
  const query = current.query.trim().toLowerCase();
  return (entries || []).filter((entry) => {
    if (current.month && getEntryFilterMonth(type, entry) !== current.month) return false;
    if (!query) return true;
    return getEntrySearchText(type, entry).toLowerCase().includes(query);
  });
}

function getEntrySearchText(type, entry) {
  if (type === "album") {
    return [entry.caption, entry.content].filter(Boolean).join(" ");
  }
  if (type === "story") {
    return [entry.time, entry.title, entry.text].filter(Boolean).join(" ");
  }
  if (type === "notes") {
    return [formatNoteEntryDate(entry), entry.text].filter(Boolean).join(" ");
  }
  return "";
}

function getEntryFilterMonths(type, entries) {
  return [...new Set((entries || []).map((entry) => getEntryFilterMonth(type, entry)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
}

function getEntryFilterMonth(type, entry) {
  const date = getEntryFilterDate(type, entry);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getEntryFilterDate(type, entry) {
  if (type === "album") return parseEntryFilterDate(entry?.updatedAt);
  if (type === "story") return parseEntryFilterDate(entry?.time) || parseEntryFilterDate(entry?.updatedAt);
  if (type === "notes") return parseEntryFilterDate(entry?.updatedAt) || parseEntryFilterDate(entry?.time);
  return null;
}

function parseEntryFilterDate(value) {
  if (!value) return null;
  if (typeof value === "number" || /^\d{11,}$/.test(String(value))) {
    const date = new Date(Number(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{4})(?:[-/.\u5e74]\s*)(\d{1,2})(?:[-/.\u6708]\s*(\d{1,2}))?/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3] || 1), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatEntryFilterMonth(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  return `${match[1]}\u5e74${Number(match[2])}\u6708`;
}

function renderWishes() {
  if (!els.wishList) return;

  els.wishList.innerHTML = "";
  latestFirstEntries(state.wishes).forEach(({ entry: wish, index }) => {
    const li = document.createElement("li");
    li.className = wish.done ? "done wish-edit-scope" : "wish-edit-scope";

    const editable = canEdit();
    const check = document.createElement("button");
    check.className = "check";
    check.type = "button";
    check.textContent = wish.done ? "\u2713" : "\u25cb";
    check.disabled = !editable;
    check.setAttribute("aria-label", editable
      ? (wish.done ? "\u6807\u8bb0\u4e3a\u672a\u5b8c\u6210" : "\u6807\u8bb0\u4e3a\u5b8c\u6210")
      : (wish.done ? "\u5df2\u5b8c\u6210" : "\u672a\u5b8c\u6210"));
    check.addEventListener("click", async () => {
      if (!canEdit()) return;
      toggleWishDone(index);
      renderWishes();
      scheduleStateSave();
    });

    const text = document.createElement("span");
    text.className = "wish-body";
    const wishText = document.createElement("span");
    wishText.innerHTML = sanitizeEditableHtml(wish.text);
    const wishStatus = document.createElement("span");
    wishStatus.className = wish.done ? "wish-status is-complete" : "wish-status";
    wishStatus.textContent = "\u5df2\u5b8c\u6210";
    wishStatus.hidden = !wish.done;
    const wishTime = document.createElement("small");
    wishTime.className = wish.done && wish.doneAt ? "wish-time is-complete" : "wish-time";
    wishTime.textContent = getWishTimeText(wish);
    text.append(wishText, wishStatus, wishTime);

    const edit = document.createElement("button");
    edit.className = "wish-edit";
    edit.type = "button";
    edit.textContent = "\u7f16";
    edit.setAttribute("aria-label", "\u7f16\u8f91\u613f\u671b");
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!canEdit()) return;
      openWishEditor(li, index);
    });

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "\u00d7";
    remove.setAttribute("aria-label", "\u5220\u9664\u613f\u671b");
    remove.addEventListener("click", async () => {
      if (!canEdit()) return;
      state.wishes.splice(index, 1);
      renderWishes();
      scheduleStateSave();
    });

    li.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      if (!canEdit()) return;
      openWishEditor(li, index);
    });

    li.append(check, text, edit, remove);
    els.wishList.appendChild(li);
  });
}

function toggleWishDone(index) {
  const wish = state.wishes[index];
  if (!wish) return;
  const nextDone = !wish.done;
  const now = Date.now();
  wish.done = nextDone;
  wish.doneAt = nextDone ? now : "";
  wish.updatedAt = now;
}

function getWishTimeText(wish) {
  if (wish?.done && wish.doneAt) {
    return `\u5B8C\u6210\u65F6\u95F4\uFF1A${formatEditTime(wish.doneAt)}`;
  }
  return wish?.updatedAt ? `\u7F16\u8F91\u65F6\u95F4\uFF1A${formatEditTime(wish.updatedAt)}` : "";
}

function initPhotos() {
  document.querySelectorAll("[data-photo]").forEach((input) => {
    const card = input.closest(".photo-card");
    if (card && !card.querySelector("[data-fixed-photo-position]")) {
      const button = document.createElement("button");
      button.className = "photo-position-button";
      button.type = "button";
      button.dataset.fixedPhotoPosition = input.dataset.photo;
      button.textContent = "展示区域";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openFixedPhotoPositionEditor(Number(input.dataset.photo));
      });
      card.appendChild(button);
    }

    input.addEventListener("change", async () => {
      if (!canEdit()) {
        input.value = "";
        return;
      }
      const file = input.files[0];
      if (!file) return;

      try {
        const index = Number(input.dataset.photo);
        state.photos[index] = await storeImageFile(file);
        state.photoPositions[index] = normalizePhotoPosition(state.photoPositions[index]);
        refreshPhotos();
        await saveState();
        openFixedPhotoPositionEditor(index);
      } catch {
        input.value = "";
      }
    });
  });

  initAlbumPhotoForm();
}

function refreshPhotos() {
  document.querySelectorAll("[data-photo-preview]").forEach((img) => {
    const index = Number(img.dataset.photoPreview);
    if (state.photos[index]) {
      img.src = state.photos[index];
      const position = normalizePhotoPosition(state.photoPositions[index]);
      img.style.objectPosition = `${position.x}% ${position.y}%`;
      img.parentElement.classList.add("has-image");
    } else {
      img.removeAttribute("src");
      img.style.objectPosition = "";
      img.parentElement.classList.remove("has-image");
    }
  });
}

function openFixedPhotoPositionEditor(index) {
  if (!canEdit()) return;
  if (!state.photos[index]) return;
  openPhotoPositionEditor({
    title: "选择展示区域",
    src: state.photos[index],
    position: state.photoPositions[index],
    onSave: async (position) => {
      state.photoPositions[index] = normalizePhotoPosition(position);
      refreshPhotos();
      await saveState();
    }
  });
}

function openPhotoEntryPositionEditor(id) {
  if (!canEdit()) return;
  const entry = state.photoEntries.find((item) => item.id === id);
  if (!entry?.photo) return;
  openPhotoPositionEditor({
    title: "选择展示区域",
    src: entry.photo,
    position: entry.position,
    onSave: async (position) => {
      entry.position = normalizePhotoPosition(position);
      entry.updatedAt = Date.now();
      renderPhotoEntries();
      await saveState();
    }
  });
}

function openPhotoPreview(src, title = "", content = "") {
  if (!src) return;
  const modal = document.createElement("div");
  modal.className = "photo-preview-modal";
  modal.innerHTML = `
    <div class="photo-preview-panel" role="dialog" aria-modal="true" aria-label="照片预览">
      <img src="${escapeAttribute(src)}" alt="${escapeAttribute(title || "照片预览")}">
      <div class="photo-preview-caption">
        <strong>${escapeHtml(title || "回忆照片")}</strong>
        <span>${escapeHtml(content || "")}</span>
      </div>
    </div>
  `;
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  const close = () => {
    modal.remove();
    document.removeEventListener("keydown", onKey);
  };

  modal.addEventListener("click", close);
  modal.querySelector(".photo-preview-panel").addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("keydown", onKey);
  document.body.appendChild(modal);
}

function openPhotoPositionEditor({ title, src, position, onSave }) {
  const current = normalizePhotoPosition(position);
  const modal = document.createElement("div");
  modal.className = "photo-position-modal";
  modal.innerHTML = `
    <div class="photo-position-panel" role="dialog" aria-modal="true" aria-label="${escapeAttribute(title)}">
      <div class="photo-position-head">
        <strong>${escapeHtml(title)}</strong>
        <button type="button" data-photo-position-close>关闭</button>
      </div>
      <div class="photo-position-preview">
        <img src="${escapeAttribute(src)}" alt="照片展示区域预览">
      </div>
      <label class="photo-position-range">
        <span>左右</span>
        <input type="range" min="0" max="100" value="${current.x}" data-photo-position-x>
      </label>
      <label class="photo-position-range">
        <span>上下</span>
        <input type="range" min="0" max="100" value="${current.y}" data-photo-position-y>
      </label>
      <div class="photo-position-actions">
        <button type="button" data-photo-position-close>取消</button>
        <button type="button" data-photo-position-save>保存展示区域</button>
      </div>
    </div>
  `;

  const image = modal.querySelector("img");
  const xInput = modal.querySelector("[data-photo-position-x]");
  const yInput = modal.querySelector("[data-photo-position-y]");
  const apply = () => {
    image.style.objectPosition = `${xInput.value}% ${yInput.value}%`;
  };
  const close = () => modal.remove();

  xInput.addEventListener("input", apply);
  yInput.addEventListener("input", apply);
  modal.querySelectorAll("[data-photo-position-close]").forEach((button) => {
    button.addEventListener("click", close);
  });
  modal.querySelector("[data-photo-position-save]").addEventListener("click", async () => {
    await onSave({ x: Number(xInput.value), y: Number(yInput.value) });
    close();
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  document.body.appendChild(modal);
  apply();
  xInput.focus();
}

function initAlbumPhotoForm() {
  if (!els.albumPhotoForm) return;

  els.albumPhotoOpen?.addEventListener("click", () => {
    if (!canEdit()) return;
    resetAlbumPhotoForm();
    els.albumPhotoForm.hidden = false;
    els.albumPhotoForm.scrollIntoView({ behavior: "smooth", block: "center" });
    els.albumPhotoCaption?.focus();
  });

  els.albumPhotoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canEdit()) return;
    const editingId = els.albumPhotoForm.dataset.editingId;
    const existing = editingId ? state.photoEntries.find((item) => item.id === editingId) : null;
    const caption = sanitizeEditableHtml(els.albumPhotoCaption.value.trim());
    const content = sanitizeEditableHtml(els.albumPhotoContent?.value.trim() || "");
    const file = els.albumPhotoInput.files[0];
    const hasNewPhoto = Boolean(file);
    let photo = existing?.photo || "";

    if (file) photo = await storeImageFile(file);
    if (!photo) {
      setAlbumPhotoMessage("请先选择一张照片。");
      return;
    }

    const entry = {
      id: editingId || `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      caption: caption || existing?.caption || "新的照片",
      content,
      photo,
      position: hasNewPhoto ? normalizePhotoPosition() : normalizePhotoPosition(existing?.position),
      updatedAt: fromDatetimeLocal(document.getElementById("albumPhotoUpdatedAt")?.value) || Date.now()
    };

    if (editingId) {
      const index = state.photoEntries.findIndex((item) => item.id === editingId);
      if (index >= 0) {
        state.photoEntries[index] = entry;
      } else {
        state.photoEntries.unshift(entry);
      }
    } else {
      state.photoEntries.unshift(entry);
    }

    resetAlbumPhotoForm();
    renderPhotoEntries();
    await saveState();
    setAlbumPhotoMessage(editingId ? "已保存修改。" : "已新增照片。");
    if (hasNewPhoto && entry.photo) openPhotoEntryPositionEditor(entry.id);
  });

  els.albumPhotoForm.querySelector("[data-album-photo-cancel]")?.addEventListener("click", () => {
    resetAlbumPhotoForm();
    setAlbumPhotoMessage("");
    els.albumPhotoForm.hidden = true;
  });

  els.albumPhotoForm.querySelector("[data-album-photo-delete]")?.addEventListener("click", async () => {
    const editingId = els.albumPhotoForm.dataset.editingId;
    if (!editingId) return;
    if (!confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u5f20\u7167\u7247\u5417\uff1f\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\u3002")) return;
    state.photoEntries = state.photoEntries.filter((item) => item.id !== editingId);
    resetAlbumPhotoForm();
    renderPhotoEntries();
    await saveState();
    setAlbumPhotoMessage("\u5df2\u5220\u9664\u3002");
  });
}

function renderPhotoEntries() {
  if (!els.albumPhotoList) return;
  els.albumPhotoList.innerHTML = "";

  const sourceEntries = state.photoEntries || [];
  refreshEntryFilter("album", sourceEntries);
  const filteredEntries = filterEntries("album", sourceEntries);
  const entries = latestFirstEntries(filteredEntries);
  updateEntryFilterStatus("album", filteredEntries.length, sourceEntries.length);
  if (els.albumPhotoCount) {
    els.albumPhotoCount.textContent = filteredEntries.length === sourceEntries.length
      ? `${sourceEntries.length} \u5f20\u7167\u7247`
      : `${filteredEntries.length} / ${sourceEntries.length} \u5f20\u7167\u7247`;
  }
  if (!sourceEntries.length) {
    els.albumPhotoList.innerHTML = `<p class="album-empty">还没有照片，输入编辑密码后添加第一张回忆。</p>`;
    return;
  }
  if (!filteredEntries.length) {
    els.albumPhotoList.innerHTML = `<p class="album-empty">\u6ca1\u6709\u627e\u5230\u5339\u914d\u7684\u7167\u7247\u3002</p>`;
    return;
  }

  entries.forEach(({ entry }) => {
    const card = document.createElement("article");
    card.className = entry.photo ? "photo-card photo-entry-card has-image" : "photo-card photo-entry-card";
    card.id = `memory-${entry.id}`;
    const position = normalizePhotoPosition(entry.position);
    card.innerHTML = `
      <img src="${escapeAttribute(entry.photo || "")}" alt="${escapeAttribute(entry.caption || "新增照片")}" style="object-position: ${position.x}% ${position.y}%;">
      <span><b>${sanitizeEditableHtml(entry.caption || "新的照片")}</b><em>${sanitizeEditableHtml(entry.content || "")}</em></span>
      <small class="module-edit-time">${entry.updatedAt ? `\u7F16\u8F91\u65F6\u95F4\uFF1A${formatEditTime(entry.updatedAt)}` : ""}</small>
      <div class="content-entry-actions photo-entry-actions">
        <button type="button" data-photo-entry-edit="${escapeAttribute(entry.id)}">\u7f16\u8f91</button>
        <button type="button" data-photo-entry-position="${escapeAttribute(entry.id)}">展示区域</button>
        <button type="button" data-photo-entry-delete="${escapeAttribute(entry.id)}">\u5220\u9664</button>
      </div>
    `;
    card.querySelector("[data-photo-entry-edit]").addEventListener("click", () => editPhotoEntry(entry.id));
    card.querySelector("[data-photo-entry-position]").addEventListener("click", () => openPhotoEntryPositionEditor(entry.id));
    card.querySelector("[data-photo-entry-delete]").addEventListener("click", async () => {
      if (!canEdit()) return;
      state.photoEntries = state.photoEntries.filter((item) => item.id !== entry.id);
      renderPhotoEntries();
      await saveState();
    });
    if (entry.photo) {
      card.addEventListener("click", (event) => {
        if (event.target.closest("button, label, input")) return;
        openPhotoPreview(entry.photo, entry.caption, entry.content);
      });
    }
    els.albumPhotoList.appendChild(card);
  });
}

function editPhotoEntry(id) {
  if (!canEdit()) return;
  const entry = state.photoEntries.find((item) => item.id === id);
  if (!els.albumPhotoForm || !entry) return;
  els.albumPhotoForm.hidden = false;
  els.albumPhotoForm.dataset.editingId = id;
  els.albumPhotoCaption.value = entry.caption || "";
  if (els.albumPhotoContent) els.albumPhotoContent.value = entry.content || "";
  els.albumPhotoInput.value = "";
  els.albumPhotoForm.querySelector("[data-album-photo-cancel]")?.removeAttribute("hidden");
  els.albumPhotoForm.querySelector("[data-album-photo-delete]")?.removeAttribute("hidden");
  els.albumPhotoForm.querySelector("[data-edit-time-field]")?.removeAttribute("hidden");
  const updatedAtInput = document.getElementById("albumPhotoUpdatedAt");
  if (updatedAtInput) updatedAtInput.value = toDatetimeLocal(entry.updatedAt || Date.now());
  els.albumPhotoForm.querySelector('button[type="submit"]')?.replaceChildren(document.createTextNode("\u4fdd\u5b58\u4fee\u6539"));
  setAlbumPhotoMessage(entry.updatedAt ? `上次编辑：${formatEditTime(entry.updatedAt)}` : "");
  els.albumPhotoForm.scrollIntoView({ behavior: "smooth", block: "center" });
  els.albumPhotoCaption.focus();
}

function resetAlbumPhotoForm() {
  if (!els.albumPhotoForm) return;
  els.albumPhotoForm.reset();
  els.albumPhotoForm.hidden = true;
  delete els.albumPhotoForm.dataset.editingId;
  els.albumPhotoForm.querySelector("[data-album-photo-cancel]")?.setAttribute("hidden", "");
  els.albumPhotoForm.querySelector("[data-album-photo-delete]")?.setAttribute("hidden", "");
  els.albumPhotoForm.querySelector("[data-edit-time-field]")?.setAttribute("hidden", "");
  const updatedAtInput = document.getElementById("albumPhotoUpdatedAt");
  if (updatedAtInput) updatedAtInput.value = "";
  els.albumPhotoForm.querySelector('button[type="submit"]')?.replaceChildren(document.createTextNode("\u65b0\u589e\u7167\u7247"));
}

function setAlbumPhotoMessage(message) {
  if (els.albumPhotoMessage) els.albumPhotoMessage.textContent = message;
}

function initTravelMap() {
  if (!els.travelPlaceForm) return;

  resetTravelForm();

  renderProvinceLabels();
  if (window.chinaCityIndex) {
    chinaAreaIndex = unpackChinaCityIndex(window.chinaCityIndex);
    populateTravelPlaceOptions();
  }
  chinaAreaIndexPromise = loadChinaAreaIndex();

  document.querySelectorAll("[data-travel-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTravelFilter = button.dataset.travelFilter || "all";
      renderTravelMap();
    });
  });

  els.travelPhoto?.addEventListener("change", () => {
    const trigger = document.querySelector(".travel-photo-field b");
    if (trigger) trigger.textContent = els.travelPhoto.files[0] ? "\u5df2\u9009\u62e9\u7167\u7247" : "\u9009\u62e9\u7167\u7247";
  });

  els.travelPlaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canEdit()) return;
    const placeName = els.travelPlaceInput.value.trim();
    showTravelMessage("\u6b63\u5728\u67e5\u627e\u5730\u70b9...");
    const place = await resolveTravelPlace(placeName);
    if (!place) {
      showTravelMessage("\u6682\u65f6\u6ca1\u6709\u627e\u5230\u8fd9\u4e2a\u5730\u70b9\u3002\u8bf7\u8f93\u5165\u66f4\u5b8c\u6574\u7684\u540d\u79f0\uff0c\u6bd4\u5982\u201c\u6d59\u6c5f\u7701\u676d\u5dde\u5e02\u897f\u6e56\u201d\u3002");
      els.travelPlaceInput.focus();
      return;
    }

    const placeDisplayName = getTravelPlaceDisplayName(place.name);
    const editingEntry = editingTravelId ? state.travelEntries.find((item) => item.id === editingTravelId) : null;
    const duplicateEntry = state.travelEntries.find((item) => {
      if (item.id === editingTravelId) return false;
      return item.place === place.name || getTravelPlaceDisplayName(item.place) === placeDisplayName;
    });
    const entry = {
      id: editingEntry?.id || duplicateEntry?.id || `travel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      place: placeDisplayName,
      status: els.travelStatus.value,
      note: els.travelNote.value.trim(),
      photo: editingEntry?.photo || duplicateEntry?.photo || "",
      position: normalizePhotoPosition(editingEntry?.position || duplicateEntry?.position),
      x: place.x,
      y: place.y,
      visitDate: document.getElementById("travelVisitDate")?.value || "",
      updatedAt: Date.now()
    };

    const file = els.travelPhoto.files[0];
    if (file) {
      entry.photo = await storeImageFile(file);
    }

    state.travelEntries = [entry, ...state.travelEntries.filter((item) => {
      if (item.id === editingEntry?.id || item.id === duplicateEntry?.id) return false;
      return getTravelPlaceDisplayName(item.place) !== entry.place;
    })];
    renderTravelMap();
    await saveState();
    resetTravelForm();
    showTravelMessage(`${editingEntry ? "\u5df2\u4fdd\u5b58" : "\u5df2\u6807\u8bb0"}\uff1a${getTravelPlaceDisplayName(entry.place)}`);
    if (file && entry.photo) {
      openPhotoPositionEditor({
        title: "选择展示区域",
        src: entry.photo,
        position: entry.position,
        onSave: async (position) => {
          const savedEntry = state.travelEntries.find((item) => item.id === entry.id);
          if (!savedEntry) return;
          savedEntry.position = normalizePhotoPosition(position);
          savedEntry.updatedAt = Date.now();
          renderTravelMap();
          await saveState();
        }
      });
    }
  });

  els.travelPlaceForm.querySelector("[data-travel-cancel]")?.addEventListener("click", () => {
    resetTravelForm();
    showTravelMessage("");
  });

  els.travelPlaceForm.querySelector("[data-travel-delete-entry]")?.addEventListener("click", async () => {
    if (!editingTravelId) return;
    if (!confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u4e2a\u5730\u70b9\u5417\uff1f\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\u3002")) return;
    state.travelEntries = state.travelEntries.filter((item) => item.id !== editingTravelId);
    renderTravelMap();
    resetTravelForm();
    await saveState();
    showTravelMessage("\u5df2\u5220\u9664\u3002");
  });
}

function resetTravelForm() {
  editingTravelId = null;
  els.travelPlaceForm?.reset();
  if (els.travelStatus) els.travelStatus.value = "visited";
  document.querySelector(".travel-photo-field b")?.replaceChildren(document.createTextNode("\u9009\u62e9\u7167\u7247"));
  els.travelPlaceForm?.classList.remove("is-editing-entry");
  els.travelPlaceForm?.querySelector('button[type="submit"]')?.replaceChildren(document.createTextNode("\u6dfb\u52a0\u5230\u5730\u56fe"));
  els.travelPlaceForm?.querySelector("[data-travel-cancel]")?.setAttribute("hidden", "");
  els.travelPlaceForm?.querySelector("[data-travel-delete-entry]")?.setAttribute("hidden", "");
  const visitDateInput = document.getElementById("travelVisitDate");
  if (visitDateInput) {
    const today = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    visitDateInput.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }
}

function unpackChinaCityIndex(rows) {
  return (rows || []).map((row) => ({
    name: row[0],
    shortName: row[1],
    fullName: row[2],
    lon: row[3],
    lat: row[4],
    level: row[5],
    keys: []
  }));
}

function populateTravelPlaceOptions() {
  if (!els.travelPlaceOptions) return;
  const existing = new Set(chinaPlaces.map((place) => place.name));
  const baseOptions = chinaPlaces.map((place) => `<option value="${escapeAttribute(place.name)}"></option>`).join("");
  const extraOptions = chinaAreaIndex
    .filter((item) => !existing.has(item.name) && item.level >= 2)
    .slice(0, 3500)
    .map((item) => `<option value="${escapeAttribute(item.fullName)}"></option>`)
    .join("");
  els.travelPlaceOptions.innerHTML = baseOptions + extraOptions;
}

async function loadChinaAreaIndex() {
  try {
    const response = await fetch("assets/china-region-index.json", { cache: "force-cache" });
    if (!response.ok) return;
    const data = await response.json();
    const items = Array.isArray(data)
      ? data.filter((item) => item && item.name && item.fullName && Number.isFinite(Number(item.lon)) && Number.isFinite(Number(item.lat)))
      : [];
    if (items.length) {
      chinaAreaIndex = items;
      populateTravelPlaceOptions();
      renderTravelMap();
    }
  } catch {
    // Keep the embedded index so search still works offline.
  }
}

async function resolveTravelPlace(value) {
  const query = String(value || "").trim();
  if (!query) return null;
  if (chinaAreaIndexPromise) await chinaAreaIndexPromise;

  const localPlace = findChinaPlace(query);
  if (localPlace) return localPlace;

  const area = findChinaArea(query);
  if (area) {
    return placeFromCoordinates(getChinaAreaDisplayName(area), area.lon, area.lat);
  }

  return await geocodeChinaPlace(query, query);
}

function getChinaAreaDisplayName(area) {
  if (!area) return "";
  return formatTravelPlaceSegment(area.name || area.shortName || area.fullName || "");
}

function findChinaArea(value) {
  const queries = getChinaAreaQueryVariants(value);
  if (!queries.length || !chinaAreaIndex.length) return null;
  const exact = chinaAreaIndex.find((item) => {
    const keys = getChinaAreaKeys(item);
    return queries.some((query) => keys.includes(query));
  });
  if (exact) return exact;

  const matches = chinaAreaIndex
    .map((item) => ({ item, score: scoreChinaAreaMatch(item, queries) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.item.fullName.length - b.item.fullName.length);

  return matches[0]?.item || null;
}

function getChinaAreaKeys(item) {
  if (Array.isArray(item.keys) && item.keys.length) return item.keys;
  return [item.name, item.shortName, item.fullName].map(normalizeChinaAreaQuery).filter(Boolean);
}

function normalizeChinaAreaQuery(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·.]/g, "");
}

function simplifyChinaAreaQuery(value) {
  return normalizeChinaAreaQuery(value)
    .replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|自治县|自治旗|地区|市辖区|省|市|区|县|旗|盟/g, "");
}

function stripChinaAdminSuffix(value) {
  let output = String(value || "").trim();
  let previous = "";
  while (output && output !== previous) {
    previous = output;
    output = output.replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|自治县|自治旗|地区|市辖区|省|市|区|县|旗|盟$/g, "");
  }
  return output;
}

function formatTravelPlaceSegment(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/(区|县|旗)$/.test(raw)) return raw;
  return stripChinaAdminSuffix(raw);
}

function getLastChinaAreaSegment(value) {
  const raw = String(value || "").trim();
  const boundaries = ["特别行政区", "维吾尔自治区", "壮族自治区", "回族自治区", "自治区", "自治州", "地区", "省", "市", "盟"];
  let start = 0;

  boundaries.forEach((boundary) => {
    let index = raw.indexOf(boundary);
    while (index !== -1) {
      const end = index + boundary.length;
      if (end < raw.length && end > start) start = end;
      index = raw.indexOf(boundary, end);
    }
  });

  return raw.slice(start) || raw;
}

function getTravelPlaceDisplayName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const area = chinaAreaIndex.find((item) => item.fullName === raw || item.name === raw || item.shortName === raw);
  if (area) return getChinaAreaDisplayName(area);

  return formatTravelPlaceSegment(getLastChinaAreaSegment(raw));
}

function getChinaAreaQueryVariants(value) {
  return [...new Set([
    normalizeChinaAreaQuery(value),
    simplifyChinaAreaQuery(value)
  ].filter(Boolean))];
}

function isOrderedChinaAreaMatch(fullName, query) {
  if (query.length < 4) return false;
  let index = 0;
  for (const char of query) {
    index = fullName.indexOf(char, index);
    if (index === -1) return false;
    index += 1;
  }
  return true;
}

function scoreChinaAreaMatch(item, queries) {
  const keys = getChinaAreaKeys(item);
  const fullName = normalizeChinaAreaQuery(item.fullName);
  const simpleFullName = simplifyChinaAreaQuery(item.fullName);
  const name = normalizeChinaAreaQuery(item.name);
  const shortName = normalizeChinaAreaQuery(item.shortName);
  let score = 0;

  queries.forEach((query) => {
    if (fullName.endsWith(query) || simpleFullName.endsWith(query)) score = Math.max(score, 70);
    if (name.includes(query)) score = Math.max(score, 60);
    if (shortName.includes(query)) score = Math.max(score, 55);
    if (keys.some((key) => key.includes(query))) score = Math.max(score, 45);
    if (fullName.includes(query) || simpleFullName.includes(query)) score = Math.max(score, 35);
    if (isOrderedChinaAreaMatch(simpleFullName, query)) score = Math.max(score, 25);
  });

  return score;
}

async function geocodeChinaPlace(query, displayName) {
  try {
    const local = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (local.ok) {
      const payload = await local.json();
      if (payload.ok) {
        return placeFromCoordinates(displayName || query, payload.lon, payload.lat);
      }
    }
  } catch {
    // Fall through to direct geocoding below.
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cn&accept-language=zh-CN&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const results = await response.json();
    const result = Array.isArray(results) ? results[0] : null;
    if (!result || !result.lat || !result.lon) return null;

    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < 15 || lat > 55 || lon < 70 || lon > 140) return null;

    return placeFromCoordinates(displayName || query, lon, lat);
  } catch {
    return null;
  }
}

function placeFromCoordinates(name, lon, lat) {
  const point = geoToMapPoint(Number(lon), Number(lat));
  return {
    name,
    x: point.x,
    y: point.y,
    aliases: []
  };
}

function geoToMapPoint(lon, lat) {
  // These coefficients align geographic coordinates to the projection in china-map.svg.
  // A simple longitude/latitude rectangle puts eastern cities noticeably out at sea.
  const longitude = Number(lon);
  const latitude = Number(lat);
  const x = (1.3439371576 * longitude)
    + (0.9864447782 * latitude)
    - (0.0130768338 * longitude * latitude)
    + (0.0034245799 * longitude * longitude)
    + (0.0009262255 * latitude * latitude)
    - 115.4704688122;
  const y = (-0.7781898905 * longitude)
    + (0.2806731686 * latitude)
    - (0.0084730301 * longitude * latitude)
    + (0.0047197343 * longitude * longitude)
    - (0.0285455959 * latitude * latitude)
    + 143.7452124943;
  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(4, Math.min(96, y))
  };
}

function getTravelMarkerPoint(entry) {
  const knownPlace = findChinaPlace(entry.place);
  if (knownPlace) return knownPlace;

  const area = findChinaArea(entry.place);
  if (area) return placeFromCoordinates(area.name, area.lon, area.lat);

  return { x: entry.x, y: entry.y };
}

function renderProvinceLabels() {
  if (!els.chinaProvinceLabels) return;

  els.chinaProvinceLabels.innerHTML = "";
  chinaProvinceLabels.forEach((label) => {
    const item = document.createElement("span");
    item.className = "province-label";
    item.style.left = `${label.x}%`;
    item.style.top = `${label.y}%`;
    item.innerHTML = `<strong>${escapeHtml(label.name)}</strong><small>${escapeHtml(label.capital)}</small>`;
    els.chinaProvinceLabels.appendChild(item);
  });
}

function renderTravelMap() {
  if (!els.chinaMapMarkers && !els.travelEntryList) return;

  const entries = latestFirstEntries(state.travelEntries).map(({ entry }) => entry);
  const visibleEntries = activeTravelFilter === "all"
    ? entries
    : entries.filter((entry) => entry.status === activeTravelFilter);
  if (els.chinaMapMarkers) {
    els.chinaMapMarkers.innerHTML = "";
    entries.forEach((entry) => {
      const displayName = getTravelPlaceDisplayName(entry.place);
      const point = getTravelMarkerPoint(entry);
      const marker = document.createElement("button");
      marker.className = `china-marker is-${entry.status}`;
      marker.type = "button";
      marker.style.left = `${point.x}%`;
      marker.style.top = `${point.y}%`;
      marker.innerHTML = `<span></span><strong>${escapeHtml(displayName)}</strong>`;
      marker.setAttribute("aria-label", `${displayName}${travelStatusLabels[entry.status]}`);
      marker.addEventListener("click", () => focusTravelEntry(entry.id));
      els.chinaMapMarkers.appendChild(marker);
    });
  }

  if (els.travelEntryList) {
    els.travelEntryList.innerHTML = visibleEntries.length ? "" : `<p class="travel-empty">这个分类里还没有地点，换一个标签看看，或添加新的旅行计划。</p>`;
    visibleEntries.forEach((entry, index) => {
      const displayName = getTravelPlaceDisplayName(entry.place);
      const card = document.createElement("article");
      card.className = `travel-entry-card is-${entry.status}`;
      card.id = `memory-${entry.id}`;
      card.dataset.travelEntry = entry.id;
      card.dataset.travelIndex = String(index);
      card.innerHTML = `
        <button class="travel-drag-handle" type="button" data-travel-drag="${escapeAttribute(entry.id)}" aria-label="\u62d6\u52a8\u6392\u5e8f">\u2630</button>
        <div class="travel-entry-photo ${entry.photo ? "has-photo" : ""}">
          ${entry.photo ? `<img src="${escapeAttribute(entry.photo)}" alt="${escapeAttribute(displayName)}\u7684\u65c5\u884c\u7167\u7247" style="object-position: ${normalizePhotoPosition(entry.position).x}% ${normalizePhotoPosition(entry.position).y}%;">` : `<span>\u6dfb\u52a0\u7167\u7247</span>`}
        </div>
        <div class="travel-entry-body">
          <span>${travelStatusLabels[entry.status]}</span>
          <h3>${escapeHtml(displayName)}</h3>
          <p>${escapeHtml(entry.note || "\u8fd8\u6ca1\u6709\u5199\u4e0b\u6587\u5b57\u3002")}</p>
          <small class="travel-visit-date">${entry.visitDate ? `\u6765\u5230\u8fd9\u91cc\u7684\u65F6\u95F4\uFF1A${entry.visitDate}` : ""}</small>
          <div class="travel-entry-actions">
            <button type="button" data-travel-move="${escapeAttribute(entry.id)}" data-travel-direction="-1" ${index === 0 ? "disabled" : ""}>\u4e0a\u79fb</button>
            <button type="button" data-travel-move="${escapeAttribute(entry.id)}" data-travel-direction="1" ${index === visibleEntries.length - 1 ? "disabled" : ""}>\u4e0b\u79fb</button>
            <button type="button" data-travel-edit="${escapeAttribute(entry.id)}">\u7f16\u8f91</button>
            <label>
              <input type="file" accept="image/*" data-travel-photo="${escapeAttribute(entry.id)}">
              \u6362\u7167\u7247
            </label>
            ${entry.photo ? `<button type="button" data-travel-position="${escapeAttribute(entry.id)}">\u5c55\u793a\u533a\u57df</button>` : ""}
            <button type="button" data-travel-delete="${escapeAttribute(entry.id)}">\u5220\u9664</button>
          </div>
        </div>
      `;
      els.travelEntryList.appendChild(card);
    });

    els.travelEntryList.querySelectorAll("[data-travel-move]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!canEdit()) return;
        await moveTravelEntry(button.dataset.travelMove, Number(button.dataset.travelDirection));
      });
    });

    els.travelEntryList.querySelectorAll("[data-travel-drag]").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => {
        if (canEdit()) startTravelEntryDrag(event);
      });
    });

    els.travelEntryList.querySelectorAll("[data-travel-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!canEdit()) return;
        const entry = state.travelEntries.find((item) => item.id === button.dataset.travelEdit);
        if (!entry) return;
        editingTravelId = entry.id;
        els.travelPlaceInput.value = getTravelPlaceDisplayName(entry.place);
        els.travelStatus.value = entry.status;
        els.travelNote.value = entry.note;
        els.travelPlaceForm.classList.add("is-editing-entry");
        els.travelPlaceForm.querySelector('button[type="submit"]')?.replaceChildren(document.createTextNode("\u4fdd\u5b58\u4fee\u6539"));
        els.travelPlaceForm.querySelector("[data-travel-cancel]")?.removeAttribute("hidden");
        els.travelPlaceForm.querySelector("[data-travel-delete-entry]")?.removeAttribute("hidden");
        const visitDateInput = document.getElementById("travelVisitDate");
        if (visitDateInput) visitDateInput.value = entry.visitDate || "";
        document.querySelector(".travel-photo-field b")?.replaceChildren(document.createTextNode(entry.photo ? "\u4fdd\u7559\u539f\u7167\u7247" : "\u9009\u62e9\u7167\u7247"));
        els.travelPlaceForm.scrollIntoView({ behavior: "smooth", block: "center" });
        els.travelPlaceInput.focus();
        showTravelMessage(`\u6b63\u5728\u7f16\u8f91\uff1a${getTravelPlaceDisplayName(entry.place)}\uff0c\u4fdd\u5b58\u540e\u4f1a\u8986\u76d6\u539f\u8bb0\u5f55\u3002`);
      });
    });

    els.travelEntryList.querySelectorAll("[data-travel-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!canEdit()) return;
        const id = button.dataset.travelDelete;
        state.travelEntries = state.travelEntries.filter((entry) => entry.id !== id);
        renderTravelMap();
        await saveState();
      });
    });

    els.travelEntryList.querySelectorAll("[data-travel-photo]").forEach((input) => {
      input.addEventListener("change", async () => {
        if (!canEdit()) {
          input.value = "";
          return;
        }
        const file = input.files[0];
        if (!file) return;
        const entry = state.travelEntries.find((item) => item.id === input.dataset.travelPhoto);
        if (!entry) return;
        entry.photo = await storeImageFile(file);
        entry.position = normalizePhotoPosition(entry.position);
        entry.updatedAt = Date.now();
        renderTravelMap();
        await saveState();
      });
    });

    els.travelEntryList.querySelectorAll("[data-travel-position]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!canEdit()) return;
        const entry = state.travelEntries.find((item) => item.id === button.dataset.travelPosition);
        if (!entry?.photo) return;
        openPhotoPositionEditor({
          title: "选择展示区域",
          src: entry.photo,
          position: entry.position,
          onSave: async (position) => {
            entry.position = normalizePhotoPosition(position);
            entry.updatedAt = Date.now();
            renderTravelMap();
            await saveState();
          }
        });
      });
    });
  }

  const counts = entries.reduce((total, entry) => {
    total[entry.status] = (total[entry.status] || 0) + 1;
    return total;
  }, {});
  if (els.travelVisitedCount) els.travelVisitedCount.textContent = String(counts.visited || 0);
  if (els.travelWishlistCount) els.travelWishlistCount.textContent = String(counts.wishlist || 0);
  if (els.travelNextCount) els.travelNextCount.textContent = String(counts.next || 0);
  if (els.travelAllCount) els.travelAllCount.textContent = String(entries.length);
  if (els.travelRecordCount) els.travelRecordCount.textContent = `${visibleEntries.length} 个地点`;

  document.querySelectorAll("[data-travel-filter]").forEach((button) => {
    const isActive = button.dataset.travelFilter === activeTravelFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const nextEntry = entries.find((entry) => entry.status === "next") || entries.find((entry) => entry.status === "wishlist");
  if (els.travelNextPlace) els.travelNextPlace.textContent = nextEntry ? getTravelPlaceDisplayName(nextEntry.place) : "下一次出发";
  if (els.travelNextNote) els.travelNextNote.textContent = nextEntry?.note || "选一个想去很久的地方，订下属于你们的下一站。";
  if (els.travelNextStatus) els.travelNextStatus.textContent = nextEntry ? travelStatusLabels[nextEntry.status] : "NEXT";
}

async function moveTravelEntry(id, direction) {
  if (!canEdit()) return;
  const index = state.travelEntries.findIndex((entry) => entry.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.travelEntries.length) return;

  const nextEntries = [...state.travelEntries];
  const [entry] = nextEntries.splice(index, 1);
  nextEntries.splice(nextIndex, 0, entry);
  state.travelEntries = nextEntries;
  renderTravelMap();
  await saveState();
  showTravelMessage("\u5730\u70b9\u987a\u5e8f\u5df2\u66f4\u65b0\u3002");
}

async function applyTravelEntryOrder(ids) {
  if (!canEdit()) return;
  const current = new Map(state.travelEntries.map((entry) => [entry.id, entry]));
  const ordered = ids.map((id) => current.get(id)).filter(Boolean);
  const leftovers = state.travelEntries.filter((entry) => !ids.includes(entry.id));
  if (!ordered.length) return;

  state.travelEntries = [...ordered, ...leftovers];
  renderTravelMap();
  await saveState();
  showTravelMessage("\u5730\u70b9\u987a\u5e8f\u5df2\u4fdd\u5b58\u3002");
}

function startTravelEntryDrag(event) {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  const handle = event.currentTarget;
  const card = handle.closest("[data-travel-entry]");
  if (!card || !els.travelEntryList) return;

  draggingTravelId = card.dataset.travelEntry;
  card.classList.add("is-dragging");
  els.travelEntryList.classList.add("is-sorting");
  handle.setPointerCapture?.(event.pointerId);
  event.preventDefault();

  const move = (moveEvent) => {
    if (!draggingTravelId) return;
    const draggingCard = els.travelEntryList.querySelector(".travel-entry-card.is-dragging");
    if (!draggingCard) return;

    const siblings = [...els.travelEntryList.querySelectorAll(".travel-entry-card:not(.is-dragging)")];
    const afterCard = siblings.find((item) => {
      const rect = item.getBoundingClientRect();
      return moveEvent.clientY < rect.top + rect.height / 2;
    });
    els.travelEntryList.insertBefore(draggingCard, afterCard || null);
  };

  const finish = async () => {
    if (!draggingTravelId) return;
    draggingTravelId = null;
    const orderedIds = [...els.travelEntryList.querySelectorAll("[data-travel-entry]")]
      .map((item) => item.dataset.travelEntry)
      .filter(Boolean);
    els.travelEntryList.classList.remove("is-sorting");
    els.travelEntryList.querySelectorAll(".travel-entry-card.is-dragging").forEach((item) => item.classList.remove("is-dragging"));
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
    await applyTravelEntryOrder(orderedIds);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", finish);
}

function findChinaPlace(value) {
  const query = String(value || "").trim().toLowerCase();
  if (!query) return null;
  return chinaPlaces.find((place) => {
    return place.name.toLowerCase() === query || place.aliases.some((alias) => alias.toLowerCase() === query);
  }) || chinaPlaces.find((place) => {
    return place.name.includes(value.trim()) || place.aliases.some((alias) => alias.toLowerCase().includes(query));
  }) || null;
}

function focusTravelEntry(id) {
  const card = document.querySelector(`[data-travel-entry="${CSS.escape(id)}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("is-focused");
  window.setTimeout(() => card.classList.remove("is-focused"), 1100);
}

function showTravelMessage(message) {
  if (!els.travelFormMessage) return;
  els.travelFormMessage.textContent = message;
}

function readFileAsDataUrl(file) {
  return prepareImageBlob(file).then(blobToDataUrl);
}

async function storeImageFile(file) {
  const blob = await prepareImageBlob(file);
  return uploadImageBlob(blob);
}

async function prepareImageBlob(file, options = {}) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("invalid image file");
  }

  const settings = {
    maxWidth: options.maxWidth || 1600,
    maxHeight: options.maxHeight || 1600,
    quality: options.quality || 0.82,
    type: options.type || "image/jpeg"
  };
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(sourceUrl);
    const ratio = Math.min(1, settings.maxWidth / image.naturalWidth, settings.maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, settings.type, settings.quality);
    if (!blob) throw new Error("image compression failed");
    return blob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", reject, { once: true });
    image.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(value) {
  const match = String(value || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: match[1] });
}

async function uploadImageBlob(blob) {
  try {
    const response = await fetch(apiImagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": blob.type || "image/jpeg",
        "X-Edit-Token": sessionStorage.getItem(editTokenKey) || ""
      },
      body: blob
    });
    if (!response.ok) throw new Error("image upload failed");
    const payload = await response.json();
    if (payload?.src) return String(payload.src);
  } catch {
    // Static/offline copies cannot accept file uploads, so keep a compressed
    // inline image as a graceful fallback.
  }
  return blobToDataUrl(blob);
}

async function moveInlineImagesToUploads(target) {
  const seen = new Map();

  const moveValue = async (value) => {
    if (typeof value !== "string" || !value.startsWith("data:image/")) return value;
    if (seen.has(value)) return seen.get(value);
    const blob = dataUrlToBlob(value);
    if (!blob) return value;
    const next = await uploadImageBlob(blob);
    seen.set(value, next);
    return next;
  };

  const walk = async (value) => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        value[index] = await walk(value[index]);
      }
      return value;
    }
    if (value && typeof value === "object") {
      for (const key of Object.keys(value)) {
        value[key] = await walk(value[key]);
      }
      return value;
    }
    return moveValue(value);
  };

  await walk(target);
}

function initForms() {
  if (els.loginForm) {
    const isEditorLogin = new URLSearchParams(window.location.search).get("mode") === "editor";
    const label = els.loginCode.closest("label")?.querySelector("span");
    if (isEditorLogin) {
      if (label) label.textContent = "编辑暗号";
      document.querySelector("#loginModeEyebrow")?.replaceChildren(document.createTextNode("EDITOR ACCESS"));
      document.querySelector("#loginModeDescription")?.replaceChildren(document.createTextNode("请输入编辑暗号，进入编辑模式。"));
      document.querySelector("#loginModeSubmit")?.replaceChildren(document.createTextNode("进入编辑模式"));
    }

    els.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const code = els.loginCode.value.trim();
      const continueToHome = () => {
        sessionStorage.removeItem(guestKey);
        sessionStorage.setItem(authKey, "yes");
        const returnTo = sessionStorage.getItem("editor-return-to") || "index.html";
        sessionStorage.removeItem("editor-return-to");
        navigateWithTransition(returnTo);
      };
      try {
        const response = await fetch(isEditorLogin ? apiAuthUrl : apiLoginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });
        const payload = await response.json();
        if (response.ok && payload.ok && (!isEditorLogin || payload.token)) {
          if (isEditorLogin) {
            sessionStorage.removeItem(guestKey);
            sessionStorage.setItem(authKey, "yes");
            sessionStorage.setItem(editTokenKey, payload.token);
            setEditorMode(true);
            const returnTo = sessionStorage.getItem("editor-return-to") || "index.html";
            sessionStorage.removeItem("editor-return-to");
            navigateWithTransition(returnTo);
          } else {
            continueToHome();
          }
          return;
        }
      } catch {
        // Fall through to the same generic login error.
      }

      // Static copies can be opened without the local API server. Use the
      // exported state so changed access codes keep working offline.
      if (!isEditorLogin && code === (state.accessCode || defaults.accessCode)) {
        continueToHome();
        return;
      }

      // Offline editor fallback: when the server is unavailable, accept the
      // exported edit code so editing still works on static copies.
      if (isEditorLogin && code === (state.editCode || defaults.editCode)) {
        sessionStorage.removeItem(guestKey);
        sessionStorage.setItem(authKey, "yes");
        sessionStorage.setItem(editTokenKey, "offline-" + Date.now());
        setEditorMode(true);
        const returnTo = sessionStorage.getItem("editor-return-to") || "index.html";
        sessionStorage.removeItem("editor-return-to");
        navigateWithTransition(returnTo);
        return;
      }

      els.loginError.textContent = "\u6697\u53f7\u4e0d\u5bf9\uff0c\u518d\u8bd5\u4e00\u6b21\u3002";
      els.loginCode.select();
    });
  }

  if (els.settingsForm) {
    els.settingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canEdit()) return;
      state.nameA = els.nameA.value.trim() || defaults.nameA;
      state.nameB = els.nameB.value.trim() || defaults.nameB;
      state.startDate = els.startDate.value || defaults.startDate;
      state.startTime = els.startTime.value || defaults.startTime;
      state.accessCode = els.loginCodeSetting.value.trim() || defaults.accessCode;
      applyNames();
      updateTogetherTime();
      await saveState();
    });
  }

  document.querySelector("[data-export-state]")?.addEventListener("click", exportStateFile);
  els.copyGuestLink?.addEventListener("click", copyGuestShareLink);

  if (els.wishForm) {
    els.wishForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canEdit()) return;
      const text = els.wishInput.value.trim();
      if (!text) return;
      state.wishes.unshift({ text: sanitizeEditableHtml(text), done: false, doneAt: "", updatedAt: Date.now() });
      els.wishInput.value = "";
      renderWishes();
      scheduleStateSave();
    });
  }

  initContentForms();
  initCapsulePage();
}

function createGuestShareLink() {
  const url = new URL("index.html", window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("guest", "1");
  return url.href;
}

async function copyGuestShareLink(event) {
  const button = event.currentTarget;
  const originalText = button.textContent;
  const link = createGuestShareLink();
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    window.prompt("复制访客链接", link);
  }
  button.textContent = "已复制访客链接";
  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1800);
}

function initContentForms() {
  Object.entries(contentEntryConfig).forEach(([type, config]) => {
    const form = document.querySelector(config.formSelector);
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canEdit()) return;
      const entry = readContentEntryForm(type, form);
      if (!entry) {
        setContentFormMessage(form, "\u5148\u5199\u4e00\u70b9\u5185\u5bb9\u518d\u4fdd\u5b58\u3002");
        return;
      }

      // Handle new image upload if present
      if (entry._imageFile) {
        try {
          entry.image = await storeImageFile(entry._imageFile);
          entry.imagePosition = form.dataset.currentImagePosition
            ? normalizePhotoPosition(JSON.parse(form.dataset.currentImagePosition))
            : normalizePhotoPosition();
        } catch {
          setContentFormMessage(form, "\u56fe\u7247\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002");
          return;
        }
        delete entry._imageFile;
      }

      const editingId = form.dataset.editingId;
      const entries = state.contentEntries[type] || [];
      const customUpdatedAt = fromDatetimeLocal(form.elements.updatedAt?.value);
      const updatedAt = customUpdatedAt || Date.now();
      if (type === "notes") entry.time = formatNoteDate(updatedAt);
      if (editingId) {
        const index = entries.findIndex((item) => item.id === editingId);
        if (index >= 0) {
          entries[index] = { ...entries[index], ...entry, id: editingId, updatedAt };
        } else {
          entries.unshift({ ...entry, updatedAt });
        }
      } else {
        entries.unshift({ ...entry, updatedAt });
      }

      state.contentEntries[type] = entries;
      resetContentEntryForm(type, form);
      renderContentEntries(type);
      await saveState();
      setContentFormMessage(form, editingId ? "\u5df2\u4fdd\u5b58\u4fee\u6539\u3002" : "\u5df2\u65b0\u589e\u3002");
    });

    form.querySelector("[data-content-cancel]")?.addEventListener("click", () => {
      resetContentEntryForm(type, form);
      setContentFormMessage(form, "");
    });

    form.querySelector("[data-content-delete-entry]")?.addEventListener("click", async () => {
      const editingId = form.dataset.editingId;
      if (!editingId) return;
      if (!confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u6761\u5417\uff1f\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\u3002")) return;
      state.contentEntries[type] = (state.contentEntries[type] || []).filter((item) => item.id !== editingId);
      resetContentEntryForm(type, form);
      renderContentEntries(type);
      await saveState();
      setContentFormMessage(form, "\u5df2\u5220\u9664\u3002");
    });

    // Image upload handling
    const imageUpload = form.querySelector('[data-image-upload]');
    if (imageUpload) {
      const imageInput = imageUpload.querySelector('[data-image-input]');
      const imageSelect = imageUpload.querySelector('[data-image-select]');
      const imagePosition = imageUpload.querySelector('[data-image-position]');
      const imageRemove = imageUpload.querySelector('[data-image-remove]');

      imageSelect?.addEventListener('click', () => imageInput?.click());

      imageInput?.addEventListener('change', async () => {
        const file = imageInput.files[0];
        if (!file) return;
        try {
          const previewSrc = await readFileAsDataUrl(file);
          updateContentEntryImagePreview(imageUpload, previewSrc);
          form.dataset.currentImage = previewSrc;
          delete form.dataset.currentImagePosition;
          delete form.dataset.imageRemoved;
        } catch {
          imageInput.value = "";
        }
      });

      imagePosition?.addEventListener('click', () => {
        const src = form.dataset.currentImage;
        if (!src) return;
        openPhotoPositionEditor({
          title: "调整图片展示区域",
          src,
          position: form.dataset.currentImagePosition
            ? JSON.parse(form.dataset.currentImagePosition)
            : normalizePhotoPosition(),
          onSave: (position) => {
            form.dataset.currentImagePosition = JSON.stringify(position);
          }
        });
      });

      imageRemove?.addEventListener('click', () => {
        if (imageInput) imageInput.value = "";
        form.dataset.currentImage = "";
        delete form.dataset.currentImagePosition;
        form.dataset.imageRemoved = "yes";
        updateContentEntryImagePreview(imageUpload, "");
      });
    }
  });
}

function initCapsulePage() {
  const form = document.querySelector("[data-capsule-form]");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canEdit()) return;
    const title = String(form.elements.title?.value || "").trim();
    const text = String(form.elements.text?.value || "").trim();
    const unlockAt = fromDatetimeLocal(form.elements.unlockAt?.value);
    if (!title || !text || !unlockAt) {
      setCapsuleFormMessage(form, "请填写标题、信件内容和开启时间。");
      return;
    }

    const editingId = form.dataset.editingId;
    const updatedAt = fromDatetimeLocal(form.elements.updatedAt?.value) || Date.now();
    const capsule = {
      id: editingId || `capsule-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: sanitizeEditableHtml(title),
      text: sanitizeEditableHtml(text),
      unlockAt,
      createdAt: editingId
        ? (state.capsules.find((item) => item.id === editingId)?.createdAt || updatedAt)
        : updatedAt,
      updatedAt
    };
    const capsules = state.capsules || [];
    const index = capsules.findIndex((item) => item.id === editingId);
    if (index >= 0) capsules[index] = capsule;
    else capsules.unshift(capsule);
    state.capsules = capsules;
    forgetCapsuleAlertState(capsule.id);
    resetCapsuleForm(form);
    renderCapsules();
    checkCapsuleUnlockAlerts();
    scheduleNextCapsuleUnlockAlert();
    await saveState();
    setCapsuleFormMessage(form, editingId ? "已保存修改。" : "时间胶囊已封存。");
  });

  form.querySelector("[data-capsule-cancel]")?.addEventListener("click", () => {
    resetCapsuleForm(form);
    setCapsuleFormMessage(form, "");
  });
  form.querySelector("[data-capsule-delete-entry]")?.addEventListener("click", async () => {
    const editingId = form.dataset.editingId;
    if (!editingId || !canEdit()) return;
    if (!confirm("确定删除这封时间胶囊吗？删除后无法恢复。")) return;
    state.capsules = (state.capsules || []).filter((item) => item.id !== editingId);
    forgetCapsuleAlertState(editingId);
    resetCapsuleForm(form);
    renderCapsules();
    checkCapsuleUnlockAlerts();
    scheduleNextCapsuleUnlockAlert();
    await saveState();
    setCapsuleFormMessage(form, "已删除。");
  });

  window.setInterval(renderCapsules, 1000);
}

function setCapsuleFormMessage(form, message) {
  const target = form?.querySelector("[data-capsule-message]");
  if (target) target.textContent = message;
}

function resetCapsuleForm(form = document.querySelector("[data-capsule-form]")) {
  if (!form) return;
  form.reset();
  delete form.dataset.editingId;
  form.classList.remove("is-editing-entry");
  form.querySelector("[data-capsule-cancel]")?.setAttribute("hidden", "");
  form.querySelector("[data-capsule-delete-entry]")?.setAttribute("hidden", "");
  form.querySelector("[data-edit-time-field]")?.setAttribute("hidden", "");
  form.querySelector('button[type="submit"]')?.replaceChildren(document.createTextNode("封存时间胶囊"));
}

function formatCapsuleDate(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "时间待定";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function readStoredIdSet(key) {
  try {
    const values = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(values) ? values.map((value) => String(value)) : []);
  } catch {
    return new Set();
  }
}

function writeStoredIdSet(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify([...values]));
  } catch {
    // Alerts still work for this page view when storage is unavailable.
  }
}

function forgetCapsuleAlertState(id) {
  [capsuleDismissedKey, capsuleNotifiedKey].forEach((key) => {
    const values = readStoredIdSet(key);
    values.delete(String(id));
    writeStoredIdSet(key, values);
  });
}

function getUnlockedCapsuleAlerts(now = Date.now()) {
  const dismissed = readStoredIdSet(capsuleDismissedKey);
  return [...(state.capsules || [])]
    .filter((entry) => {
      const id = String(entry?.id || "");
      return id && Number(entry.unlockAt) <= now && !dismissed.has(id);
    })
    .sort((a, b) => Number(b.unlockAt) - Number(a.unlockAt));
}

function getCapsulePageUrl() {
  const url = new URL("daily.html", window.location.href);
  if (isGuestMode()) url.searchParams.set("guest", "1");
  return url.href;
}

function checkCapsuleUnlockAlerts() {
  if (page === "login" || !isLoggedIn()) return;
  const entries = getUnlockedCapsuleAlerts();
  if (!entries.length) {
    hideCapsuleUnlockBanner();
    scheduleNextCapsuleUnlockAlert();
    return;
  }
  showCapsuleUnlockBanner(entries);
  notifyUnlockedCapsules(entries);
  scheduleNextCapsuleUnlockAlert();
}

function scheduleNextCapsuleUnlockAlert() {
  window.clearTimeout(capsuleUnlockTimer);
  if (page === "login" || !isLoggedIn()) return;

  const now = Date.now();
  const dismissed = readStoredIdSet(capsuleDismissedKey);
  const nextUnlock = [...(state.capsules || [])]
    .filter((entry) => {
      const id = String(entry?.id || "");
      return id && Number(entry.unlockAt) > now && !dismissed.has(id);
    })
    .sort((a, b) => Number(a.unlockAt) - Number(b.unlockAt))[0];

  if (!nextUnlock) return;
  const maxDelay = 2_147_483_647;
  const delay = Math.max(1000, Math.min(Number(nextUnlock.unlockAt) - now + 500, maxDelay));
  capsuleUnlockTimer = window.setTimeout(checkCapsuleUnlockAlerts, delay);
}

function showCapsuleUnlockBanner(entries) {
  const latest = entries[0];
  const countText = entries.length > 1 ? `${entries.length} 封时间胶囊已解锁` : "有一封时间胶囊已解锁";
  const title = String(latest.title || "写给未来的信").trim();
  let banner = document.querySelector("[data-capsule-alert]");
  if (!banner) {
    banner = document.createElement("section");
    banner.className = "capsule-unlock-banner";
    banner.dataset.capsuleAlert = "";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    document.body.appendChild(banner);
  }

  const canAskNotification = "Notification" in window && Notification.permission === "default";
  banner.innerHTML = `
    <div>
      <strong>${escapeHtml(countText)}</strong>
      <p>${escapeHtml(title)} · ${escapeHtml(formatCapsuleDate(latest.unlockAt))}</p>
    </div>
    <div class="capsule-alert-actions">
      ${canAskNotification ? '<button type="button" data-capsule-notify>开启浏览器通知</button>' : ""}
      <button type="button" data-capsule-view>去查看</button>
      <button type="button" data-capsule-dismiss>知道了</button>
    </div>
  `;

  banner.querySelector("[data-capsule-view]")?.addEventListener("click", () => {
    if (page === "capsules") {
      const card = document.querySelector(`[data-capsule-entry="${CSS.escape(latest.id)}"]`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.classList.add("is-unlocked-alert");
      window.setTimeout(() => card?.classList.remove("is-unlocked-alert"), 2400);
      return;
    }
    navigateWithTransition(getCapsulePageUrl(), -1);
  });

  banner.querySelector("[data-capsule-dismiss]")?.addEventListener("click", () => {
    const dismissed = readStoredIdSet(capsuleDismissedKey);
    entries.forEach((entry) => dismissed.add(String(entry.id)));
    writeStoredIdSet(capsuleDismissedKey, dismissed);
    hideCapsuleUnlockBanner();
    scheduleNextCapsuleUnlockAlert();
  });

  banner.querySelector("[data-capsule-notify]")?.addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") notifyUnlockedCapsules(entries, true);
    showCapsuleUnlockBanner(entries);
  });
}

function hideCapsuleUnlockBanner() {
  document.querySelector("[data-capsule-alert]")?.remove();
}

function notifyUnlockedCapsules(entries, force = false) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const notified = readStoredIdSet(capsuleNotifiedKey);
  const freshEntries = entries.filter((entry) => force || !notified.has(String(entry.id)));
  if (!freshEntries.length) return;

  const latest = freshEntries[0];
  const notification = new Notification("时间胶囊已解锁", {
    body: `${latest.title || "写给未来的信"} · 去看看这封准时到达的信。`,
    tag: `capsule-${latest.id}`,
    renotify: false
  });
  notification.addEventListener("click", () => {
    window.focus();
    navigateWithTransition(getCapsulePageUrl(), -1);
  });

  freshEntries.forEach((entry) => notified.add(String(entry.id)));
  writeStoredIdSet(capsuleNotifiedKey, notified);
}

function renderCapsules() {
  const list = document.querySelector("[data-capsule-list]");
  if (!list) return;
  const now = Date.now();
  const capsules = [...(state.capsules || [])].sort((a, b) => a.unlockAt - b.unlockAt);
  list.innerHTML = "";
  if (!capsules.length) {
    list.innerHTML = `<p class="content-empty">${canEdit() ? "还没有时间胶囊，写一封信给未来的 TA 吧。" : "这里还没有封存的信件。"}</p>`;
    return;
  }
  capsules.forEach((entry) => {
    const unlocked = now >= entry.unlockAt;
    const card = document.createElement("article");
    card.className = `capsule-card${unlocked ? "" : " is-locked"}`;
    card.dataset.capsuleEntry = entry.id;
    const safeTitle = escapeHtml(entry.title || "写给未来的你");
    const date = escapeHtml(formatCapsuleDate(entry.unlockAt));
    card.innerHTML = unlocked
      ? `<div class="capsule-card-head"><span class="capsule-status">已开启</span><time>${date}</time></div><h3>${safeTitle}</h3><div class="capsule-letter">${sanitizeEditableHtml(entry.text)}</div>${entry.updatedAt ? `<small class="module-edit-time">编辑时间：${escapeHtml(formatEditTime(entry.updatedAt))}</small>` : ""}${contentEntryActionsHtml(entry.id)}`
      : `<div class="capsule-lock" aria-hidden="true">&#128274;</div><div class="capsule-card-head"><span class="capsule-status">尚未开启</span><time>${date}</time></div><h3>${safeTitle}</h3><p class="capsule-locked-copy">这封信会在开启日与 TA 见面。</p>${contentEntryActionsHtml(entry.id)}`;
    card.querySelector("[data-content-edit]")?.addEventListener("click", () => editCapsule(entry.id));
    card.querySelector("[data-content-delete]")?.addEventListener("click", async () => {
      if (!canEdit()) return;
      state.capsules = (state.capsules || []).filter((item) => item.id !== entry.id);
      forgetCapsuleAlertState(entry.id);
      renderCapsules();
      checkCapsuleUnlockAlerts();
      scheduleNextCapsuleUnlockAlert();
      await saveState();
    });
    list.appendChild(card);
  });
}

function editCapsule(id) {
  if (!canEdit()) return;
  const form = document.querySelector("[data-capsule-form]");
  const entry = (state.capsules || []).find((item) => item.id === id);
  if (!form || !entry) return;
  form.dataset.editingId = id;
  form.classList.add("is-editing-entry");
  form.elements.title.value = entry.title || "";
  form.elements.text.value = entry.text || "";
  form.elements.unlockAt.value = toDatetimeLocal(entry.unlockAt);
  if (form.elements.updatedAt) form.elements.updatedAt.value = toDatetimeLocal(entry.updatedAt || Date.now());
  form.querySelector("[data-capsule-cancel]")?.removeAttribute("hidden");
  form.querySelector("[data-capsule-delete-entry]")?.removeAttribute("hidden");
  form.querySelector("[data-edit-time-field]")?.removeAttribute("hidden");
  form.querySelector('button[type="submit"]')?.replaceChildren(document.createTextNode("保存修改"));
  setCapsuleFormMessage(form, "正在编辑，保存后覆盖这封信。");
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  form.elements.title.focus();
}

function readContentEntryForm(type, form) {
  const config = contentEntryConfig[type];
  const entry = {
    id: form.dataset.editingId || `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  };

  config.fields.forEach((field) => {
    entry[field] = sanitizeEditableHtml(String(form.elements[field]?.value || "").trim());
  });

  // A date input cannot represent older free-form story times. Preserve the
  // existing value when an old record is edited without choosing a date.
  if (type === "story" && !entry.time) {
    const existing = state.contentEntries.story?.find((item) => item.id === entry.id);
    entry.time = existing?.time || "";
  }

  // Read image fields
  const imageInput = form.querySelector('[data-image-input]');
  const imageSizeSelect = form.querySelector('[data-image-size]');
  const file = imageInput?.files?.[0];

  if (file) {
    // New image uploaded - will be handled async by the caller
    entry._imageFile = file;
  } else if (form.dataset.currentImage) {
    // Preserve existing image when editing without uploading new one
    entry.image = form.dataset.currentImage;
    entry.imagePosition = form.dataset.currentImagePosition
      ? JSON.parse(form.dataset.currentImagePosition)
      : normalizePhotoPosition();
  } else if (form.dataset.imageRemoved === "yes") {
    entry.image = "";
    entry.imagePosition = normalizePhotoPosition();
  }
  entry.imageSize = imageSizeSelect?.value || config.defaults.imageSize || "medium";

  if (type === "notes") {
    const existing = state.contentEntries.notes?.find((item) => item.id === entry.id);
    entry.time = existing?.time || formatNoteDate();
  }

  if (!entry.text && !entry.title) return null;
  return entry;
}

function formatNoteDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function resetContentEntryForm(type, form = document.querySelector(contentEntryConfig[type]?.formSelector)) {
  if (!form) return;
  const config = contentEntryConfig[type];
  form.reset();
  delete form.dataset.editingId;
  delete form.dataset.currentImage;
  delete form.dataset.currentImagePosition;
  delete form.dataset.imageRemoved;
  form.classList.remove("is-editing-entry");
  form.querySelector("[data-content-cancel]")?.setAttribute("hidden", "");
  form.querySelector("[data-content-delete-entry]")?.setAttribute("hidden", "");
  form.querySelector("[data-edit-time-field]")?.setAttribute("hidden", "");
  const updatedAtInput = form.elements.updatedAt;
  if (updatedAtInput) updatedAtInput.value = "";
  form.querySelector('button[type="submit"]')?.replaceChildren(document.createTextNode(config.submitText));
  const imageUpload = form.querySelector('[data-image-upload]');
  if (imageUpload) updateContentEntryImagePreview(imageUpload, "");
  const sizeSelect = form.querySelector('[data-image-size]');
  if (sizeSelect) sizeSelect.value = config.defaults.imageSize || "medium";
}

function updateContentEntryImagePreview(container, src) {
  if (!container) return;
  const preview = container.querySelector('[data-image-preview]');
  const positionBtn = container.querySelector('[data-image-position]');
  const removeBtn = container.querySelector('[data-image-remove]');
  if (!preview) return;

  if (src) {
    preview.innerHTML = `<img src="${escapeAttribute(src)}" alt="图片预览">`;
    positionBtn?.removeAttribute('hidden');
    removeBtn?.removeAttribute('hidden');
  } else {
    preview.innerHTML = '';
    positionBtn?.setAttribute('hidden', '');
    removeBtn?.setAttribute('hidden', '');
  }
}

function setContentFormMessage(form, message) {
  const target = form?.querySelector("[data-content-message]");
  if (target) target.textContent = message;
}

function renderContentEntries(targetType) {
  Object.entries(contentEntryConfig).forEach(([type, config]) => {
    if (targetType && targetType !== type) return;
    const list = document.querySelector(config.listSelector);
    if (!list) return;

    const entries = state.contentEntries[type] || [];
    const usesFilter = ["story", "notes"].includes(type);
    if (usesFilter) {
      refreshEntryFilter(type, entries);
    }
    const visibleEntries = usesFilter ? filterEntries(type, entries) : entries;
    if (usesFilter) {
      updateEntryFilterStatus(type, visibleEntries.length, entries.length);
    }
    list.innerHTML = "";
    if (entries.length === 0) {
      list.innerHTML = `<p class="content-empty">${canEdit() ? "还没有内容，在右侧表单写下第一条吧。" : "这里还很安静，登录后写下第一条回忆。"}</p>`;
      return;
    }
    if (!visibleEntries.length) {
      list.innerHTML = `<p class="content-empty">\u6ca1\u6709\u627e\u5230\u5339\u914d\u7684\u5185\u5bb9\u3002</p>`;
      return;
    }
    const sortedEntries = type === "storyTimeline"
      ? storyTimelineEntries(visibleEntries)
      : type === "story"
        ? chronologicalStoryEntries(visibleEntries)
        : latestFirstEntries(visibleEntries);
    sortedEntries.forEach(({ entry }) => {
      list.appendChild(createContentEntryCard(type, entry));
    });
  });
}

function chronologicalStoryEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => {
      const date = new Date(`${String(entry?.time || "").trim()}T00:00:00`);
      const time = date.getTime();
      return {
        entry,
        index,
        hasDate: !Number.isNaN(time),
        time: Number.isNaN(time) ? Number(entry?.updatedAt) || getTimeFromId(entry?.id) : time
      };
    })
    .sort((a, b) => {
      if (a.hasDate !== b.hasDate) return a.hasDate ? -1 : 1;
      return a.time - b.time || a.index - b.index;
    });
}

function createContentEntryCard(type, entry) {
  const config = contentEntryConfig[type];
  const card = document.createElement("article");
  card.className = config.cardClass;
  card.id = `memory-${entry.id}`;
  card.dataset.contentEntry = entry.id;

  if (type === "story") {
    card.innerHTML = `
      <time>${sanitizeEditableHtml(entry.time || config.defaults.time)}</time>
      <h3>${sanitizeEditableHtml(entry.title || config.defaults.title)}</h3>
      ${contentEntryImageHtml(entry)}
      <p>${sanitizeEditableHtml(entry.text || config.defaults.text)}</p>
      ${contentEntryActionsHtml(entry.id)}
    `;
  } else if (type === "daily") {
    card.innerHTML = `
      <span>${sanitizeEditableHtml(entry.label || config.defaults.label)}</span>
      <h3>${sanitizeEditableHtml(entry.title || config.defaults.title)}</h3>
      <p>${sanitizeEditableHtml(entry.text || config.defaults.text)}</p>
      ${contentEntryTimeHtml(entry)}
      ${contentEntryActionsHtml(entry.id)}
    `;
  } else if (type === "notes") {
    card.innerHTML = `
      <time>${sanitizeEditableHtml(formatNoteEntryDate(entry))}</time>
      <p>${sanitizeEditableHtml(entry.text || config.defaults.text)}</p>
      ${contentEntryTimeHtml(entry)}
      ${contentEntryActionsHtml(entry.id)}
    `;
  } else {
    card.innerHTML = `
      <div class="story-timeline-date" aria-label="${escapeAttribute(formatStoryTimelineDate(entry.eventDate))}">
        <span>${escapeHtml(formatStoryTimelineMonth(entry.eventDate))}</span>
        <strong>${escapeHtml(formatStoryTimelineDay(entry.eventDate))}</strong>
      </div>
      <div class="story-timeline-content">
        <time>${escapeHtml(formatStoryTimelineDate(entry.eventDate))}</time>
        <h3>${sanitizeEditableHtml(entry.title || config.defaults.title)}</h3>
        ${contentEntryImageHtml(entry)}
        ${entry.text ? `<p>${sanitizeEditableHtml(entry.text)}</p>` : ""}
        ${contentEntryTimeHtml(entry)}
        ${contentEntryActionsHtml(entry.id)}
      </div>
    `;
  }

  card.querySelector("[data-content-edit]")?.addEventListener("click", () => editContentEntry(type, entry.id));
  card.querySelector("[data-content-delete]")?.addEventListener("click", async () => {
    if (!canEdit()) return;
    state.contentEntries[type] = (state.contentEntries[type] || []).filter((item) => item.id !== entry.id);
    renderContentEntries(type);
    await saveState();
  });

  return card;
}

function formatNoteEntryDate(entry) {
  if (entry?.updatedAt) {
    const updatedDate = formatNoteDate(Number(entry.updatedAt));
    if (updatedDate) return updatedDate;
  }
  return entry?.time || formatNoteDate();
}

function formatStoryTimelineDate(value) {
  const date = new Date(`${String(value || "")}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "\u672a\u8bbe\u65e5\u671f";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function formatStoryTimelineMonth(value) {
  const date = new Date(`${String(value || "")}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "DATE";
  return `${date.getMonth() + 1}\u6708`;
}

function formatStoryTimelineDay(value) {
  const date = new Date(`${String(value || "")}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "--";
  return String(date.getDate()).padStart(2, "0");
}

function storyTimelineEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => ({ entry, index, date: Date.parse(`${entry?.eventDate || ""}T12:00:00`) || 0 }))
    .sort((a, b) => a.date - b.date || a.index - b.index);
}

function contentEntryTimeHtml(entry) {
  return `<small class="module-edit-time">${entry.updatedAt ? `\u7F16\u8F91\u65F6\u95F4\uFF1A${formatEditTime(entry.updatedAt)}` : ""}</small>`;
}

function contentEntryImageHtml(entry) {
  if (!entry.image) return "";
  const size = entry.imageSize || "medium";
  const position = normalizePhotoPosition(entry.imagePosition);
  return `<img class="content-entry-image content-entry-image-${size}" src="${escapeAttribute(entry.image)}" alt="" style="object-position: ${position.x}% ${position.y}%;">`;
}

function contentEntryActionsHtml(id) {
  if (!canEdit()) return "";
  return `
    <div class="content-entry-actions">
      <button type="button" data-content-edit="${escapeAttribute(id)}">\u7f16\u8f91</button>
      <button type="button" data-content-delete="${escapeAttribute(id)}">\u5220\u9664</button>
    </div>
  `;
}

function editContentEntry(type, id) {
  if (!canEdit()) return;
  const config = contentEntryConfig[type];
  const form = document.querySelector(config.formSelector);
  const entry = (state.contentEntries[type] || []).find((item) => item.id === id);
  if (!form || !entry) return;

  form.dataset.editingId = id;
  form.classList.add("is-editing-entry");
  config.fields.forEach((field) => {
    if (form.elements[field]) form.elements[field].value = entry[field] || "";
  });

  // Populate image fields
  const imageUpload = form.querySelector('[data-image-upload]');
  if (imageUpload) {
    if (entry.image) {
      form.dataset.currentImage = entry.image;
      if (entry.imagePosition) {
        form.dataset.currentImagePosition = JSON.stringify(entry.imagePosition);
      }
      updateContentEntryImagePreview(imageUpload, entry.image);
    } else {
      delete form.dataset.currentImage;
      delete form.dataset.currentImagePosition;
      updateContentEntryImagePreview(imageUpload, "");
    }
    const sizeSelect = imageUpload.querySelector('[data-image-size]');
    if (sizeSelect) sizeSelect.value = entry.imageSize || config.defaults.imageSize || "medium";
  }

  form.querySelector("[data-content-cancel]")?.removeAttribute("hidden");
  form.querySelector("[data-content-delete-entry]")?.removeAttribute("hidden");
  form.querySelector("[data-edit-time-field]")?.removeAttribute("hidden");
  const updatedAtInput = form.elements.updatedAt;
  if (updatedAtInput) updatedAtInput.value = toDatetimeLocal(entry.updatedAt || Date.now());
  form.querySelector('button[type="submit"]')?.replaceChildren(document.createTextNode("\u4fdd\u5b58\u4fee\u6539"));
  setContentFormMessage(form, "\u6b63\u5728\u7f16\u8f91\uff0c\u4fdd\u5b58\u540e\u8986\u76d6\u8fd9\u6761\u3002");
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  form.querySelector("input, textarea")?.focus();
}

function refreshSettingsForm() {
  if (!els.settingsForm || els.settingsForm.contains(document.activeElement)) return;
  els.nameA.value = state.nameA;
  els.nameB.value = state.nameB;
  els.startDate.value = state.startDate;
  els.startTime.value = state.startTime || defaults.startTime;
  els.loginCodeSetting.value = state.accessCode;
}

function initNavigation() {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === page) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      if (canEdit()) {
        setEditorMode(false);
        sessionStorage.removeItem(authKey);
        sessionStorage.removeItem(editTokenKey);
        navigateWithTransition("index.html", 1);
        return;
      }
      if (isGuestMode()) {
        sessionStorage.removeItem(guestKey);
        sessionStorage.removeItem(authKey);
        sessionStorage.removeItem(editTokenKey);
        navigateWithTransition("login.html", 1);
        return;
      }
      sessionStorage.setItem("editor-return-to", window.location.pathname.split("/").pop() || "index.html");
      navigateWithTransition("login.html?mode=editor", 1);
    });
  });
}

function syncHeaderHeight() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const height = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--header-h", `${height + 12}px`);
}

function collectEditableDefaults() {
  document.querySelectorAll("[data-edit-key]").forEach((el) => {
    editableDefaults[el.dataset.editKey] = el.innerHTML.trim();
  });
}

function applyEditableContent() {
  document.querySelectorAll("[data-edit-key]").forEach((el) => {
    const key = el.dataset.editKey;
    const html = state.edits[key] ?? editableDefaults[key] ?? el.innerHTML;
    el.innerHTML = sanitizeEditableHtml(html);
  });
  refreshEditTimes();
}

function initInlineEditor() {
  if (!document.querySelector("[data-edit-key]") && !els.wishList) return;

  createEditorPanel();
  setupEditableScopes();

  window.addEventListener("resize", positionEditor);
  window.addEventListener("scroll", positionEditor, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeEditor();
  });
}

function setupEditableScopes() {
  const selector = ".hero-content, .page-hero, .timeline article, .daily-card-item, .note-card, .travel-intro-grid article, .map-board, .photo-card";

  document.querySelectorAll(selector).forEach((scope) => {
    if (!scope.querySelector("[data-edit-key]")) return;
    if (scope.classList.contains("edit-scope")) return;

    scope.classList.add("edit-scope");
    const badge = document.createElement("span");
    badge.className = "module-edit-button";
    badge.setAttribute("role", "button");
    badge.setAttribute("tabindex", "0");
    badge.textContent = "\u7f16\u8f91";
    badge.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openScopeEditor(scope);
    });
    badge.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openScopeEditor(scope);
      }
    });
    scope.appendChild(badge);

    const time = document.createElement("span");
    time.className = "module-edit-time";
    time.dataset.editTimeFor = getScopeEditId(scope);
    scope.appendChild(time);
    updateScopeEditTime(scope);
  });
}

function createEditorPanel() {
  editor.panel = document.createElement("aside");
  editor.panel.className = "edit-panel";
  editor.panel.setAttribute("aria-live", "polite");
  editor.panel.hidden = true;
  document.body.appendChild(editor.panel);
}

function openScopeEditor(scope) {
  if (!canEdit()) return;
  const fields = Array.from(scope.querySelectorAll("[data-edit-key]")).filter((item, index, all) => {
    return all.findIndex((other) => other.dataset.editKey === item.dataset.editKey) === index;
  });
  if (!fields.length) return;

  editor.activeScope = scope;
  document.querySelectorAll(".edit-scope.is-editing, .wish-edit-scope.is-editing").forEach((el) => el.classList.remove("is-editing"));
  scope.classList.add("is-editing");
  const scopeId = getScopeEditId(scope);
  const editedAt = state.editTimes[scopeId];

  const controls = fields.map((field, index) => {
    const key = field.dataset.editKey;
    const value = state.edits[key] ?? editableDefaults[key] ?? field.innerHTML.trim();
    const label = getFieldLabel(field, index);
    return `
      <label>
        <span>${label}</span>
        <textarea class="html-editor-field" data-field-key="${escapeAttribute(key)}" rows="5">${escapeHtml(value)}</textarea>
      </label>
    `;
  }).join("");

  editor.panel.innerHTML = `
    <form class="edit-panel-form">
      <div class="edit-panel-head">
        <strong>\u7f16\u8f91\u8fd9\u4e2a\u6a21\u5757</strong>
        <button type="button" data-editor-close aria-label="\u5173\u95ed">\u00d7</button>
      </div>
      <p class="edit-panel-meta">${editedAt ? `\u4E0A\u6B21\u7F16\u8F91\uFF1A${formatEditTime(editedAt)}` : ""}</p>
      <p class="edit-panel-hint">\u53EF\u4EE5\u5199\u591A\u884C\u6587\u5B57\uFF0C\u4E5F\u53EF\u4EE5\u4F7F\u7528\u7B80\u5355\u683C\u5F0F\u3002</p>
      ${controls}
      <div class="edit-panel-actions">
        <button type="button" class="ghost-action" data-editor-reset>\u6062\u590d\u9ed8\u8ba4</button>
        <button type="button" class="danger-action" data-editor-delete>\u5220\u9664</button>
        <button type="submit">\u4fdd\u5b58</button>
      </div>
    </form>
  `;

  editor.panel.hidden = false;
  positionEditor();
  editor.panel.querySelector("[data-editor-close]").addEventListener("click", closeEditor);
  editor.panel.querySelector("[data-editor-delete]").addEventListener("click", async () => {
    if (!canEdit()) return;
    if (!confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u4e2a\u6a21\u5757\u5417\uff1f\u5220\u9664\u540e\u5185\u5bb9\u5c06\u88ab\u6e05\u7a7a\u3002")) return;
    fields.forEach((field) => {
      state.edits[field.dataset.editKey] = "";
    });
    delete state.editTimes[scopeId];
    applyEditableContent();
    await saveState();
    closeEditor();
  });
  editor.panel.querySelector("[data-editor-reset]").addEventListener("click", async () => {
    if (!canEdit()) return;
    fields.forEach((field) => delete state.edits[field.dataset.editKey]);
    delete state.editTimes[scopeId];
    applyEditableContent();
    await saveState();
    openScopeEditor(scope);
  });
  editor.panel.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canEdit()) return;
    editor.panel.querySelectorAll("[data-field-key]").forEach((input) => {
      const key = input.dataset.fieldKey;
      state.edits[key] = sanitizeEditableHtml(input.value.trim());
    });
    state.editTimes[scopeId] = Date.now();
    applyEditableContent();
    await saveState();
    openScopeEditor(scope);
  });
  editor.panel.querySelector("[data-field-key]")?.focus();
}

function openWishEditor(scope, index) {
  if (!canEdit()) return;
  editor.activeScope = scope;
  document.querySelectorAll(".edit-scope.is-editing, .wish-edit-scope.is-editing").forEach((el) => el.classList.remove("is-editing"));
  scope.classList.add("is-editing");
  const wish = state.wishes[index];
  if (!wish) return;

  editor.panel.innerHTML = `
    <form class="edit-panel-form">
      <div class="edit-panel-head">
        <strong>\u7f16\u8f91\u613f\u671b</strong>
        <button type="button" data-editor-close aria-label="\u5173\u95ed">\u00d7</button>
      </div>
      <label>
        <span>\u5185\u5bb9</span>
        <textarea data-wish-text rows="3">${escapeHtml(wish.text)}</textarea>
      </label>
      <div class="edit-panel-times">
        <label>
          <span>\u7f16\u8f91\u65f6\u95f4</span>
          <input type="datetime-local" data-wish-updated-at value="${escapeAttribute(toDatetimeLocal(wish.updatedAt || Date.now()))}">
        </label>
        <label>
          <span>\u5b8c\u6210\u65f6\u95f4</span>
          <input type="datetime-local" data-wish-done-at value="${escapeAttribute(toDatetimeLocal(wish.doneAt || (wish.done ? wish.updatedAt : 0) || ""))}">
        </label>
      </div>
      <p class="edit-panel-meta">${getWishTimeText(wish)}</p>
      <div class="edit-panel-actions">
        <button type="button" class="ghost-action" data-editor-done>${wish.done ? "\u6807\u4e3a\u672a\u5b8c\u6210" : "\u6807\u4e3a\u5b8c\u6210"}</button>
        <button type="button" class="danger-action" data-editor-delete>\u5220\u9664</button>
        <button type="submit">\u4fdd\u5b58</button>
      </div>
    </form>
  `;

  editor.panel.hidden = false;
  positionEditor();
  editor.panel.querySelector("[data-editor-close]").addEventListener("click", closeEditor);
  editor.panel.querySelector("[data-editor-delete]").addEventListener("click", async () => {
    if (!canEdit()) return;
    if (!confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u4e2a\u613f\u671b\u5417\uff1f\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\u3002")) return;
    state.wishes.splice(index, 1);
    renderWishes();
    closeEditor();
    scheduleStateSave();
  });
  editor.panel.querySelector("[data-editor-done]").addEventListener("click", async () => {
    if (!canEdit()) return;
    if (!state.wishes[index]) return;
    toggleWishDone(index);
    renderWishes();
    closeEditor();
    scheduleStateSave();
  });
  editor.panel.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canEdit()) return;
    if (!state.wishes[index]) return;
    state.wishes[index].text = sanitizeEditableHtml(editor.panel.querySelector("[data-wish-text]").value.trim()) || state.wishes[index].text;
    const updatedAtInput = editor.panel.querySelector("[data-wish-updated-at]");
    const doneAtInput = editor.panel.querySelector("[data-wish-done-at]");
    state.wishes[index].updatedAt = fromDatetimeLocal(updatedAtInput?.value) || state.wishes[index].updatedAt || Date.now();
    state.wishes[index].doneAt = state.wishes[index].done
      ? (fromDatetimeLocal(doneAtInput?.value) || state.wishes[index].doneAt || state.wishes[index].updatedAt || Date.now())
      : "";
    renderWishes();
    closeEditor();
    scheduleStateSave();
  });
  editor.panel.querySelector("[data-wish-text]")?.focus();
}

function syncOpenEditor() {
  if (!editor.activeScope || editor.panel.hidden || editor.panel.matches(":focus-within")) return;
  if (editor.activeScope.classList.contains("wish-edit-scope")) return;
  openScopeEditor(editor.activeScope);
}

function closeEditor() {
  if (!editor.panel) return;
  editor.panel.hidden = true;
  editor.activeScope = null;
  document.querySelectorAll(".edit-scope.is-editing, .wish-edit-scope.is-editing").forEach((el) => el.classList.remove("is-editing"));
}

function positionEditor() {
  if (!editor.panel || editor.panel.hidden || !editor.activeScope) return;
  if (window.matchMedia("(max-width: 700px)").matches) {
    editor.panel.style.removeProperty("top");
    editor.panel.style.removeProperty("left");
    return;
  }

  const gap = 14;
  const rect = editor.activeScope.getBoundingClientRect();
  const panelWidth = Math.min(340, window.innerWidth - 32);
  const top = Math.max(92, Math.min(window.innerHeight - 220, rect.top)) + window.scrollY;
  const rightSide = rect.right + gap + panelWidth <= window.innerWidth - 16;
  const left = rightSide ? rect.right + gap : Math.max(16, rect.left - panelWidth - gap);

  editor.panel.style.width = `${panelWidth}px`;
  editor.panel.style.top = `${top}px`;
  editor.panel.style.left = `${left}px`;
}

function getScopeEditId(scope) {
  return Array.from(scope.querySelectorAll("[data-edit-key]"))
    .map((field) => field.dataset.editKey)
    .filter(Boolean)
    .sort()
    .join("|");
}

function refreshEditTimes() {
  document.querySelectorAll(".edit-scope").forEach(updateScopeEditTime);
}

function updateScopeEditTime(scope) {
  const time = scope.querySelector(":scope > .module-edit-time");
  if (!time) return;
  const value = state.editTimes[getScopeEditId(scope)];
  time.textContent = value ? `\u7F16\u8F91\u65F6\u95F4\uFF1A${formatEditTime(value)}` : "";
}

function formatEditTime(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "\u672A\u77E5";
  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toDatetimeLocal(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getFieldLabel(field, index) {
  const tag = field.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) return "\u6807\u9898";
  if (tag === "time") return "\u65f6\u95f4";
  if (tag === "span") return "\u6807\u7b7e";
  if (tag === "p") return "\u6587\u5b57";
  return `\u5185\u5bb9 ${index + 1}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function sanitizeEditableHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  const blockedTags = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form", "input", "button", "textarea", "select"]);

  template.content.querySelectorAll("*").forEach((node) => {
    if (blockedTags.has(node.tagName.toLowerCase())) {
      node.remove();
      return;
    }

    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const text = String(attr.value || "").trim().toLowerCase();
      if (name.startsWith("on") || text.startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    });
  });

  return template.innerHTML;
}

function initPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext && location.hostname !== "localhost") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // PWA install is optional; the site should still work as a normal page.
    });
  });
}

function initPageTransitions() {
  const pageOrder = ["login", "home", "story", "notes", "travel", "album", "wishes", "capsules"];
  const currentIndex = pageOrder.indexOf(page);

  window.requestAnimationFrame(() => {
    document.body.classList.remove("page-prep", "page-leaving");
    document.body.classList.add("page-ready");
  });

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("page-leaving");
    document.body.classList.add("page-ready");
  });

  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target || link.hasAttribute("download")) return;

      const targetUrl = new URL(href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname && targetUrl.hash) return;

      event.preventDefault();
      const targetPage = link.dataset.nav || (href.includes("login") ? "login" : "");
      const targetIndex = pageOrder.indexOf(targetPage);
      const direction = targetIndex !== -1 && currentIndex !== -1 && targetIndex < currentIndex ? 1 : -1;
      navigateWithTransition(targetUrl.href, direction);
    });
  });
}

function initScrollParallax() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  let latestScroll = window.scrollY || 0;
  let ticking = false;

  function update() {
    const scroll = latestScroll;
    window.__coupleScrollY = scroll;
    document.body.style.setProperty("--bg-shift-x", `${Math.sin(scroll / 360) * 18}px`);
    document.body.style.setProperty("--bg-shift-x-reverse", `${Math.cos(scroll / 420) * -16}px`);
    document.body.style.setProperty("--bg-shift-y", `${scroll * -0.035}px`);
    document.body.style.setProperty("--bg-shift-y-soft", `${scroll * 0.018}px`);
    ticking = false;
  }

  function requestUpdate() {
    latestScroll = window.scrollY || 0;
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  requestUpdate();
  window.addEventListener("scroll", requestUpdate, { passive: true });
}

function initCanvas() {
  const canvas = document.querySelector("#skyCanvas");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;
  const isMobile = window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
  const ctx = canvas.getContext("2d");
  const particles = Array.from({ length: isMobile ? 18 : 44 }, () => createParticle());
  const glowOrbs = [
    { x: 0.16, y: 0.22, radius: isMobile ? 210 : 320, driftX: 0.018, driftY: 0.014, phase: 0.2, period: 24000, inner: "rgba(255, 159, 110, 0.18)", mid: "rgba(255, 159, 110, 0.07)" },
    { x: 0.82, y: 0.18, radius: isMobile ? 180 : 280, driftX: 0.014, driftY: 0.018, phase: 1.4, period: 28000, inner: "rgba(43, 179, 163, 0.16)", mid: "rgba(43, 179, 163, 0.06)" },
    { x: 0.74, y: 0.76, radius: isMobile ? 160 : 260, driftX: 0.016, driftY: 0.012, phase: 2.1, period: 32000, inner: "rgba(119, 98, 209, 0.14)", mid: "rgba(119, 98, 209, 0.05)" }
  ];
  let animationFrame = null;
  let running = false;
  let lastFrameTime = 0;

  function randomColor() {
    return ["#ff6f7d", "#2bb3a3", "#f3c455", "#7762d1", "#ff9f6e"][Math.floor(Math.random() * 5)];
  }

  function pickKind(forceHeart = false) {
    if (forceHeart) return "heart";
    const roll = Math.random();
    if (roll < 0.62) return "heart";
    if (roll < 0.84) return "dot";
    return "star";
  }

  function createParticle(options = {}) {
    const kind = options.kind || pickKind(Boolean(options.burst));
    const baseSize = kind === "heart"
      ? 2.2 + Math.random() * 4.8
      : kind === "star"
        ? 1.4 + Math.random() * 2.8
        : 1.1 + Math.random() * 1.9;
    return {
      x: typeof options.x === "number" ? options.x : Math.random(),
      y: typeof options.y === "number" ? options.y : Math.random(),
      size: typeof options.size === "number" ? options.size : baseSize,
      depth: typeof options.depth === "number" ? options.depth : 0.35 + Math.random() * 1.15,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: (Math.random() - 0.5) * 0.0015,
      color: options.color || randomColor(),
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.0015,
      alpha: typeof options.alpha === "number" ? options.alpha : (kind === "heart" ? 0.18 + Math.random() * 0.18 : 0.14 + Math.random() * 0.12),
      kind,
      burst: Boolean(options.burst),
      life: typeof options.life === "number" ? options.life : (options.burst ? 760 + Math.random() * 360 : Infinity),
      age: 0,
      vx: typeof options.vx === "number" ? options.vx : (Math.random() - 0.5) * 0.00018,
      vy: typeof options.vy === "number" ? options.vy : (kind === "heart" ? -(0.000035 + Math.random() * 0.00006) : -(0.000015 + Math.random() * 0.00003)),
      twinkle: Math.random() * Math.PI * 2
    };
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawHeart(x, y, size, color, alpha = 1, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(size / 18, size / 18);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-18, -8, -8, -24, 0, -12);
    ctx.bezierCurveTo(8, -24, 18, -8, 0, 6);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(3, size * 1.2);
    ctx.fill();
    ctx.restore();
  }

  function drawDot(x, y, size, color, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(2, size * 1.1);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1, size * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStar(x, y, size, color, alpha = 1, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(2, size);
    ctx.beginPath();
    const points = 5;
    for (let index = 0; index < points * 2; index++) {
      const angle = (Math.PI / points) * index - Math.PI / 2;
      const radius = index % 2 === 0 ? size : size * 0.45;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGlowOrb(orb, now) {
    const phase = now / orb.period + orb.phase;
    const x = window.innerWidth * (orb.x + Math.sin(phase) * orb.driftX);
    const y = window.innerHeight * (orb.y + Math.cos(phase * 0.88) * orb.driftY);
    const radius = orb.radius * (1 + Math.sin(phase * 0.62) * 0.05);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, orb.inner);
    gradient.addColorStop(0.45, orb.mid);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticle(particle, x, y, now) {
    const wobble = Math.sin(now / 420 + particle.twinkle) * (particle.kind === "heart" ? 2 : 1);
    const alpha = Math.max(0, Math.min(1, particle.alpha * (particle.burst ? Math.max(0, 1 - particle.age / particle.life) : 1)));
    const size = particle.size + wobble;
    if (particle.kind === "dot") {
      drawDot(x, y, size, particle.color, alpha);
      return;
    }
    if (particle.kind === "star") {
      drawStar(x, y, size, particle.color, alpha, particle.rotation);
      return;
    }
    drawHeart(x, y, size, particle.color, alpha, particle.rotation);
  }

  function resetParticle(particle, options = {}) {
    Object.assign(particle, createParticle(options));
    return particle;
  }

  function spawnBurstParticle(clientX, clientY) {
    const burst = createParticle({
      x: clientX / window.innerWidth,
      y: clientY / window.innerHeight,
      kind: "heart",
      burst: true,
      size: 6 + Math.random() * 5,
      alpha: 0.34 + Math.random() * 0.16,
      life: 720 + Math.random() * 420,
      vx: (Math.random() - 0.5) * 0.00028,
      vy: -(0.000085 + Math.random() * 0.00009)
    });
    const slot = particles.findIndex((item) => !item.burst);
    if (slot >= 0) {
      particles[slot] = burst;
    } else if (particles.length < (isMobile ? 36 : 84)) {
      particles.push(burst);
    } else {
      particles[particles.length - 1] = burst;
    }
    if (!running) start();
  }

  function advanceParticle(particle, dt) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.sway += particle.swaySpeed * dt;
    particle.rotation += particle.spin * dt;

    if (particle.burst) {
      particle.alpha = Math.max(0, particle.alpha);
      if (particle.age >= particle.life || particle.y < -0.12) {
        resetParticle(particle, { y: 1.06 });
      }
      return;
    }

    if (particle.x < -0.12 || particle.x > 1.12 || particle.y < -0.12) {
      resetParticle(particle, { y: 1.08 });
      return;
    }
  }

  function animate(now = 0) {
    if (!running || document.hidden) {
      stop();
      return;
    }
    const dt = lastFrameTime ? Math.min(40, now - lastFrameTime) : 16;
    lastFrameTime = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawGlowOrb(glowOrbs[0], now);
    drawGlowOrb(glowOrbs[1], now);
    drawGlowOrb(glowOrbs[2], now);
    const scrollShift = window.__coupleScrollY || 0;
    particles.forEach((particle) => {
      advanceParticle(particle, dt);
      const drift = Math.sin(particle.sway) * (particle.kind === "heart" ? 16 : 8);
      const lift = Math.cos(particle.sway * 0.66) * (particle.kind === "heart" ? 9 : 5);
      const x = particle.x * window.innerWidth + drift + scrollShift * particle.depth * 0.012;
      const y = particle.y * window.innerHeight + lift + scrollShift * particle.depth * 0.05;
      drawParticle(particle, x, y, now);
    });
    animationFrame = requestAnimationFrame(animate);
  }

  function start() {
    if (running || reduceMotion) return;
    resize();
    running = true;
    lastFrameTime = 0;
    animationFrame = requestAnimationFrame(animate);
  }

  function stop() {
    running = false;
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
  window.addEventListener("pointerdown", (event) => {
    if (reduceMotion) return;
    if (typeof event.clientX !== "number" || typeof event.clientY !== "number") return;
    spawnBurstParticle(event.clientX, event.clientY);
  }, { passive: true });
  window.__coupleSkyCanvas = { start, stop, spawnBurstParticle };
  start();
}

function initHomeMusic() {
  initPageMusic(homeMusic, "home");
}

function initStoryMusic() {
  initPageMusic(storyMusic, "story", 1, 1.2);
}

function initAlbumMusic() {
  initPageMusic(albumMusic, "album", 1.1);
}

function initNotesMusic() {
  initPageMusic(notesMusic, "notes");
}

function initTravelMusic() {
  initPageMusic(travelMusic, "travel");
}

function initWishesMusic() {
  initPageMusic(wishesMusic, "wishes");
}

function initPageMusic(music, pageName, playbackRate = 1, volumeBoost = 1) {
  if (page !== pageName || !music) return;
  music.loop = true;
  music.preload = "auto";
  music.playbackRate = playbackRate;
  configureMusicVolume(music, volumeBoost);
  try {
    music.load();
  } catch {
    // Some browsers can ignore eager audio loading before user interaction.
  }

  let started = false;
  const tryPlay = () => {
    if (started) return;
    started = true;
    const resume = music._audioContext?.state === "suspended"
      ? music._audioContext.resume().catch(() => {})
      : Promise.resolve();
    resume.then(() => {
      const play = music.play();
      if (play && typeof play.catch === "function") {
        play.catch(() => {
          started = false;
        });
      }
    });
  };

  document.addEventListener("pointerdown", tryPlay, { once: true, passive: true });
  document.addEventListener("keydown", tryPlay, { once: true, passive: true });
  window.addEventListener("pagehide", () => {
    music.pause();
  }, { once: true });
}

function configureMusicVolume(music, volumeBoost = 1) {
  if (!music) return;
  const boost = Math.max(1, Number(volumeBoost) || 1);
  if (boost <= 1) {
    music.volume = 1;
    return;
  }

  music.volume = 1;
  if (music.dataset.gainBoost === String(boost)) return;
  music.dataset.gainBoost = String(boost);

  try {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaElementSource(music);
    const gain = audioContext.createGain();
    gain.gain.value = boost;
    source.connect(gain);
    gain.connect(audioContext.destination);
    music._audioContext = audioContext;
    music._audioGain = gain;
  } catch {
    // Browsers that block Web Audio wiring still fall back to normal volume.
  }
}
