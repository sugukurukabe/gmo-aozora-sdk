# Sunabar 実証ガイド

GMO Aozora Net Bank のサンドボックス環境（Sunabar）で SDK を検証する手順書です。
Sunabar での実証が完了したら `docs/sunabar-validation-report-template.md` に結果を記録し、
v1.0 リリース判断の証跡とします。

---

## 前提条件

- Node.js 20+ がインストール済み
- `pnpm install` 済み (`pnpm run verify` が通る状態)
- ブラウザでアクセスできる PC
- ポート 8080 が空いている（OAuth コールバック用）

---

## Step 1: Sunabar アプリ登録

1. GMO あおぞらネット銀行 Open API 開発者ポータルにアクセス
   （URL は GMO より提供されたものを使用）
2. アカウント作成 → ログイン
3. 「アプリケーション登録」から新しいアプリを作成:
   - Redirect URI: `http://localhost:8080/callback`
   - 必要スコープ: `private:account`、`private:offline_access`
     （振込テストを行う場合はさらに `private:transfer`）
4. 発行された **Client ID** と **Client Secret** をメモ

---

## Step 2: ドライラン確認（認証情報不要）

```bash
pnpm sunabar:dry-run
```

期待される出力:

```
Sunabar validation harness
Mode: dry-run
Environment: GMO_CLIENT_ID=missing, ...
PKCE session prepared: { stateLength: 43, ... authorizationUrlHost: 'api.sunabar.gmo-aozora.com' }
No network calls were made.
```

これが通れば SDK の基本的な初期化は正常です。

---

## Step 3: アクセストークン取得（OAuth PKCE フロー）

認証情報を環境変数にセットしてから OAuth コールバックサーバーを起動:

```bash
# PowerShell の場合
$env:GMO_CLIENT_ID = "your-client-id"
$env:GMO_CLIENT_SECRET = "your-client-secret"
pnpm sunabar:auth
```

```bash
# bash/zsh の場合
GMO_CLIENT_ID=your-client-id GMO_CLIENT_SECRET=your-client-secret pnpm sunabar:auth
```

スクリプトが認証 URL を表示します。ブラウザでその URL を開き、Sunabar にログインして認可します。
コールバックが成功すると、トークンが端末に表示されます:

```
=== Token obtained ===
Scope: private:account private:offline_access
Expires at: 2026-05-05T09:00:00.000Z

--- Run this export, then use pnpm sunabar:readonly ---
export GMO_ACCESS_TOKEN="..." GMO_CLIENT_ID="..." GMO_CLIENT_SECRET="..."
```

> **セキュリティ注意**: トークンはディスクに保存されません。セッション内で使い切ってください。
> ターミナルの履歴や画面録画にトークン値が残らないよう注意してください。

---

## Step 4: Read-only API 検証

`GMO_ACCOUNT_ID` は Sunabar にログインして確認できる口座番号（数字のみ）を指定:

```bash
# PowerShell
$env:GMO_ACCESS_TOKEN = "ここにトークン"
$env:GMO_ACCOUNT_ID = "ここに口座番号"
pnpm sunabar:readonly
```

```bash
# bash/zsh
GMO_ACCESS_TOKEN=... GMO_ACCOUNT_ID=... pnpm sunabar:readonly
```

期待される出力:

```
Readonly Sunabar checks completed: {
  accountCount: 1,
  accountId: '...',
  bookBalance: '100000'  ← bigint として正常にパースされた残高（円）
}
```

---

## Step 5: 結果の記録

`docs/sunabar-validation-report-template.md` の以下のセクションを埋めてください:

- **Session**: 日付、実行コマンド、Node.js バージョン
- **Readonly API Validation**: 各エンドポイントの結果
- **Findings**: 不一致や想定外の挙動があれば記録（スキーマの field 名など）

> **重要**: アクセストークン、口座番号の完全な値、顧客名は絶対に記録しないでください。
> field 名と型のみ記録します。

---

## Step 6: Write 操作の検証（オプション）

振込系の API をテストする場合:

1. `private:transfer` スコープも含めて認可（Step 2–3 を再実行）
2. Sunabar の振込先を GMO あおぞらネット銀行の口座に設定
3. `examples/payroll-batch.ts` を参考に、**金額を最小値（1円）** で実行

```bash
# 振込見積もりのみ（実際の振込は発生しない）
# examples/payroll-batch.ts を直接編集して transferOnly:false を true に変更
```

---

## Step 7: Webhook 検証（オプション）

1. Sunabar の管理画面で Webhook エンドポイントを設定
2. `examples/webhook-express.ts` を起動:

```bash
WEBHOOK_SECRET=your-hmac-secret pnpm exec tsx examples/webhook-express.ts
```

3. ngrok などでローカルを公開してエンドポイントに登録:

```bash
ngrok http 3000
```

4. Sunabar から入金イベントをトリガーし、署名検証が通ることを確認

---

## よくある問題

| 症状 | 原因 | 対処 |
|---|---|---|
| `Cannot find package '@sugukuru/gmo-aozora-sdk'` | workspace リンクが切れている | `pnpm install` を再実行 |
| OAuth 認可画面でエラー | Redirect URI が未登録 | 開発者ポータルで `http://localhost:8080/callback` を追加 |
| `GmoAozoraAuthError: UNAUTHORIZED` | アクセストークン期限切れ | `pnpm sunabar:auth` を再実行してトークン更新 |
| `GmoAozoraValidationError` | 実 API のレスポンスがスキーマと不一致 | Field 名をメモして Findings に記録 → Issue として報告 |
| ポート 8080 が使用中 | 他のプロセスが占有 | `GMO_REDIRECT_URI=http://localhost:9090/callback` で上書き |

---

## 参考

- [GMO あおぞら Open API 仕様](https://api.gmo-aozora.com) — 社内参照のみ
- [`docs/sunabar-validation-report-template.md`](sunabar-validation-report-template.md) — 記録テンプレート
- [`docs/release-operations.md`](release-operations.md) — Sunabar 通過後の npm publish 手順
- [`examples/sunabar-dry-run.ts`](../examples/sunabar-dry-run.ts) — 実証ハーネス本体
