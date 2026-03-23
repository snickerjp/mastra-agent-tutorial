# Mastra agent tutorial with context7 mcp
_Exported on 2026/2/19 at 15:30:31 JST from Cursor (2.5.17)_

---

**User**

context7 mcpを使用してmastraエージェントのチュートリアルを考えてみてください。チュートリアル内でmcpを使用する構成にしてはいけません。エージェント開発のタスク分割の難しさとインプットによってアウトプット品質が大きく変わることが伝わるといいです。

---

**Cursor**

十分な情報が集まりました。チュートリアルのプランを作成します。

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

プロジェクトの設定ファイルを作成します。

次にディレクトリ構造を作成します。

Chapter 1 を実装します。

Chapter 2 のワークフローを実装します。

Chapter 3 の実装前に、利用可能な evals スコアラーを確認します。

Chapter 4 のメモリ実装をします。

次に README を作成します。

型エラーがないか確認します。

モデルの指定形式と API の問題を修正します。

モデル設定の形式とAPIを全ファイルで修正します。

Chapter 3 の run.ts で `agent.getInstructions()` を使うように修正します。

Chapter 4 の run.ts を修正します。

`id` フィールドが必須なので各エージェントに追加します。

型エラーがゼロになりました。最終的なファイル構成を確認します。

すべてのチュートリアルが実装されました。作成したものを整理して説明します。

---

## 実装完了

`/Users/hi_tanaka/Workspace/mastra-agent-tutorial` にチュートリアルを構築しました。

### ファイル構成

```
src/
  chapter1/
    agent.ts        — 曖昧な1エージェント（悪い例）
    run.ts          — 同一インプットで2回生成してブレを体験
  chapter2/
    steps.ts        — 4つのStep定義（research/outline/write/review）
    workflow.ts     — .then() チェーンでワークフロー組み立て
    run.ts          — ワークフロー実行と観察ポイント解説
  chapter3/
    patterns.ts     — A/B/C の3パターンエージェント定義
    scorers.ts      — カスタムスコアラー2種（指示準拠・コンテンツ品質）
    run.ts          — 3パターンを生成→採点→スコア比較表を出力
  chapter4/
    run.ts          — メモリなし/ありの両方を実行して差を体験
```

### 実行方法

```bash
cd /Users/hi_tanaka/Workspace/mastra-agent-tutorial
cp .env.example .env   # OPENAI_API_KEY を設定

npm run ch1   # Chapter 1: 「全部やって」の罠
npm run ch2   # Chapter 2: タスク分割ワークフロー
npm run ch3   # Chapter 3: プロンプト品質の比較（スコア付き）
npm run ch4   # Chapter 4: メモリで反復改善
```

### 各章のポイント

**Chapter 1** — 曖昧な `instructions` と曖昧なリクエストで同一トピックを2回生成し、構成・深さ・文字数がブレることを体験する。

**Chapter 2** — タスクを `research → outline → write → review` の4Stepに分解。誤った分割（「前半を書く→後半を書く」）との対比で、「アウトプットの種類が変わる境界で切る」という原則を学ぶ。Zodスキーマが各Step間を型安全に繋ぐ。

**Chapter 3** — 同じトピックをA/B/Cの3パターンで生成し、カスタムスコアラー（`createScorer`）で数値化して比較。「Chapter 2のresearchStepの`inputSchema`が実はパターンC相当のインプットを強制する仕組みになっている」という気づきに繋げる。

**Chapter 4** — メモリなしでは「もっと初心者向けに書き直して」が機能しない問題を体験した後、`thread`/`resource` 付きのメモリありエージェントで差分指定による反復改善を体験する。

