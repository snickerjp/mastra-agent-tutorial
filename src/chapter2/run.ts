/**
 * Chapter 2: タスク分割の設計 — ワークフローへの分解
 *
 * 【このChapterで体験すること】
 * 1. 分割の難しさ: 「どこで切るか」より「何を渡すか（スキーマ設計）」が難しい
 * 2. Step 1（リサーチ）の品質が後続全体に波及することを確認する
 * 3. 各Stepの出力が型安全に次Stepへ渡される安心感
 *
 * 【誤った分割の例 — コードには書かないが理解として】
 * NG: step_a「記事の前半を書く」→ step_b「記事の後半を書く」
 *     → 前半と後半で文体・深さが揃わない。文脈の引き継ぎが不安定。
 *
 * OK: research → outline → write → review
 *     → 各Stepが「異なる種類の成果物」を生成する。
 *       前Stepの成果が後Stepのインプットになり、品質が積み上がる。
 *
 * 実行コマンド:
 *   npm run ch2
 */

import "dotenv/config";

import { Mastra } from "@mastra/core";
import { blogWorkflow } from "./workflow.js";

const mastra = new Mastra({
  workflows: { blogWorkflow },
});

async function main() {
  console.log("=".repeat(60));
  console.log("Chapter 2: タスク分割の設計");
  console.log("=".repeat(60));

  const workflow = mastra.getWorkflow("blogWorkflow");
  const run = await workflow.createRun();

  console.log("\n【ワークフロー構成】");
  console.log("  Step 1: research  → キーポイント・読者・トーンを決める");
  console.log("  Step 2: outline   → 目次を設計する");
  console.log("  Step 3: write     → 原稿を執筆する");
  console.log("  Step 4: review    → 品質を改善する");

  console.log("\n【インプット】");
  const input = {
    topic: "TypeScriptの型システム入門",
    audience: "JavaScriptは書けるがTypeScriptをまだ使ったことがないフロントエンドエンジニア",
  };
  console.log(`  topic   : ${input.topic}`);
  console.log(`  audience: ${input.audience}`);

  console.log("\n⏳ ワークフロー実行中...\n");

  const result = await run.start({ inputData: input });

  if (result.status !== "success") {
    console.error("ワークフロー失敗:", result);
    return;
  }

  console.log("=".repeat(60));
  console.log("【Step 4完了: 最終成果物】");
  console.log("=".repeat(60));

  console.log("\n▼ レビューで修正したポイント:");
  result.result.revisions.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r}`);
  });

  console.log("\n▼ 完成記事:\n");
  console.log(result.result.article);

  console.log("\n" + "=".repeat(60));
  console.log("【観察ポイント】");
  console.log("=".repeat(60));
  console.log(`
1. Chapter 1 と比べて構成が安定しているか？
2. 対象読者（JavaScriptは書けるがTS未経験）に合った深さか？
3. レビューの修正点リストが、何を改善したかを説明しているか？

【タスク分割の本質的な難しさ】
- スキーマ設計（何を渡すか）を間違えると後Stepが機能しない
- Step 1（リサーチ）の "targetAudience" の精度が全体品質を左右する
- 「どこで切るか」ではなく「何を型として渡すか」が設計の核心
`);
}

main().catch(console.error);
