import webpush from "web-push";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SUBS_PATH = new URL("../subscriptions.json", import.meta.url);

export function loadSubscriptions() {
  if (!existsSync(SUBS_PATH)) return [];
  const list = JSON.parse(readFileSync(SUBS_PATH, "utf8"));
  return Array.isArray(list) ? list : [];
}

export function configure() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:dev@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY が未設定です（.env か GitHub Secrets）");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

// 失効した購読（404/410）は subscriptions.json から自動で外す
export async function sendToAll(payload) {
  configure();
  const subs = loadSubscriptions();
  if (subs.length === 0) {
    console.log("購読が 0 件です。subscriptions.json に追記してください。");
    return { sent: 0, removed: 0 };
  }

  const body = JSON.stringify(payload);
  const alive = [];
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, body);
      sent++;
      alive.push(sub);
      console.log("OK  ", sub.endpoint.slice(0, 60) + "…");
    } catch (e) {
      const code = e.statusCode;
      if (code === 404 || code === 410) {
        console.log("期限切れのため削除:", sub.endpoint.slice(0, 60) + "…");
      } else {
        console.error(`NG (${code})`, sub.endpoint.slice(0, 60) + "…", e.body || e.message);
        alive.push(sub);
      }
    }
  }

  const removed = subs.length - alive.length;
  if (removed > 0) writeFileSync(SUBS_PATH, JSON.stringify(alive, null, 2) + "\n");
  console.log(`送信 ${sent}/${subs.length} 件`);
  return { sent, removed };
}
