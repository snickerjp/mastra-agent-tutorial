# AWS Bedrock対応 調査結果

## 結論

**✅ 現在のコードは最小限の変更でBedrock対応可能**

- Mastraは`@ai-sdk/amazon-bedrock`を通じてBedrockをサポート済み
- IAM Role認証により、APIキー管理が完全に不要
- **実装方式**: 環境変数 + 設定ファイル（`src/config/models.ts`）でプロバイダーを切り替え
- コード変更は主に `getModel()` の導入と環境変数の設定のみ

---

## 必要な変更点

### 1. パッケージのインストール

```bash
npm install
```

**注**: `@ai-sdk/amazon-bedrock` は既に `package.json` の `dependencies` に含まれています。

### 2. コード変更（各ファイル）

#### 変更前（OpenAI）

```typescript
import { Agent } from "@mastra/core/agent";

const agent = new Agent({
  id: "research-agent",
  name: "research-agent",
  instructions: "...",
  model: "openai/gpt-4o-mini",  // ← OpenAI指定
});
```

#### 変更後（Bedrock）

```typescript
import { Agent } from "@mastra/core/agent";
import { getModel } from "../config/models.js";  // ← 追加

const agent = new Agent({
  id: "research-agent",
  name: "research-agent",
  instructions: "...",
  model: getModel(),  // ← 環境変数で切り替え
});
```

**重要**: `getModel()` は `process.env.AI_PROVIDER` に基づいてモデルを返します。

---

## 変更が必要なファイル一覧

### Chapter 1

**`src/chapter1/agent.ts`**

```typescript
// 変更前
model: "openai/gpt-4o-mini",

// 変更後
import { getModel } from "../config/models.js";
// ...
model: getModel(),
```

### Chapter 2

**`src/chapter2/steps.ts`** (4箇所)

```typescript
// 各エージェント（researchAgent, outlineAgent, writeAgent, reviewAgent）
import { getModel } from "../config/models.js";
// ...
model: getModel(),
```

### Chapter 3

**`src/chapter3/patterns.ts`** (3箇所)

```typescript
// 各パターン（patternA, patternB, patternC）
import { getModel } from "../config/models.js";
// ...
model: getModel(),
```

**`src/chapter3/scorers.ts`** (2箇所)

```typescript
// 各スコアラー
import { getModel } from "../config/models.js";
// ...
model: getModel(),
```

### Chapter 4

**`src/chapter4/run.ts`** (2箇所)

```typescript
// agentWithoutMemory, agentWithMemory
import { getModel } from "../config/models.js";
// ...
model: getModel(),
```

### 各Chapterの run.ts

**`src/chapter*/run.ts`** (4ファイル)

```typescript
// ファイル先頭に追加
import "dotenv/config";
```

---

## IAM Role認証の仕組み

### AWS SDK Credentials Chain

AI SDKの`@ai-sdk/amazon-bedrock`は、AWS SDKの認証チェーンを自動的に使用します:

1. **環境変数**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
2. **IAM Role** (SageMaker Studio等): 自動的にInstance Profile/Execution Roleから取得
3. **Credential Provider**: カスタム認証プロバイダー

### SageMaker Studioでの動作

SageMaker Studio環境では:

```typescript
// コード内で認証情報を指定する必要なし
const agent = new Agent({
  model: "bedrock/amazon.nova-lite-v1:0",
  // IAM Roleが自動的に使用される
});
```

✅ **運用簡素化**: AWS認証情報（アクセスキー等）の環境変数設定が不要
- `.env`に`AWS_ACCESS_KEY_ID`や`AWS_SECRET_ACCESS_KEY`等を定義する必要なし
- IAM Execution Roleが自動適用され、認証情報の環境変数設定を削減

**注**: プロバイダー選択（`AI_PROVIDER=bedrock`）やリージョン指定（`AWS_REGION`）等の設定用環境変数は引き続き必要です。

---

## 利用可能なBedrockモデル

### Claude Haiku 4.5（推奨・最新）

