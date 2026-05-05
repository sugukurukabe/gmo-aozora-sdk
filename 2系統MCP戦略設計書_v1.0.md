# 2系統MCP戦略設計書 v1.0

> **対象**：スグクル株式会社 二軸MCP戦略
> **目的1（内製）**：sugukuru-finance MCP の改造による業務革命、freee/MoneyForward 連携で社内実証 → 同業他社へ販売
> **目的2（外販）**：GMOあおぞらネット銀行 公認パートナー獲得 → 銀行顧客向け商用 SaaS
> **準拠**：MCP Spec 2025-11-25 + ext-apps 2026-01-26 + ext-auth (OAuth Client Credentials)
> **作成日**：2026-05-04

---

## 0. 戦略の核 — なぜ2系統に分けるか

### 0.1 1つに統合しない理由

「業務効率化用」と「商用パートナー用」を**1つのMCP**にまとめると、2つの致命的な罠にハマる：

**罠A：内製特化で外向けに使えない**
- スグクル独自の業務フロー（特定技能派遣、農業派遣、寮管理）に最適化すると、他社・他業界にとっては不要機能の塊になる
- GMO公認パートナー審査では「**汎用性**」と「**他のGMO顧客が使える**」が評価軸。スグクル特化のものは通らない

**罠B：汎用化で自社業務に刺さらない**
- GMO顧客一般向けに作ると、スグクル本業の痒い所に手が届かない
- 派遣スタッフの社保加入期限管理、在留期限と給与の連動など、「業界知識×銀行API」の融合が浅くなる

**結論**：**目的が違うMCPは、コードベース、ブランド、収益モデル、リリース経路すべてを分離**する。共通モジュールはライブラリ化して両方が import する。

### 0.2 2系統の定義

| 観点 | 系統①：内製業務革命 | 系統②：GMO公認商用 |
|---|---|---|
| **MCP名** | `sugukuru-finance-mcp` (改造) | `gmo-bank-flow-mcp` (新規) |
| **第一目的** | スグクル業務の毎月数十時間削減 | GMO顧客向け商用SaaSとして販売 |
| **顧客** | スグクル社内（dogfooding）→ 同業派遣会社 | GMO銀行の全API契約企業 |
| **収益モデル** | 同業派遣会社へのライセンス販売 | SaaS月額課金 + 派生開発受託 |
| **公開** | プライベート（社内）→ 限定パートナー | OSS（コア部分）+ 商用（高度機能）|
| **GMO関与** | 一顧客として銀行APIを利用するのみ | **パートナー認定取得、共同マーケティング** |
| **スピード** | 1ヶ月以内にスグクル業務に投入 | 3-4ヶ月かけて本格化 |
| **設計優先順位** | スグクル業務の痒い所 > 汎用性 | 汎用性 > スグクル業務 |

### 0.3 シナジー — 別系統だが同じ技術基盤

両者は**独立**だが、低レイヤの技術基盤を**共有ライブラリ**として括りだす：

```
@sugukuru/gmo-aozora-sdk        \# OSS, Apache-2.0
  ├─ OAuth Client Credentials 認証
  ├─ sunabar / 本番 切替
  ├─ レート制限・リトライ・タイムアウト
  ├─ Webhook 検証
  ├─ Zod レスポンス型
  └─ TypeScript SDK 風 API

         ↓ import

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ sugukuru-finance-mcp        │  │ gmo-bank-flow-mcp           │
│ (内製・業務特化)            │  │ (商用・汎用)                │
│                             │  │                             │
│ + 派遣業ドメイン知識        │  │ + 業界共通ワークフロー      │
│ + freee 統合（既存）         │  │ + freee 統合（オプション）   │
│ + sugukuru-core 連携        │  │ + Webhook イベントバス      │
│ + 在留期限・社保連動        │  │ + 監査ログ・SOC2           │
│ + 寮費自動天引             │  │ + マルチテナント           │
└─────────────────────────────┘  └─────────────────────────────┘
```

この共有SDKが**もう1つの戦略資産**になる。OSSとして公開すれば「sunabarで開発する人全員が依存する基盤ライブラリ」になり、GMO公認パートナー審査で**圧倒的に有利**な実績になる。

---

## 1. 系統①：sugukuru-finance-mcp 改造計画

### 1.1 既存資産の評価

