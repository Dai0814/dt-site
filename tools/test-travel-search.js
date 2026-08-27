const fs = require('fs');

const index = JSON.parse(fs.readFileSync('G:/D&T/assets/china-region-index.json', 'utf8'));

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[·.]/g, '');
}

function simplify(value) {
  return normalize(value).replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|自治县|自治旗|地区|市辖区|省|市|区|县|旗|盟/g, '');
}

function getKeys(item) {
  if (Array.isArray(item.keys) && item.keys.length) return item.keys;
  return [item.name, item.shortName, item.fullName].map(normalize).filter(Boolean);
}

function getVariants(value) {
  return [...new Set([normalize(value), simplify(value)].filter(Boolean))];
}

function findExact(value) {
  const queries = getVariants(value);
  return index.find((item) => {
    const keys = getKeys(item);
    return queries.some((q) => keys.includes(q));
  });
}

function scoreMatch(item, queries) {
  const keys = getKeys(item);
  const fullName = normalize(item.fullName);
  const simpleFullName = simplify(item.fullName);
  const name = normalize(item.name);
  const shortName = normalize(item.shortName);
  let score = 0;
  queries.forEach((query) => {
    if (fullName.endsWith(query) || simpleFullName.endsWith(query)) score = Math.max(score, 70);
    if (name.includes(query)) score = Math.max(score, 60);
    if (shortName.includes(query)) score = Math.max(score, 55);
    if (keys.some((k) => k.includes(query))) score = Math.max(score, 45);
    if (fullName.includes(query) || simpleFullName.includes(query)) score = Math.max(score, 35);
  });
  return score;
}

function findScored(value) {
  const queries = getVariants(value);
  const matches = index
    .map((item) => ({ item, score: scoreMatch(item, queries) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.item.fullName.length - b.item.fullName.length);
  return matches[0]?.item || null;
}

const qs = ['沧州', '石家庄', '杭州', '北京市', '海淀区', '九寨沟', '大理'];
for (const q of qs) {
  console.log(q, '=>', findExact(q)?.fullName || findScored(q)?.fullName || 'NOT FOUND');
}