```typescript
model: "bedrock/anthropic.claude-haiku-4-5-20251001-v1:0"
```

- **リリース**: 2025年10月
- **コスト**: 入力 $1.00/1M tokens, 出力 $5.00/1M tokens
- **速度**: 高速
- **用途**: 軽量タスク、ハンズオン向け
- **利用可能リージョン**: us-east-1, us-west-2, ap-northeast-1など主要リージョン

### Claude 3.5 Sonnet（高性能）

```typescript
model: "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0"
```

- **コスト**: 入力 $3.00/1M tokens, 出力 $15.00/1M tokens
- **速度**: 中速
- **用途**: 高品質な記事生成

### Claude 3.7 Sonnet（最新・高性能）

```typescript
model: "bedrock/us.anthropic.claude-3-7-sonnet-20250219-v1:0"
```

- **コスト**: 入力 $3.00/1M tokens, 出力 $15.00/1M tokens
- **リージョン**: `us-east-1`, `us-west-2`のみ
- **用途**: 最新機能が必要な場合

**注意**: Claude 3.5 Haiku (20241022) は2025年12月にlegacy statusとなり、Claude Haiku 4.5への移行が推奨されています。

---

## リージョン設定

### デフォルト動作

環境変数`AWS_REGION`が自動的に使用されます。

### 明示的な指定（必要な場合）

```typescript
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const bedrock = createAmazonBedrock({
  region: 'us-east-1',
  credentialProvider: fromNodeProviderChain(),
});

const agent = new Agent({
  model: bedrock('amazon.nova-lite-v1:0'),
  // ...
});
```

**注意**: Mastraの通常の使い方では、この明示的な設定は不要です。

---

## 必要なIAM権限

### 最小権限ポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
    }
  ]
}
```

### SageMaker Studio Execution Roleへのアタッチ

```bash
aws iam attach-role-policy \
  --role-name SageMakerExecutionRole \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT:policy/MastraBedrockAccess
```

---

## モデルアクセスの有効化

### 事前準備（管理者作業）

1. AWS Console → Amazon Bedrock → Model access
2. 「Manage model access」をクリック
3. 以下のモデルを有効化:
   - Anthropic Claude Haiku 4.5
   - Anthropic Claude 3.5 Sonnet（オプション）
4. 「Save changes」

**重要**: モデルアクセスはアカウント全体で有効化されるため、一度設定すれば全ユーザーが利用可能。

---

## コスト比較

### OpenAI GPT-4o-mini

- 入力: $0.15/1M tokens
- 出力: $0.60/1M tokens
- **ハンズオン想定**: 1人あたり50k tokens (30k入力, 20k出力) → 約$0.017（≒$0.02）

### Bedrock Claude Haiku 4.5

- 入力: $1.00/1M tokens
- 出力: $5.00/1M tokens
- **ハンズオン想定**: 1人あたり50k tokens (30k入力, 20k出力) → 約$0.13

### Bedrock Nova Lite（本PRで採用）

- 入力: $0.06/1M tokens
- 出力: $0.24/1M tokens
- **ハンズオン想定**: 1人あたり50k tokens (30k入力, 20k出力) → 約$0.0066

### コスト差

- Nova Lite vs GPT-4o mini: 約$0.01減（67%削減）
- Nova Lite vs Claude Haiku 4.5: 約$0.12減（95%削減）
- **トレードオフ**: APIキー管理の手間削減 + コスト削減

---

## 動作確認方法

### 1. 認証確認

```bash
aws sts get-caller-identity
```

出力例:
```json
{
  "UserId": "AROAXXXXXXXXX:SageMaker",
  "Account": "123456789012",
  "Arn": "arn:aws:sts::123456789012:assumed-role/SageMakerExecutionRole/SageMaker"
}
```

### 2. Bedrockアクセス確認

```bash
aws bedrock list-foundation-models --region us-east-1 | grep claude-3-5-haiku
```

### 3. 簡易テスト

```typescript
import { Agent } from "@mastra/core/agent";