スグクル現状（メモリより）：
- `sugukuru-finance` MCP が4サーバ分割アーキテクチャの一員として既に存在（Cloud Run asia-northeast1）
- freee API 連携済み（company_id: 10745310）
- GMOあおぞらネット銀行API利用申込書を提出済み、GCP Cloud NAT 設定済み（Connector: `sugukuru-connector`、Router: `sugukuru-router`、NAT: `sugukuru-nat`、本番IP `34.84.81.176`）
- Webhook対応済み計画あり
- 月次AR残高管理（2026-03-31時点で約¥50.88M）の課題あり

**結論**：完全な新規開発ではなく、`sugukuru-finance` MCP の **AI Native 経理執事化** が現実的。GMO本番接続が完了した瞬間に、既存の経理業務にインパクトを出せる。

### 1.2 MVPの最重要機能（毎月のスグクル業務で実際にペイする5つ）

派遣業×農業特定技能の毎月の経理ペインを徹底分析した結果、優先度はこの順：

**機能1：派遣先入金の自動消込（最重要）**
- 現状：64+ 派遣先から月次で振込、freee 売掛金消込が手作業、未払い検知も遅延
- After：GMO Webhook で入金即時検知 → 振込人名から派遣先推定（法人番号API活用）→ freee 該当売掛金を自動消込 → Slack `#finance` に通知
- **削減見込み**：月8-15時間
- **副次効果**：未払い顧客の早期検知（現在の AR 課題に直結）

**機能2：派遣スタッフ給与振込の AI 統合実行**
- 現状：MoneyForward で給与計算 → Excel 出力 → 銀行ポータルで振込ファイル作成 → 手動アップロード
- After：MoneyForward 給与確定 → MCP がClaudeに「150名分の給与振込、合計¥4,820万、内訳確認お願いします」と要約 → 承認で GMO 一括振込API実行 → 結果を Slack 通知
- **削減見込み**：月2-4時間
- **副次効果**：振込ミス・遅延の撲滅

**機能3：在留期限×給与の整合性チェック**
- 現状：人手で在留カード期限と雇用契約終了日と給与振込予定を突き合わせる
- After：sugukuru-core MCP（特定技能データ）と sugukuru-finance MCPが連動し、「在留期限切れの3名に来月分給与を振り込もうとしています」と自動アラート
- **削減見込み**：労務リスク回避（ヒューマンエラー1件 = 数十万円のコスト）
- **これは派遣業特化ならではの機能**で、外販時の差別化点

**機能4：寮費・前払い金の自動天引き**
- 現状：給与振込時に寮費・社保・前払い金を Excel で都度計算
- After：派遣スタッフごとの寮費・前払い金を sugukuru-core が保持、給与計算時に自動控除、控除後額を本人口座へ
- **削減見込み**：月3-5時間

**機能5：日次資金繰りダッシュボード**
- 現状：月初に経理が資金繰り表を Excel で更新、リアルタイム性ゼロ
- After：MCP App UI（`ui://sugu-finance/cashflow.html`）で当日残高 + 90日先までの予定入出金を可視化、AI が「7月10日に残高不足、対策を提案」
- **公式 cohort-heatmap-server パターン適用**

### 1.3 拡張ロードマップ

| Phase | 機能 | 期間 | スグクル業務影響 |
|---|---|---|---|
| **0** | 機能1（入金自動消込）+ 機能2（給与振込統合） | 2週 | 月10時間削減、初期実証 |
| **1** | 機能3（在留×給与）+ 機能4（寮費天引き） | 2週 | 派遣業特化、業務革命達成 |
| **2** | 機能5（資金繰りUI） + Slack/Discord 統合 | 3週 | 経営判断スピードUP |
| **3** | **同業他社向けライセンス販売開始** | – | 月¥30,000-100,000/社で5-10社 |
| **4** | 業界横展開（建設派遣・介護派遣・IT派遣） | – | 月¥1-3M ARR |

### 1.4 月額コスト

既存 Cloud Run + GMO本番接続を活用するため**追加コスト¥0**。GMO API利用料は基本無償（接続契約の年間費用のみ）。

### 1.5 同業他社販売の戦略

スグクル本業は**鹿児島県の特定技能農業派遣**でニッチだが、「派遣業×銀行API×freee統合」という基盤パッケージは派遣業界20,000社が同じペインを持つ。

