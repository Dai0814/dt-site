const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const raw = fs
  .readFileSync(path.join(root, "assets", "china-svg-map.js"), "utf8")
  .replace(/^export default /, "")
  .replace(/;?\s*$/, "");
const map = JSON.parse(raw);
const colors = ["#7fc1df", "#4fa0c6", "#2f7197", "#66b6d7", "#255f87"];
const names = {
  anhui: "安徽",
  beijing: "北京",
  chongqing: "重庆",
  fujian: "福建",
  gansu: "甘肃",
  guangdong: "广东",
  guangxi: "广西",
  guizhou: "贵州",
  hainan: "海南",
  hebei: "河北",
  heilongjiang: "黑龙江",
  henan: "河南",
  hubei: "湖北",
  hunan: "湖南",
  "inner-mongolia": "内蒙古",
  jiangsu: "江苏",
  jiangxi: "江西",
  jilin: "吉林",
  liaoning: "辽宁",
  ningxia: "宁夏",
  qinghai: "青海",
  shaanxi: "陕西",
  shandong: "山东",
  shanghai: "上海",
  shanxi: "山西",
  sichuan: "四川",
  tianjin: "天津",
  xinjiang: "新疆",
  xizang: "西藏",
  yunnan: "云南",
  zhejiang: "浙江"
};

const paths = map.locations.map((location, index) => {
  const name = names[location.id] || location.name;
  return `    <path id="${location.id}" d="${location.path}" fill="${colors[index % colors.length]}"><title>${name}</title></path>`;
}).join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${map.viewBox}" role="img" aria-label="高清中国省级地图">
  <rect width="100%" height="100%" fill="#f8fcff"/>
  <g stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round">
${paths}
  </g>
</svg>
`;

fs.writeFileSync(path.join(root, "assets", "china-map.svg"), svg, "utf8");
console.log(`created assets/china-map.svg (${svg.length} bytes)`);
