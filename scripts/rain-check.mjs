// 今日の降水確率を Open-Meteo で見て、しきい値以上なら push を送る。
// GitHub Actions から毎朝叩かれる。手元でも `npm run rain` で試せる。
import { sendToAll } from "./push-core.mjs";
import { loadEnv } from "./env.mjs";

loadEnv();

const LAT = process.env.LAT || "35.6895";       // 既定: 東京
const LON = process.env.LON || "139.6917";
const TZ = process.env.TZ_NAME || "Asia/Tokyo";
const THRESHOLD = Number(process.env.RAIN_THRESHOLD || 50); // %
const DRY_RUN = process.argv.includes("--dry-run");

const url =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${LAT}&longitude=${LON}` +
  "&daily=precipitation_probability_max,precipitation_sum,temperature_2m_max" +
  `&timezone=${encodeURIComponent(TZ)}&forecast_days=1`;

const res = await fetch(url);
if (!res.ok) {
  console.error("Open-Meteo 取得失敗:", res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
const daily = data.daily || {};
const prob = daily.precipitation_probability_max?.[0];
const mm = daily.precipitation_sum?.[0];
const tmax = daily.temperature_2m_max?.[0];
const date = daily.time?.[0];

console.log(`${date} 降水確率 ${prob}% / 降水量 ${mm}mm / 最高 ${tmax}℃ (しきい値 ${THRESHOLD}%)`);

if (typeof prob !== "number") {
  console.error("降水確率が取れませんでした:", JSON.stringify(daily));
  process.exit(1);
}

if (prob < THRESHOLD) {
  console.log("雨は降らなさそうなので通知しません。");
  process.exit(0);
}

const payload = {
  title: "☔ 今日は傘いるよ",
  body: `降水確率 ${prob}%（予想降水量 ${mm}mm・最高 ${tmax}℃）`,
  tag: "rain",
  url: "./",
};

if (DRY_RUN) {
  console.log("dry-run:", payload);
  process.exit(0);
}

await sendToAll(payload);