販売モデル：
- **コア（OSS）**：機能1, 2 のみOSS化、誰でも自社実装可能
- **業界版（有料）**：機能3, 4, 5 + 派遣業界マスタ（業種コード等） = 月¥50,000
- **エンタープライズ**：オンプレ + カスタマイズ + サポート = 月¥300,000

このモデルは sugukuru-finance MCP と内製版を**コードベースで分離せず**、機能フラグでOSS/Pro/Enterprise を切り分け。スグクル自身は**OSS版を社内で使い、コミット権を持つ唯一の企業**として継続的に進化させる。

---

## 2. 系統②：gmo-bank-flow-mcp（新規・商用・GMO公認狙い）

### 2.1 戦略コンセプト

**「sunabar コミュニティで開発者のスタンダードになるMCP」を作る**。これが GMO 公認パートナー認定への最短ルート。

GMOパートナー認定要件（2026年4月時点、調査結果）：
- 当社銀行APIを使ったサービス・システム開発経験
- 開発力・セキュリティ対策の観点で「厳密に審査」
- パートナー認定後は**WebサイトでGMO公式に紹介**される（案件マッチングは行わない方針、つまりブランド露出のみ）

つまり、GMO顧客が**実際に使っている**実績と、**セキュリティ的に銀行が認める**水準の両方が必要。

### 2.2 「他にまだない、圧倒的先進性」の正体

調査の結果、世界の銀行MCP実装は5パターンに分類できる：

| パターン | 例 | 限界 |
|---|---|---|
| 単純REST→MCPラッパ | UK Open Banking PoC、Mercury Banking | 単なるツール並列、AIに任せきり |
| Plaidラッパ | BankSync | 複数銀行統合だが日本未対応 |
| 投資銀行特化 | Anthropic financial-services-plugins | データ照会専用、業務遂行なし |
| 暗号通貨/取引 | Coinbase, Solana等 | 銀行業務とは別軸 |
| 大規模BaaS基盤 | Open Bank Project | 重厚、開発者向けでない |

**全ての実装に欠けているもの**＝**「銀行業務を MCP App UI で**人間中心**にデザインしている」**。

GMOの強みは「バーチャル口座 + Webhook + つかいわけ口座」という3つの**強力な機能の組合せ**。これらを**MCP App でビジュアル化**し、「**振込稟議AI**」「**入金消込ダッシュボード**」「**つかいわけ口座マネージャー**」を1つのMCPに統合する。

### 2.3 MCPの3つのコア機能

**機能A：Smart Reconciliation Hub（賢い消込ハブ）**
- 受領請求書PDFを読み込ませる → AIが項目抽出
- バーチャル口座を案件ごとに動的発行
- Webhook で入金即時検知 → 案件×振込人名×金額から自動マッチング
- 消込結果を MCP App UI で確認、必要な場合のみ承認操作

**この機能の革新性**：従来、消込は「**入金後**に人間が突き合わせる」作業だった。本MCPは「**入金前にバーチャル口座を発行する**」プッシュ型に転換し、入金時には99%自動消込される。

**機能B：Approval Flow Engine（振込稟議エンジン）**
- 振込前に**Slack/Teams/Discord/メール**で承認フロー
- 「5万円超は2名承認」等のルールエンジン
- 承認チャネル多様性（GMO単独では絶対作らない）
- 全プロセスを監査ログDB化（J-SOX/内部統制対応）

**機能C：Sub-Account AI Manager（つかいわけ口座 AI）**
- ユーザーが自然言語で「給与の20%を税金引当に、5%を投資積立に」と指示
- AI がつかいわけ口座を自動操作、月次レポート生成
- **個人事業主・小規模法人**にとっての「自動家計仕分」を実現

### 2.4 セキュリティ設計（GMO審査クリア要件）

GMO公認パートナーになるためのセキュリティ要件は以下を満たす：

