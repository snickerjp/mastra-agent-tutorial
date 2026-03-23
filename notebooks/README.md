# Mastra エージェント チュートリアル - Jupyter Notebook版

## どちらを使う？

| 環境 | フォルダ | 必要なもの |
|---|---|---|
| **OpenAI** | [`openai/`](./openai/) | `.env` に `OPENAI_API_KEY` を設定 |
| **AWS Bedrock** (SageMaker Studio等) | [`bedrock/`](./bedrock/) | IAM Role（APIキー不要） |

## セットアップ

```bash
# パッケージをインストール（共通）
npm install
```

## Notebook一覧

各フォルダに同じ4つのChapterがあります:

| Notebook | 内容 |
|---|---|
| `chapter1-naive-agent.ipynb` | 「全部やって」の落とし穴 |
| `chapter2-workflow.ipynb` | タスク分割とワークフロー設計 |
| `chapter3-evaluation.ipynb` | プロンプト品質の評価 |
| `chapter4-memory.ipynb` | メモリによる改善 |
