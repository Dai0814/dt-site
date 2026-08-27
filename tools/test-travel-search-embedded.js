const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('G:/D&T/assets/china-region-index.json', 'utf8'));
const index = raw.map((item) => ({ ...item, keys: [] }));

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

function findChinaArea(value) {
  const queries = getVariants(value);
  if (!queries.length || !index.length) return null;

  const exact = index.find((item) => {
    const keys = getKeys(item);
    return queries.some((query) => keys.includes(query));
  });
  if (exact) return exact;

  const matches = index
    .map((item) => ({ item, score: scoreChinaAreaMatch(item, queries) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.item.fullName.length - b.item.fullName.length);

  return matches[0]?.item || null;
}

function scoreChinaAreaMatch(item, queries) {
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
    if (keys.some((key) => key.includes(query))) score = Math.max(score, 45);
    if (fullName.includes(query) || simpleFullName.includes(query)) score = Math.max(score, 35);
  });

  return score;
}

function placeFromCoordinates(name, lon, lat) {
  const x = 9 + ((lon - 73.5) / (135.1 - 73.5)) * 82;
  const y = 8 + ((53.8 - lat) / (53.8 - 18.1)) * 87;
  return { name, x: Math.max(4, Math.min(96, x)), y: Math.max(4, Math.min(96, y)) };
}

const qs = ['沧州', '石家庄', '杭州', '北京市', '北京', '海淀区', '九寨沟', '大理', '济南', '青岛', '上海', '广州', '深圳'];
for (const q of qs) {
  const area = findChinaArea(q);
  const point = area ? placeFromCoordinates(area.shortName || area.name, area.lon, area.lat) : null;
  console.log(q, '=>', area ? `${area.fullName} (${point.x.toFixed(1)}, ${point.y.toFixed(1)})` : 'NOT FOUND');
}