| 要件 | 実装 |
|---|---|
| OAuth 2.0/OpenID Connect 認証 | ext-auth Client Credentials を採用、`@sugukuru/gmo-aozora-sdk` で実装 |
| 通信暗号化 | TLS 1.3、HSTS、HPKP 相当 |
| トークン保護 | Cloud KMS で暗号化保存、メモリ滞在最小化 |
| ログ監査 | Cloud Logging + 改ざん検知ハッシュチェーン |
| アクセス制御 | RBAC、最小権限、IP制限（必要に応じ） |
| 入力検証 | Zod スキーマで全API入力検証 |
| レート制限 | token-bucket、GMO API制限の80%以下に自主規制 |
| 障害設計 | Webhook再送、トランザクション原子性、冪等性キー |
| 個人情報保護 | PII最小化、ログマスキング、保持期間管理 |
| **MCP特有** | **Elicitation URL Mode のフィッシング対策（公式 MUST 要件）を完全実装** |

### 2.5 MCP App UI 設計（差別化の核）

**dashboard.html — 経営者の毎朝の3秒ダッシュボード**

```
┌──────────────────────────────────────────────────────────────────┐
│ 🏦 GMO Bank Flow                  ⚠ 承認待ち2件 / 入金未消込3件 │
├──────────────────┬───────────────────────────────────────────────┤
│  メイン口座      │  消込待ち入金（バーチャル口座入金）            │
│  ─────────       │  ┌──────────────────────────────────────────┐ │
│  ¥48,250,000     │  │ 鹿児島中央青果 → VA-001 (¥1,250,000)    │ │
│                  │  │ 推定: 5月分大根納品代金 [請求書 #INV-321]│ │
│  つかいわけ口座  │  │ [自動消込実行] [手動編集]                │ │
│  ─────────       │  └──────────────────────────────────────────┘ │
│  運転資金 32M    │  ┌──────────────────────────────────────────┐ │
│  税金引当 8M     │  │ 不明な振込元 → 主口座 (¥80,000)          │ │
│  予備 8M         │  │ 推定なし [調査中]                        │ │
│                  │  └──────────────────────────────────────────┘ │
│  90日キャッシュ  │                                                │
│  フロー予測      │  承認待ち振込                                  │
│  ─────────       │  ┌──────────────────────────────────────────┐ │
│  6/01: 42M       │  │ ○○商事 ¥850,000                         │ │
│  6/15: 35M ⚠     │  │ 申請: 経理山田 / 用途: 設備購入           │ │
│  7/01: 28M ⚠⚠   │  │ ルール: 5万円超 → 2名承認必要             │ │
│  [詳細グラフ]    │  │ [承認] [差戻] [詳細]                     │ │
│                  │  └──────────────────────────────────────────┘ │
└──────────────────┴───────────────────────────────────────────────┘
出典: GMOあおぞらネット銀行 銀行API（最終更新: 2026-05-04 09:23）
```

**reconciliation-detail.html — 消込ワークフロー**

公式 patterns.html の `requestDisplayMode("fullscreen")` を使用。詳細にズームイン。

**approval-flow.html — 承認フローカンバン**

カンバン形式（申請→承認待ち→承認済→実行→完了）で振込ライフサイクルを可視化。

### 2.6 ロードマップ

| Phase | 機能 | 期間 | 月額 |
|---|---|---|---|
| **0** | sunabar連携、機能C（つかいわけ口座AI）のみOSS版 | 3週 | ¥0（sunabar） |
| **1** | 機能A（消込ハブ）の本番接続版 | 3週 | ¥500 |
| **2** | 機能B（承認フロー）+ MCP App UI | 4週 | ¥800 |
| **3** | **GMO公認パートナー申請、審査対応** | 4-6週 | ¥1,000 |
| **4** | **公認後、商用ローンチ**：月額¥4,800（個人事業主）〜¥38,000（法人） | – | 収益化 |
| **5** | エンタープライズ層：監査・SAML SSO・専用ドメイン | – | 月¥150,000+ |
| **6** | 銀行代理業 取得検討（ラクスルバンクモデル） | – | – |

### 2.7 GMO公認パートナー獲得への道筋

**Step 1（Phase 0-1）**：sunabar API実験場で完全動作する OSS版を公開し、GitHub・X・Zennで露出
**Step 2（Phase 2）**：sunabar コミュニティイベント（年6-8回開催）に登壇、MCPの可能性をデモ
**Step 3（Phase 3）**：本番API接続契約（既に申請済み）→ 機能A・B本番運用開始 → 自社（スグクル）が最初のユーザー
**Step 4**：1〜3社の他事業者に試用してもらい、実績作り
**Step 5**：パートナー申請書類を提出、審査
**Step 6**：認定取得、GMOサイトで紹介、共同マーケティング

