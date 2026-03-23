/**
 * Chapter 1: 「全部やって」の罠
 *
 * 単一エージェントに記事全体の生成を一度に依頼する。
 * 同じトピックで2回実行し、アウトプットのブレを体験する。
 *
 * 実行コマンド:
 *   npm run ch1
 */

import "dotenv/config";
import { naiveBlogAgent } from "./agent.js";

const TOPIC = "TypeScriptについて";

async function main() {
  console.log("=".repeat(60));
  console.log("Chapter 1: 「全部やって」の罠");
  console.log("=".repeat(60));
  console.log(`\nトピック: "${TOPIC}"`);
  console.log("instructions: \"ブログ記事を書いてください。\"");
  console.log("\n⚠️  同じ入力で2回生成して、アウトプットのブレを確認します\n");

  // --- 1回目 ---
  console.log("--- 生成 1回目 ---\n");
  const result1 = await naiveBlogAgent.generate([
    { role: "user", content: TOPIC },
  ]);
  console.log(result1.text);

  console.log("\n" + "-".repeat(60) + "\n");

  // --- 2回目（同一インプット） ---
  console.log("--- 生成 2回目（同一インプット）---\n");
  const result2 = await naiveBlogAgent.generate([
    { role: "user", content: TOPIC },
  ]);
  console.log(result2.text);

  console.log("\n" + "=".repeat(60));
  console.log("【観察ポイント】");
  console.log("=".repeat(60));
  console.log(`
1. 構成（見出しの数・順序）が毎回変わっていないか？
2. 文字数・深さが安定しているか？
3. 対象読者（初心者向け？中級者向け？）が明示されているか？
4. 何を修正すれば良いか、修正指示を出しやすいか？

→ これらが「曖昧なインプット」が生む問題です。
  Chapter 2 でタスクを分割して解決します。
`);
}

main().catch(console.error);
