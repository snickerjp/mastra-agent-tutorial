/**
 * Chapter 5: ツールを使うエージェント
 *
 * エージェントが「テキスト生成」だけでなく「アクション実行」できることを体験する。
 * LLM がツールの description と inputSchema を見て、自律的に呼び出しを判断する。
 *
 * 実行コマンド:
 *   npm run ch5
 *   npm run ch5:bedrock
 */

import "dotenv/config";
import { researchBlogAgent } from "./agent.js";

const TOPIC = "TypeScriptの最新動向について技術ブログ記事を書いてください";

async function main() {
  console.log("=".repeat(60));
  console.log("Chapter 5: ツールを使うエージェント");
  console.log("=".repeat(60));
  console.log(`\nリクエスト: "${TOPIC}"`);
  console.log("\n📌 エージェントが自律的にツールを呼び出す様子を観察してください\n");

  const result = await researchBlogAgent.generate([
    { role: "user", content: TOPIC },
  ]);

  console.log("\n--- 生成結果 ---\n");
  console.log(result.text);

  console.log("\n" + "=".repeat(60));
  console.log("【観察ポイント】");
  console.log("=".repeat(60));
  console.log(`
1. エージェントが searchTopic / getCurrentDate を呼んだか？
   → ツール呼び出しログ（🔍）が表示されたか確認
2. 検索結果の情報が記事に反映されているか？
3. 日付が記事に含まれているか？
4. Chapter 1（ツールなし）と比べて、事実に基づいた記事になっているか？

→ ツールにより、エージェントは「知らないこと」を調べてから書けるようになります。
  Chapter 6 では、出力を構造化データとして受け取る方法を学びます。
`);
}

main().catch(console.error);
