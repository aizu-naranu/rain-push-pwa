# ☔ 傘いるよ通知（GitHub Pages 版）

朝7時に今日の降水確率をチェックして、雨なら Web Push で通知する PWA。

## 構成

GitHub Pages は静的ホスティングなので「サーバーに購読を保存」「朝7時のスケジューラ」は
置けない。そこを **リポジトリ内の JSON + GitHub Actions の cron** で代用している。
追加のサーバも有料サービスも不要。

```
ブラウザ (GitHub Pages)
  └ sw.js が push を受けて showNotification
購読情報 → subscriptions.json（リポジトリにコミット）
スケジューラ → .github/workflows/rain.yml（毎日 22:00 UTC = 7:00 JST）
天気 → Open-Meteo（APIキー不要・個人利用無料）
送信 → web-push（VAPID）
```

## セットアップ

```sh
npm install
npm run keys          # VAPID 鍵を生成
```

1. 出てきた**公開鍵**を `docs/config.js` に貼る
2. **秘密鍵**を GitHub → Settings → Secrets and variables → Actions
   - Secrets: `VAPID_PRIVATE_KEY`
   - Variables: `VAPID_PUBLIC_KEY` / `VAPID_SUBJECT`（`mailto:you@example.com`）
   - 任意の Variables: `LAT` `LON` `RAIN_THRESHOLD`（既定 東京・50%）
3. Settings → Pages → Source: `main` ブランチの `/docs`
4. 公開された URL をスマホで開く → 「通知を有効にする」
5. 画面下の**購読情報 JSON** をコピーして `subscriptions.json` の配列に追記 → commit & push

## 手動で通知を飛ばす（デバッグ）

```sh
# ローカルから
echo 'VAPID_PUBLIC_KEY=...'  >> .env
echo 'VAPID_PRIVATE_KEY=...' >> .env
echo 'VAPID_SUBJECT=mailto:you@example.com' >> .env

npm run push -- "今日は傘いるよ" "☔ テスト"
npm run rain -- --dry-run    # 天気だけ見て送らない
```

GitHub の Actions タブ → 「朝7時の雨チェック」→ Run workflow でも手動発火できる
（`message` を入れるとその本文、空なら天気判定）。

## ローカル確認

```sh
npm run serve   # http://localhost:8080
```

localhost は secure context 扱いなので Service Worker も通知も動く。

## iOS の注意

- iOS 16.4 以降、**ホーム画面に追加した PWA からのみ** Web Push が受け取れる。
  Safari のタブで開いただけでは購読できない。
- `Notification.requestPermission()` は**ユーザー操作の中**で呼ぶ必要がある（実装済み）。
- デモ当日は**インストール済みの実機**を用意して、通知が届く瞬間だけ見せるのが安全。

## 未確認

- 実機（iPhone）での通知受信は**まだ通していない**。実装後に一度必ず通すこと。
- Open-Meteo は実地確認済み（2026-11-13 東京で降水確率 0% / 最高 19.5℃ を取得）。
  しきい値の両分岐（送る / 送らない）も dry-run で確認済み。
- 実際の push 送信（web-push → 端末）は購読が 0 件のため未検証。
- GitHub Actions の cron は**混雑時に数分〜数十分遅れる**ことがある（Actions の仕様）。
  「ぴったり7時」が要るならスケジューラは別途検討。