タイムライン全体：**6-12ヶ月**

### 2.8 収益モデル試算

```
ARR シミュレーション（Phase 4-5 完了2年後）

個人事業主層 ¥4,800 × 800ユーザー    = 月 ¥3,840,000
法人層 ¥18,000 × 200ユーザー        = 月 ¥3,600,000  
法人層+ ¥38,000 × 50ユーザー        = 月 ¥1,900,000
エンタープライズ ¥150,000 × 10社    = 月 ¥1,500,000
─────────────────────────────────────────────────────
合計                                = 月 ¥10,840,000
年間 ARR                            = ¥130,080,000
```

GMO銀行のスタンダードAPI契約数は2021年時点で137社、現在は数百社規模に拡大。BaaS by GMOあおぞら契約数は累計600件突破（2024年）。**本MCPは、これら数百〜千の事業者全てに刺さる可能性**。

---

## 3. 共有ライブラリ：@sugukuru/gmo-aozora-sdk

両系統のMCPが import する低レイヤSDK。Apache-2.0でOSS公開。

### 3.1 提供機能

```typescript
// 認証
import { createGmoAuth } from "@sugukuru/gmo-aozora-sdk/auth";
const auth = await createGmoAuth({
  mode: "production" | "sunabar",
  clientId: "...",
  clientSecret: "...",
  scope: "...",
});

// 残高照会
import { Balances } from "@sugukuru/gmo-aozora-sdk/balances";
const balance = await Balances.get(auth, accountId);

// 入出金明細
import { Transactions } from "@sugukuru/gmo-aozora-sdk/transactions";
const txs = await Transactions.list(auth, { from: "2026-04-01", to: "2026-04-30" });

// バーチャル口座
import { VirtualAccounts } from "@sugukuru/gmo-aozora-sdk/virtual-accounts";
const va = await VirtualAccounts.create(auth, { displayName: "案件001" });

// 振込
import { Transfers } from "@sugukuru/gmo-aozora-sdk/transfers";
const result = await Transfers.execute(auth, { ... });

// つかいわけ口座
import { SubAccounts } from "@sugukuru/gmo-aozora-sdk/sub-accounts";
await SubAccounts.transfer(auth, { from: "main", to: "tax-reserve", amount: 50000 });

// Webhook検証
import { verifyWebhook } from "@sugukuru/gmo-aozora-sdk/webhook";
const event = verifyWebhook(req.body, req.headers, secret);
```

### 3.2 OSSとして公開する戦略的理由

このSDKをOSSにすることで：
1. **sunabarで開発する全ての人がスグクル製ライブラリを使う**世界が作れる
2. GMOから見て「日本のsunabarエコシステムに最大貢献している企業」と認識される
3. パートナー認定審査で「**実績**」「**コミュニティ貢献**」「**セキュリティ実装力**」全てを満たす圧倒的証拠になる
4. 系統①と系統②の両方で再利用できるので、開発工数が半減する

---

## 4. 実装タイムライン全体像（並走）

```
2026年5月  6月    7月    8月    9月    10月   11月   12月

系統①（内製業務革命）
  Phase 0 ━━━━━┓
  Phase 1     ━━━━━━━┓
  Phase 2          ━━━━━━━━━┓
  Phase 3                ━━━━━━━━━━━━━━━━━━━━━━━━━━(同業販売)

系統②（GMO公認・商用）
  共有SDK ━━━┓
  Phase 0     ━━━━━━━┓
  Phase 1            ━━━━━━━━━┓
  Phase 2                  ━━━━━━━━━━━━┓
  Phase 3                          ━━━━━━━━━━━━━━━━━━━(GMO審査)
  Phase 4                                          ━━━━━━━━(商用ローンチ)
```

5月：共有SDK着手 + 系統①Phase 0
6月：系統①Phase 1 + 系統②Phase 0
7月：系統①Phase 2 + 系統②Phase 1
8月：系統②Phase 2、系統①の同業販売開始
9-10月：系統②Phase 3（GMO審査）
11-12月：系統②Phase 4 商用ローンチ、GMO公認パートナー認定

---

## 5. 各系統のプロジェクト構造

### 5.1 系統①：sugukuru-finance-mcp（既存改造）