const testAgent = new Agent({
  id: "test",
  name: "test",
  instructions: "Say hello",
  model: "bedrock/anthropic.claude-3-5-haiku-20241022-v1:0",
});

const result = await testAgent.generate([
  { role: "user", content: "Hello" }
]);

console.log(result.text);
```

---

## トラブルシューティング

### 権限エラーのトラブルシューティング

#### 実行環境の確認

このチュートリアルは **AWS SageMaker Studio** での実行を想定しています。
他の環境（EC2、CloudShell等）で実行する場合は、適宜読み替えてください。

#### 最小権限ポリシーの作成

1. Execution Roleの確認（SageMaker Studioの場合）
   ```bash
   aws sagemaker describe-domain --domain-id d-xxxxx
   ```

2. Bedrock用の最小権限ポリシーを作成（`bedrock-minimal-policy.json`）
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "bedrock:InvokeModel",
           "bedrock:InvokeModelWithResponseStream"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

   **Resource指定について**:
   - `"Resource": "*"` を使用（foundation modelのARNは特殊な形式のため）
   - より厳密に制限する場合は、Condition keysを使用してモデルIDを制限可能

3. ポリシーを作成してRoleにアタッチ
   ```bash
   aws iam create-policy \
     --policy-name BedrockMinimalInvokePolicy \
     --policy-document file://bedrock-minimal-policy.json

   aws iam attach-role-policy \
     --role-name <ExecutionRoleName> \
     --policy-arn arn:aws:iam::<AccountId>:policy/BedrockMinimalInvokePolicy
   ```

**重要**: `AmazonBedrockFullAccess` マネージドポリシーは、このチュートリアルには過剰な権限です。
最小権限の原則に従い、上記のカスタムポリシーを使用してください。

### エラー: "Model not found"

**原因**: モデルアクセスが有効化されていない

**解決策**:
1. AWS Console → Bedrock → Model access
2. 該当モデルを有効化

### エラー: "Region not supported"

**原因**: 指定リージョンでモデルが利用不可

**解決策**:
- Claude 3.5 Haiku: `us-east-1`, `us-west-2`, `eu-west-1`, `ap-northeast-1`
- 環境変数`AWS_REGION`を確認

---

## 移行手順（推奨）

### Phase 1: 準備（管理者）

1. Bedrockモデルアクセス有効化
2. IAM Policy作成・アタッチ
3. SageMaker Studio環境構築

### Phase 2: コード変更

1. `package.json`に`@ai-sdk/amazon-bedrock`追加
2. 全ファイルのモデル指定を変更
3. `.env.example`を更新:
   - `AI_PROVIDER=openai` をデフォルトとして追加（既存）
   - Bedrock 使用時は `AI_PROVIDER=bedrock` に変更
   - OpenAI 使用時は `OPENAI_API_KEY` が必要（既存のまま維持）

### Phase 3: テスト

1. ローカル環境でAWS認証情報を設定してテスト
2. SageMaker Studio環境でテスト
3. 全Chapterの動作確認

### Phase 4: ドキュメント更新

1. README.mdに両方のセットアップ手順を記載:
   - OpenAI版（デフォルト）
   - Bedrock版（環境変数で切り替え）
2. セットアップ手順をBedrock用に更新
3. ハンズオン資料を更新

---

## 結論

**Bedrock対応は実現可能で、以下のメリットがあります:**

✅ **セキュリティ向上**: APIキー管理不要  
✅ **運用簡素化**: 環境変数設定不要  
✅ **AWS統合**: 完全にAWS内で完結  
✅ **コスト透明性**: AWS請求で一元管理  

**デメリット:**

⚠️ **コスト面の注意**: 採用モデル（Nova Lite）はGPT-4o miniより約67%安価です。ただし、将来的に他のBedrockモデル（例：Claude Haiku 4.5等）を選択する場合は、OpenAIより高コストとなる可能性があります。  
⚠️ **リージョン制限**: 利用可能リージョンが限定的  

**推奨**: ハンズオンの目的が「エージェント開発の学習」であれば、セキュリティと運用性のメリットがコスト増を上回ります。
