const $ = (id) => document.getElementById(id);
const log = (msg) => { $("log").textContent = msg; console.log(msg); };

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

let registration = null;

async function boot() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    log("このブラウザは Web Push 非対応です。\niOS の場合は『ホーム画面に追加』してから開いてください。");
    $("enable").disabled = true;
    return;
  }
  // index.html と同じ階層に置く → scope はこのディレクトリ配下
  registration = await navigator.serviceWorker.register("./sw.js");
  await navigator.serviceWorker.ready;
  $("test").disabled = false;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    showSubscription(existing);
    log("通知は有効です。\n購読情報は下の『購読情報』から取り出せます。");
    $("enable").textContent = "通知を解除する";
  } else {
    log(`通知はまだ無効です。\n権限: ${Notification.permission}`);
  }
}

function showSubscription(sub) {
  $("subBox").hidden = false;
  $("sub").value = JSON.stringify(sub.toJSON(), null, 2);
}

async function enable() {
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
      $("subBox").hidden = true;
      $("enable").textContent = "通知を有効にする";
      log("通知を解除しました。");
      return;
    }

    // iOS はユーザー操作の中で requestPermission を呼ぶ必要がある
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      log(`通知が許可されませんでした（${permission}）。\n設定アプリから許可してください。`);
      return;
    }

    const key = window.VAPID_PUBLIC_KEY;
    if (!key || key.startsWith("PASTE_")) {
      log("config.js の VAPID_PUBLIC_KEY が未設定です。");
      return;
    }

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    showSubscription(sub);
    $("enable").textContent = "通知を解除する";
    log("通知を有効にしました。\n購読情報を subscriptions.json に追記してください。");
  } catch (e) {
    log("失敗: " + e);
  }
}

$("enable").addEventListener("click", enable);

$("test").addEventListener("click", async () => {
  if (Notification.permission !== "granted") {
    await Notification.requestPermission();
  }
  await registration.showNotification("☔ 今日は傘いるよ", {
    body: "降水確率 80%（テスト通知）",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: "rain",
  });
});

$("copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("sub").value);
  $("copy").textContent = "コピーした";
});

boot();