```
sugukuru-finance-mcp/                       \# 既存リポジトリを継続
├── src/
│   ├── adapters/
│   │   ├── freee.ts                        \# 既存
│   │   ├── moneyforward.ts                 \# 既存
│   │   ├── sugukuru-core.ts                \# 既存（特定技能データ連携）
│   │   └── gmo-bank.ts                     \# 新規（@sugukuru/gmo-aozora-sdk使用）
│   ├── tools/
│   │   ├── (既存ツール)
│   │   ├── reconcile-incoming-payment.ts   \# 新規：入金自動消込
│   │   ├── execute-payroll-batch.ts        \# 新規：給与一括振込
│   │   ├── check-residence-payroll.ts      \# 新規：在留×給与チェック
│   │   ├── apply-dorm-deduction.ts         \# 新規：寮費天引き
│   │   └── show-cashflow-dashboard.ts      \# 新規：MCP App UI起動
│   ├── workflows/                          \# 新規ディレクトリ
│   │   ├── monthly-billing-cycle.ts        \# 月次請求サイクル
│   │   └── payroll-cycle.ts                \# 月次給与サイクル
│   └── ui/
│       └── cashflow.html                   \# Phase 2
└── ...
```

### 5.2 系統②：gmo-bank-flow-mcp（新規）

```
gmo-bank-flow-mcp/                          \# 新規リポジトリ
├── .cursor/
│   └── rules/
│       ├── 00-project.mdc
│       ├── 01-design-principles.mdc
│       ├── 02-mcp-tool-rules.mdc
│       ├── 03-security-requirements.mdc    \# GMO審査クリア要件
│       ├── 04-resources-uri-scheme.mdc
│       └── 05-data-license.mdc
├── AGENTS.md
├── README.md (英)
├── README.ja.md (日)
├── LICENSE
├── SECURITY.md                             \# 脆弱性報告先・セキュリティ仕様
├── CHANGELOG.md
├── package.json
├── tsconfig.json
├── biome.json
├── vitest.config.ts
├── vite.config.ts                          \# Phase 2
├── Dockerfile
├── server.ts
├── src/
│   ├── server/
│   │   ├── create-server.ts
│   │   ├── transport-http.ts
│   │   └── transport-stdio.ts
│   ├── tools/
│   │   ├── _registry.ts
│   │   ├── model-visible/
│   │   │   ├── create-virtual-account.ts
│   │   │   ├── reconcile-payment.ts
│   │   │   ├── prepare-transfer.ts
│   │   │   ├── execute-approved-transfer.ts
│   │   │   ├── manage-sub-account.ts
│   │   │   ├── get-balance-summary.ts
│   │   │   ├── list-pending-approvals.ts
│   │   │   └── show-cashflow-forecast.ts
│   │   └── app-only/
│   │       ├── poll-webhook-events.ts
│   │       ├── read-invoice-pdf-chunks.ts
│   │       ├── save-pinned-vendor.ts
│   │       ├── load-pinned-vendor.ts
│   │       ├── expand-transaction-detail.ts
│   │       ├── trigger-approval-notification.ts
│   │       └── audit-log-fetch.ts
│   ├── resources/
│   │   ├── account-resource.ts             \# account://
│   │   ├── virtual-account-resource.ts     \# va://
│   │   ├── transfer-resource.ts            \# transfer://
│   │   └── audit-log-resource.ts           \# audit://
│   ├── prompts/
│   │   ├── morning-finance-brief.ts
│   │   ├── monthly-reconciliation.ts
│   │   ├── tax-allocation-plan.ts
│   │   └── cash-shortage-alert.ts
│   ├── webhook/
│   │   ├── handler.ts                      \# Webhook受信
│   │   ├── verifier.ts                     \# 署名検証
│   │   ├── matcher.ts                      \# 入金→案件マッチング
│   │   └── event-bus.ts                    \# イベント分配
│   ├── matching/
│   │   ├── invoice-extractor.ts            \# PDF→請求書項目
│   │   ├── corporate-matcher.ts            \# 振込人名→法人番号API
│   │   └── confidence-scorer.ts
│   ├── approval/
│   │   ├── rule-engine.ts                  \# 5万円超は2名承認等
│   │   ├── notification-channels.ts        \# Slack/Teams/Discord/Email
│   │   └── audit-logger.ts                 \# 改ざん検知ハッシュチェーン
│   ├── elicitation/
│   │   ├── form-vendor.ts
│   │   ├── form-allocation.ts
│   │   └── url-pro-upgrade.ts
│   ├── ui/                                 \# Phase 2
│   │   ├── dashboard.html
│   │   ├── dashboard.tsx
│   │   ├── reconciliation-detail.html
│   │   ├── reconciliation-detail.tsx
│   │   ├── approval-flow.html
│   │   ├── approval-flow.tsx
│   │   └── components/
│   ├── lib/
│   │   ├── cache.ts
│   │   ├── rate-limiter.ts
│   │   ├── encryption.ts                   \# Cloud KMS連携
│   │   └── logger.ts                       \# 構造化ログ
│   └── types/
│       ├── transfer.ts
│       ├── reconciliation.ts
│       ├── approval.ts
│       └── audit.ts
├── public/
│   └── .well-known/
│       └── mcp-server.json                 \# Server Card
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/                           \# セキュリティ検証専用
│   └── conformance/
└── docs/
    ├── architecture.md
    ├── security.md                         \# 脆弱性詳細・脅威モデル
    ├── partner-application.md              \# GMO審査用ドキュメント雛形
    ├── api-reference.md
    └── differentiation.md
```

