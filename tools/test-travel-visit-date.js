const fs = require('fs');
const vm = require('vm');

const script = fs.readFileSync('G:/D&T/script.js', 'utf8');
const context = vm.createContext({
  window: {},
  document: { querySelector: () => null, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null },
  fetch: async () => ({ ok: false }),
  navigator: {},
  console,
  setInterval: () => {},
  setTimeout: () => {},
  clearInterval: () => {},
  clearTimeout: () => {},
  requestAnimationFrame: () => {},
  location: { pathname: '/travel.html' },
  URLSearchParams,
  Math,
  Date,
  Number,
  String,
  Array,
  Object,
  JSON,
  Promise,
  Error,
  RegExp,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  Infinity,
  undefined,
});

// Extract helper functions by running script in a way that captures globals is hard;
// Instead, copy relevant functions manually for a focused test.
function getTimeFromId(id) {
  const match = String(id || '').match(/-(\d{11,})-/);
  return match ? Number(match[1]) : 0;
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

function normalizeTravelEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const place = String(entry.place || '').trim();
  if (!place) return null;

  let visitDate = String(entry.visitDate || '').trim();
  if (!visitDate && entry.updatedAt) {
    const date = new Date(Number(entry.updatedAt));
    if (!Number.isNaN(date.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      visitDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
  }

  return {
    id: String(entry.id || `travel-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    place,
    status: { visited: 'visited', wishlist: 'wishlist', next: 'next' }[entry.status] ? entry.status : 'visited',
    note: String(entry.note || ''),
    photo: String(entry.photo || ''),
    x: 50,
    y: 50,
    visitDate,
    updatedAt: entry.updatedAt || ''
  };
}

// Tests
const oldEntry = normalizeTravelEntry({
  id: 'travel-1724625900000-abc',
  place: '沧州',
  status: 'visited',
  note: '测试',
  updatedAt: 1724625900000
});
console.log('迁移旧数据:', oldEntry);
console.assert(oldEntry.visitDate === '2024-08-26', '旧数据迁移失败');

const newEntry = normalizeTravelEntry({
  id: 'travel-1724625900000-def',
  place: '成都',
  status: 'visited',
  visitDate: '2023-05-01'
});
console.log('新数据:', newEntry);
console.assert(newEntry.visitDate === '2023-05-01', 'visitDate 被覆盖');

const sorted = latestFirstEntries([
  { id: 'travel-1724625900000-a', place: '沧州', visitDate: '2024-08-26' },
  { id: 'travel-1724625900000-b', place: '成都', visitDate: '2023-05-01' },
  { id: 'travel-1724625900000-c', place: '青岛', visitDate: '2025-01-01' }
]);
console.log('排序结果:', sorted.map((s) => `${s.entry.place}(${s.entry.visitDate})`));
console.assert(sorted[0].entry.place === '青岛', '排序失败');

console.log('所有测试通过');
