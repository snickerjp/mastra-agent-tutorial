# モデル選定の経緯

## 最終決定: Amazon Nova Lite

**モデルID**: `amazon.nova-lite-v1:0`

---

## 選定理由

### 1. コスト効率

| モデル | 入力価格 | 出力価格 | ハンズオン想定コスト (50k tokens/人) |
|---|---|---|---|
| GPT-4o mini | $0.15/1M | $0.60/1M | $0.04 |
| **Nova Lite** | **$0.06/1M** | **$0.24/1M** | **$0.0066** |
| Nova Pro | $0.80/1M | $2.40/1M | $0.16 |
| Claude Haiku 4.5 | $1.00/1M | $5.00/1M | $0.30 |

**Nova Liteは:**
- GPT-4o miniの約40%のコスト
- Claude Haiku 4.5の約1/20のコスト
- ハンズオン用途として最もコスト効率が高い

### 2. 十分な性能

- **用途**: 技術ブログ記事生成（教育目的）
- **要求レベル**: 本番品質ではなく、学習用の十分な品質
- Nova Liteは軽量タスクに最適化されており、ハンズオンには十分

### 3. マルチモーダル対応

- テキスト、画像、動画の処理が可能
- 将来的な拡張性を確保

### 4. AWS統合

- IAM Role認証で管理が簡単
- SageMaker Studioとの親和性が高い
- 他のAWSサービスとの統合が容易

---

## 検討したモデル

### Claude Haiku 4.5（当初の選択）

**メリット:**
- 高品質なアウトプット
- 最新モデル（2025年10月リリース）
- 安定した性能

**デメリット:**
- コストが高い（$1.00/$5.00）
- ハンズオン用途にはオーバースペック

**結論**: 品質は高いが、教育用途にはコスト過多

---

### Nova Pro

**メリット:**
- GPT-4o相当の性能
- GPT-4oより65%安い
- 高速（GPT-4oより22%速い）

**デメリット:**
- Nova Liteと比較してコストが高い（約10倍）
- ハンズオン用途には不要な性能

**結論**: 本番用途には最適だが、ハンズオンにはNova Liteで十分

---

### Nova Micro（最安）

**メリット:**
- 最も安い（$0.035/$0.14）
- 超高速

**デメリット:**
- 性能がやや低い
- 記事生成には品質が不足する可能性

**結論**: コストは魅力的だが、品質面でNova Liteを選択

---

## 実装への影響

### 変更箇所

```typescript
// src/config/models.ts
export const MODEL_CONFIGS = {
  openai: "openai/gpt-4o-mini",
  bedrock: "bedrock/amazon.nova-lite-v1:0",  // ← 変更
} as const;
```

### 必要なパッケージ

```bash
npm install
# @ai-sdk/amazon-bedrock は package.json の dependencies に既に含まれています
```

### 環境変数

```bash
AI_PROVIDER=bedrock
AWS_REGION=us-east-1  # または他のリージョン
```

---

## コスト試算（ハンズオン想定）

### 前提条件
- 参加者: 20人
- 1人あたりのトークン使用量: 50k tokens（入力30k、出力20k）

### Nova Lite
```
入力: 30k * 20人 * $0.06/1M = $0.036
出力: 20k * 20人 * $0.24/1M = $0.096
合計: $0.132
```

### Claude Haiku 4.5（比較）
```
入力: 30k * 20人 * $1.00/1M = $0.60
出力: 20k * 20人 * $5.00/1M = $2.00
合計: $2.60
```

**コスト削減**: 約95%（$2.60 → $0.132）

---

## 今後の検討事項

### 性能評価
- 実際のハンズオンでNova Liteの品質を確認
- 必要に応じてNova Proへの切り替えを検討

### モデルの切り替え
環境変数で簡単に切り替え可能:

```bash
# Nova Liteを使う場合
AI_PROVIDER=bedrock

# OpenAI（コードのデフォルト）
AI_PROVIDER=openai

# Nova Proに変更する場合
# src/config/models.tsを編集
bedrock: "bedrock/amazon.nova-pro-v1:0"
```

---

## 参考資料

- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [Amazon Nova Models Announcement](https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/)
- [FloTorch Benchmark: Nova vs GPT-4o](https://www.flotorch.ai/blogs/rag-benchmarking-of-amazon-nova-and-gpt-4o-models)
