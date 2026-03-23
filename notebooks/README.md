# Mastra エージェント チュートリアル - Jupyter Notebook版

このフォルダには、Mastraフレームワークを使ったエージェント開発を学ぶJupyter Notebookが含まれています。

## セットアップ

### 前提条件
- Node.js 22.13.0以上
- Jupyter Notebook環境
- OpenAI APIキーまたはAWS Bedrock環境

### インストール

```bash
# パッケージをインストール
npm install

# OpenAI APIを使用する場合のみ環境変数を設定
cp .env.example .env
# .env ファイルを開いて OPENAI_API_KEY を設定してください
# AWS Bedrockを使用する場合は.envファイルは不要です（IAM認証を使用）
```

## Notebook一覧

| Notebook | 説明 |
|---------|------|
| `chapter1-naive-agent.ipynb` | Chapter 1: 単純な1エージェントの問題点 |
| `chapter2-workflow.ipynb` | Chapter 2: タスク分割とワークフロー設計 |
| `chapter3-evaluation.ipynb` | Chapter 3: プロンプト品質の評価 |
| `chapter4-memory.ipynb` | Chapter 4: メモリによる改善 |

## 実行方法

1. Jupyter Notebookを起動
```bash
jupyter notebook
```

2. 各notebookを順番に開いて実行

## 注意事項

- TypeScript/JavaScriptのコードをJupyter環境で実行するため、各セルで適切な実行環境を設定しています
- **OpenAI API使用時**: `.env`ファイルに`OPENAI_API_KEY`を設定する必要があります（API使用料が発生）
- **AWS Bedrock使用時**: `.env`ファイルは不要です。IAM RoleまたはAWS認証情報で認証します
