/**
 * Chapter 7: マルチエージェント（Supervisor パターン）
 *
 * Supervisor エージェントが researcher / writer サブエージェントにタスクを委譲し、
 * 協調して記事を完成させる。network() メソッドでストリーム実行する。
 *
 * 実行コマンド:
 *   npm run ch7
 *   npm run ch7:bedrock
 */

import "dotenv/config";
import { Agent } from "@mastra/core/agent";
import { getModel } from "../config/models.js";

// --- サブエージェント ---

const researcher = new Agent({
  id: "researcher",
  name: "researcher",
  instructions: `あなたはリサーチ専門のアシスタントです。
与えられたトピックについて、以下を調査してまとめてください:
- 主要なポイント（3〜5個）
- 最新の動向やトレンド
- 想定読者に役立つ具体例
日本語で回答してください。`,
  model: getModel(),
});

const writer = new Agent({
  id: "writer",
  name: "writer",
  instructions: `あなたはプロの技術ブログライターです。
リサーチ結果をもとに、読みやすい技術ブログ記事を執筆してください:
- 明確な見出し構成
- 具体的なコード例を含める
- 初心者にも分かりやすい説明
日本語で書いてください。`,
  model: getModel(),
});

// --- Supervisor エージェント ---

const supervisor = new Agent({
  id: "blog-supervisor",
  name: "blog-supervisor",
  instructions: `あなたはブログ制作チームのスーパーバイザーです。

## あなたのチーム
- researcher: トピックのリサーチを担当
- writer: 記事の執筆を担当

## 手順
1. まず researcher にトピックのリサーチを依頼してください
2. リサーチ結果を受け取ったら、writer に記事の執筆を依頼してください
3. 最終的な記事を出力してください`,
  model: getModel(),
  agents: { researcher, writer },
});

const TOPIC = "TypeScriptの型ガードとNarrowing";

async function main() {
  console.log("=".repeat(60));
  console.log("Chapter 7: マルチエージェント（Supervisor パターン）");
  console.log("=".repeat(60));
  console.log(`\nトピック: "${TOPIC}"`);
  console.log("チーム: supervisor → researcher + writer");
  console.log("\n📌 Supervisor がサブエージェントに委譲する流れを観察してください\n");

  const stream = await supervisor.network(
    [{ role: "user", content: `「${TOPIC}」について技術ブログ記事を書いてください` }],
    { maxSteps: 10 },
  );

  let currentAgent = "";

  for await (const chunk of stream) {
    // サブエージェントの切り替わりを表示
    if (chunk.type === "agent-execution-start") {
      const agentId = chunk.payload.agentId;
      if (agentId !== currentAgent) {
        currentAgent = agentId;
        console.log(`\n${"─".repeat(40)}`);
        console.log(`🤖 ${agentId} が作業中...`);
        console.log(`${"─".repeat(40)}\n`);
      }
    }

    // テキスト出力をストリーム表示
    if (chunk.type.endsWith("text-delta") && "payload" in chunk) {
      const payload = chunk.payload as { text?: string };
      if (payload.text) {
        process.stdout.write(payload.text);
      }
    }
  }

  const status = await stream.status;
  console.log(`\n\n${"=".repeat(60)}`);
  console.log(`実行ステータス: ${status}`);
  console.log("=".repeat(60));
  console.log(`
【観察ポイント】
1. Supervisor が researcher → writer の順にタスクを委譲したか？
2. researcher のリサーチ結果が writer の記事に反映されているか？
3. 各エージェントの役割分担が明確か？

→ Supervisor パターンにより、複雑なタスクを専門エージェントに分割・協調できます。
  Chapter 2 のワークフロー（コードで順序制御）と比べて、
  LLM が自律的にタスクを振り分ける点が異なります。
`);
}

main().catch(console.error);
