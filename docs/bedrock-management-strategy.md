# Bedrock対応版の管理方法 比較・推奨案

## 現在の構成分析

- **ファイル数**: 9個のTypeScriptファイル
- **モデル指定箇所**: 12箇所
- **ブランチ**: `main`のみ
- **変更内容**: モデル指定文字列の変更のみ（ロジック変更なし）

---

## 選択肢の比較

### 選択肢1: ブランチ管理（`bedrock`ブランチ）

```
main (OpenAI版)
└── bedrock (Bedrock版)
```

#### メリット

✅ **Git標準機能**: ブランチ切り替えで簡単に管理  
✅ **差分管理が容易**: `git diff main bedrock`で変更点を確認  
✅ **マージ可能**: 共通の改善を両方に反映しやすい  
✅ **ディレクトリ構造不変**: 既存のパス・importが変わらない  

#### デメリット

⚠️ **ブランチ切り替え必要**: 両バージョンを同時に見られない  
⚠️ **初心者に複雑**: Gitブランチの理解が必要  
⚠️ **マージコンフリクト**: 両方を更新すると衝突の可能性  

#### 運用イメージ

```bash
# OpenAI版で作業
git checkout main
npm run ch1

# Bedrock版に切り替え
git checkout bedrock
npm run ch1

# 共通の改善をmainで実施後、bedrockにマージ
git checkout main
# ... 改善作業 ...
git checkout bedrock
git merge main
```

---

### 選択肢2: ディレクトリ管理（`src-bedrock/`）

```
src/          (OpenAI版)
src-bedrock/  (Bedrock版)
```

#### メリット

✅ **同時閲覧可能**: 両バージョンを並べて比較できる  
✅ **Git不要**: ブランチ操作の知識不要  
✅ **独立性**: 片方の変更が他方に影響しない  

#### デメリット

⚠️ **コード重複**: 9ファイル全体が重複  
⚠️ **同期が困難**: 共通の改善を両方に反映する手間  
⚠️ **package.json複雑化**: スクリプトを2セット管理  
⚠️ **メンテナンス負荷**: バグ修正を2箇所で実施  

#### 運用イメージ

```bash
# OpenAI版
npm run ch1

# Bedrock版
npm run ch1:bedrock

# 両方を修正する場合
# src/chapter1/agent.ts を修正
# src-bedrock/chapter1/agent.ts も修正（手動）
```

---

### 選択肢3: 環境変数 + 設定ファイル（推奨）

```
src/          (共通コード)
config/
  ├── openai.ts
  └── bedrock.ts
```

#### メリット

✅ **コード重複ゼロ**: ロジックは1箇所のみ  
✅ **切り替え簡単**: 環境変数で切り替え  
✅ **メンテナンス容易**: 修正は1箇所のみ  
✅ **拡張性**: 他のプロバイダー追加も容易  
✅ **教育的**: 設定の外部化を学べる  

#### デメリット

⚠️ **初期実装コスト**: リファクタリングが必要  
⚠️ **環境変数理解必要**: `.env`の使い方を理解する必要  

#### 実装イメージ

**`src/config/models.ts`**

```typescript
export const MODEL_CONFIGS = {
  openai: "openai/gpt-4o-mini",
  bedrock: "bedrock/amazon.nova-lite-v1:0",
} as const;

export const getModel = () => {
  const provider = process.env.AI_PROVIDER || "openai";
  return MODEL_CONFIGS[provider as keyof typeof MODEL_CONFIGS];
};
```

**`src/chapter1/agent.ts`**

```typescript
import { Agent } from "@mastra/core/agent";
import { getModel } from "../config/models.js";

export const naiveBlogAgent = new Agent({
  id: "naive-blog-agent",
  name: "naive-blog-agent",
  instructions: "ブログ記事を書いてください。",
  model: getModel(),  // ← 環境変数で切り替え
});
```

**`.env`**

```bash
# OpenAI版
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxx

# または Bedrock版
AI_PROVIDER=bedrock
AWS_REGION=us-east-1
```

**`package.json`**

```json
{
  "scripts": {
    "ch1": "tsx src/chapter1/run.ts",
    "ch1:bedrock": "AI_PROVIDER=bedrock tsx src/chapter1/run.ts",
    "ch2": "tsx src/chapter2/run.ts",
    "ch2:bedrock": "AI_PROVIDER=bedrock tsx src/chapter2/run.ts"
  }
}
```

---

### 選択肢4: ハイブリッド（ブランチ + タグ）

```
main (OpenAI版)
└── bedrock (Bedrock版)
    └── v1.0-bedrock (タグ)
```

#### メリット

✅ **バージョン管理**: リリース時点を明確化  
✅ **ブランチのメリット**: 差分管理が容易  
✅ **安定版の固定**: タグで特定バージョンを参照可能  

#### デメリット

⚠️ **複雑性**: タグ管理の理解が必要  
⚠️ **オーバーエンジニアリング**: 小規模プロジェクトには過剰  

---

## 推奨案: **選択肢3（環境変数 + 設定ファイル）**

### 理由

1. **教育的価値**: 設定の外部化はベストプラクティス
2. **メンテナンス性**: コード重複がなく、修正が1箇所で済む
3. **拡張性**: 将来的に他のプロバイダー（Google Vertex AI等）も追加可能
4. **実用性**: 実際のプロダクション環境でも使われる手法

