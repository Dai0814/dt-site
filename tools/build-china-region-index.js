const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "assets", "china-regions.sql");
const outputPath = path.join(root, "assets", "china-region-index.json");

const sql = fs.readFileSync(inputPath, "utf8");
const rows = [];
const rowPattern = /\('([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','[^']*',(?:NULL|'[^']*')\)/g;
let match;

while ((match = rowPattern.exec(sql))) {
  const [, id, name, parentId, lon, lat] = match;
  const longitude = Number(lon);
  const latitude = Number(lat);
  if (!id || !name || !Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
  rows.push({ id, name, parentId, lon: longitude, lat: latitude });
}

const byId = new Map(rows.map((row) => [row.id, row]));
const genericNames = new Set(["市辖区", "县", "省直辖县级行政区划", "自治区直辖县级行政区划"]);
const suffixPattern = /(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|自治县|地区|盟|省|市|区|县|旗)$/g;

function getPath(row) {
  const pathRows = [];
  const seen = new Set();
  let current = row;

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    pathRows.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : null;
  }

  return pathRows.filter((item) => !genericNames.has(item.name));
}

function stripSuffix(value) {
  let output = value;
  let previous = "";
  while (output !== previous) {
    previous = output;
    output = output.replace(suffixPattern, "");
  }
  return output;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·.]/g, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const index = rows.map((row) => {
  const pathRows = getPath(row);
  const names = pathRows.map((item) => item.name);
  const fullName = names.join("");
  const shortName = stripSuffix(row.name);
  const compactFullName = names.map(stripSuffix).join("");
  const parentName = names.length > 1 ? names[names.length - 2] : "";
  const keys = unique([
    row.name,
    shortName,
    fullName,
    compactFullName,
    parentName && `${parentName}${row.name}`,
    parentName && `${stripSuffix(parentName)}${shortName}`,
  ]).map(normalize);

  return {
    id: row.id,
    name: row.name,
    shortName,
    fullName,
    lon: Number(row.lon.toFixed(6)),
    lat: Number(row.lat.toFixed(6)),
    level: names.length,
    keys: unique(keys),
  };
}).filter((item) => item.fullName && item.keys.length);

fs.writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(`Wrote ${index.length} regions to ${path.relative(root, outputPath)}`);
