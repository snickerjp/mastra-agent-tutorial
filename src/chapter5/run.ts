/**
 * Chapter 5: ツールを使うエージェント
 *
 * エージェントが「テキスト生成」だけでなく「アクション実行」できることを体験する。
 * LLM がツールの description と inputSchema を見て、自律的に呼び出しを判断する。
 *
 * Mock（固定データ）と Live（DuckDuckGo API）の2パターンで比較する。
 *
 * 実行コマンド:
 *   npm run ch5
 *   npm run ch5:bedrock
 */

import "dotenv/config";
import { Agent } from "@mastra/core/agent";
import { getModel } from "../config/models.js";
import { getCurrentDate, searchTopic, searchTopicLive } from "./tools.js";

const TOPIC = "TypeScriptの最新動向について技術ブログ記事を書いてください";

const baseConfig = {
  name: "research-blog-agent",
  instructions: `あなたはリサーチ力のある技術ブログライターです。

## ルール
- 記事を書く前に、必ず検索ツールで最新情報を調べてください
- 記事の冒頭に getCurrentDate ツールで取得した日付を含めてください
- 検索結果の情報を記事に反映し、出典を明記してください
- 日本語で書いてください`,
  model: getModel(),
} as const;

const mockAgent = new Agent({
  ...baseConfig,
  id: "mock-blog-agent",
  tools: { getCurrentDate, searchTopic },
});

const liveAgent = new Agent({
  ...baseConfig,
  id: "live-blog-agent",
  tools: { getCurrentDate, searchTopicLive },
});

async function runAgent(label: string, agent: Agent) {
  console.log(`\n${"━".repeat(60)}`);
  console.log(`📝 ${label}`);
  console.log(`${"━".repeat(60)}`);

  const result = await agent.generate([
    { role: "user", content: TOPIC },
  ]);

  console.log("\n【生成記事（先頭500字）】");
  console.log(result.text.slice(0, 500) + (result.text.length > 500 ? "\n..." : ""));
}

async function main() {
  console.log("=".repeat(60));
  console.log("Chapter 5: ツールを使うエージェント");
  console.log("=".repeat(60));
  console.log(`\nリクエスト: "${TOPIC}"`);

  // --- Mock ---
  await runAgent("Mock データで生成（固定の検索結果）", mockAgent);

  // --- Live ---
  await runAgent("DuckDuckGo API で生成（実際の検索結果）", liveAgent);

  console.log("\n" + "=".repeat(60));
  console.log("【観察ポイント】");
  console.log("=".repeat(60));
  console.log(`
1. Mock vs Live で記事の内容がどう変わるか？
   → Mock は固定データなので毎回同じ情報。Live は実際の検索結果を反映。
2. エージェントが searchTopic / searchTopicLive を自律的に呼んだか？
   → 🔍 [Mock] / 🌐 [Live] のログが表示されたか確認。
3. ツールの description と inputSchema だけで、LLM が適切に呼び出せている。
   → 「いつ呼ぶか」「何を渡すか」は LLM が判断している。
`);
}

main().catch(console.error);