### 次点: **選択肢1（ブランチ管理）**

環境変数のリファクタリングが難しい場合、ブランチ管理が次善策。

- **シンプル**: Git標準機能のみ
- **差分明確**: 変更箇所が12箇所のみで管理しやすい
- **学習コスト低**: ブランチ切り替えだけで済む

---

## 実装手順（推奨案）

### Phase 1: 設定ファイル作成

```bash
mkdir -p src/config
```

**`src/config/models.ts`**

```typescript
export const MODEL_CONFIGS = {
  openai: "openai/gpt-4o-mini",
  bedrock: "bedrock/amazon.nova-lite-v1:0",
} as const;

export type AIProvider = keyof typeof MODEL_CONFIGS;

export const getModel = (): string => {
  const provider = (process.env.AI_PROVIDER || "openai") as AIProvider;
  
  if (!(provider in MODEL_CONFIGS)) {
    throw new Error(
      `Invalid AI_PROVIDER: ${provider}. Must be one of: ${Object.keys(MODEL_CONFIGS).join(", ")}`
    );
  }
  
  return MODEL_CONFIGS[provider];
};
```

### Phase 2: 各ファイルを修正

**例: `src/chapter1/agent.ts`**

```typescript
import { Agent } from "@mastra/core/agent";
import { getModel } from "../config/models.js";

export const naiveBlogAgent = new Agent({
  id: "naive-blog-agent",
  name: "naive-blog-agent",
  instructions: "ブログ記事を書いてください。",
  model: getModel(),
});
```

同様に12箇所すべてを修正。

### Phase 3: package.json更新

```json
{
  "scripts": {
    "ch1": "tsx src/chapter1/run.ts",
    "ch1:bedrock": "AI_PROVIDER=bedrock tsx src/chapter1/run.ts",
    "ch2": "tsx src/chapter2/run.ts",
    "ch2:bedrock": "AI_PROVIDER=bedrock tsx src/chapter2/run.ts",
    "ch3": "tsx src/chapter3/run.ts",
    "ch3:bedrock": "AI_PROVIDER=bedrock tsx src/chapter3/run.ts",
    "ch4": "tsx src/chapter4/run.ts",
    "ch4:bedrock": "AI_PROVIDER=bedrock tsx src/chapter4/run.ts"
  }
}
```

### Phase 4: .env.example更新

```bash
# AI Provider (openai or bedrock)
AI_PROVIDER=openai

# OpenAI (when AI_PROVIDER=openai)
OPENAI_API_KEY=sk-your-openai-api-key-here

# AWS Bedrock (when AI_PROVIDER=bedrock)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-access-key (optional, uses IAM role if not set)
# AWS_SECRET_ACCESS_KEY=your-secret-key (optional, uses IAM role if not set)
```

### Phase 5: README更新

```markdown
## セットアップ

### OpenAI版（デフォルト）

\`\`\`bash
npm install
cp .env.example .env
# .env を開いて OPENAI_API_KEY を設定
npm run ch1
\`\`\`

### AWS Bedrock版

\`\`\`bash
npm install
# @ai-sdk/amazon-bedrock は package.json の dependencies に既に含まれています
cp .env.example .env
# .env を開いて AI_PROVIDER=bedrock に変更
npm run ch1:bedrock
\`\`\`
```

---

## 代替案（ブランチ管理）の実装手順

環境変数方式が難しい場合:

```bash
# Bedrockブランチ作成
git checkout -b bedrock

# パッケージはインストール済み
# npm install で @ai-sdk/amazon-bedrock を含むすべての依存関係をインストール

# 12箇所のモデル指定を一括置換
find src -name "*.ts" -type f -exec sed -i 's/openai\/gpt-4o-mini/bedrock\/amazon.nova-lite-v1:0/g' {} +

# .env.example更新
sed -i 's/OPENAI_API_KEY/AWS_REGION/g' .env.example

# コミット
git add .
git commit -m "feat: Add Bedrock support"
git push -u origin bedrock
```

---

## 比較表

| 項目 | 環境変数 | ブランチ | ディレクトリ |
|------|---------|---------|------------|
| **コード重複** | なし | なし | あり（9ファイル） |
| **同時閲覧** | 可能 | 不可 | 可能 |
| **メンテナンス** | 容易 | 中程度 | 困難 |
| **初期コスト** | 高 | 低 | 中 |
| **拡張性** | 高 | 中 | 低 |
| **学習価値** | 高 | 中 | 低 |
| **Git複雑度** | 低 | 中 | 低 |

---

## 結論

**推奨: 環境変数 + 設定ファイル方式**

理由:
- ✅ プロダクション環境でも使われるベストプラクティス
- ✅ コード重複なし、メンテナンス容易
- ✅ 教育的価値が高い（設定の外部化を学べる）
- ✅ 将来的な拡張が容易

**次点: ブランチ管理**

環境変数のリファクタリングが難しい場合や、すぐに実装したい場合はブランチ管理が現実的。

**非推奨: ディレクトリ管理**

コード重複によるメンテナンス負荷が高く、教育的価値も低い。
