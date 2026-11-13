// 手動トリガー（デバッグ用）
//   npm run push -- "今日は傘いるよ" "☔ テスト"
import { sendToAll } from "./push-core.mjs";
import { loadEnv } from "./env.mjs";

loadEnv();

const body = process.argv[2] || "手動テスト通知です";
const title = process.argv[3] || "☔ 傘いるよ通知";

await sendToAll({ title, body, tag: "manual", url: "./" });