---

## 6. リスクとミティゲーション

| リスク | 系統 | ミティゲーション |
|---|---|---|
| GMO本番API接続が遅延 | 両方 | sunabarで先行開発、申請完了後すぐ本番切替 |
| GMOパートナー審査落選 | ② | OSS版だけでも商用化可能（OAuth Client Credentials個別契約モデル） |
| 競合MCPの登場 | 両方 | 共有SDK公開で**先行者ブランド**を確立、追随困難に |
| セキュリティ事故 | 両方 | GMO審査クリア要件を最初から実装、保険加入 |
| スグクル本業逼迫で開発時間不足 | 両方 | 系統①の社内導入で**業務時間が逆に増える**ループに乗る |
| MCP仕様変更 | 両方 | 公式 spec 2025-11-25 stable、後方互換は維持される |

---

## 7. 結論：3つの推奨事項

### 推奨1：来週から系統①Phase 0に着手
既存 `sugukuru-finance` MCP のリポジトリをそのまま使い、`gmo-bank.ts` adapter を追加して、機能1（入金自動消込）を実装。**GMO本番接続が完了したら即動く**状態にしておく。スグクル本業の経理が**月10時間削減**を体感する瞬間が、この戦略の正しさの証明になる。

### 推奨2：共有SDK `@sugukuru/gmo-aozora-sdk` を最優先で着手
これは系統①にも系統②にも、また将来の他社にも使われる戦略資産。**1週間で MVP** を出して GitHub にPushすれば、それ自体がGMOコミュニティへの最初の挨拶になる。

### 推奨3：系統② Phase 0 は系統①の社内実証完了後に着手
系統①でスグクルが**自分自身で月数十時間削減を実証**してから系統②に着手する方が、商用版の機能設計が**現実の業務に裏打ちされた**ものになる。3-4ヶ月後に系統②本番リリース時、「**自社で1年使い続けてるノウハウを抽象化したMCP**」として圧倒的な説得力を持つ。

---

## 8. 次の選択肢

3つの方向性で深掘り可能です：

**A. 系統①の sugukuru-finance MCP 改造の詳細設計書**
- `gmo-bank.ts` adapter 完全コード
- 機能1〜5の具体ツール実装、freee連携の正確なワークフロー
- 月次経理サイクルの全自動化フロー図
- 同業販売モデルの料金設計

**B. 共有SDK `@sugukuru/gmo-aozora-sdk` の完全設計書**
- TypeScript SDK API リファレンス
- sunabar/本番モード切替実装
- Webhook 検証・冪等性キー設計
- セキュリティ設計（KMS、監査ログ、レート制限）

**C. 系統②の gmo-bank-flow-mcp 完全設計書**
- GMO公認パートナー申請に向けた完全な技術仕様書
- セキュリティ詳細・脅威モデル
- MCP App UI 3画面の詳細実装
- 商用化・課金・SLA設計

どれから進めますか？順番におすすめは **B → A → C**：基盤SDK が両方を支えるので最初に固める、次にスグクル業務で実証、最後に商用化。
