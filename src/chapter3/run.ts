// @ts-nocheck
/**
 * Chapter 3: インプット品質の実験 — プロンプトで変わる世界
 *
 * 【このChapterで体験すること】
 * 1. 同じトピックでも instructions + リクエストの品質でスコアが大きく変わる
 * 2. スコアが「数値」で出ることで、プロンプト改善の効果を測定できる
 * 3. Chapter 2 のワークフローのStep 1（リサーチStep）の inputSchema が
 *    実は「良いインプットを強制する仕組み」になっていることへの気づき
 *
 * 実行コマンド:
 *   npm run ch3
 */

import "dotenv/config";
import { patternA, patternB, patternC } from "./patterns.js";
import {
  instructionAdherenceScorer,
  contentQualityScorer,
} from "./scorers.js";

type Pattern = typeof patternA | typeof patternB | typeof patternC;

async function runPattern(pattern: Pattern) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📝 ${pattern.label}`);
  console.log(`${"─".repeat(60)}`);

  const result = await pattern.agent.generate([
    { role: "user", content: pattern.request },
  ]);

  const articleText = result.text;

  console.log("\n【生成記事（先頭400字）】");
  console.log(articleText.slice(0, 400) + (articleText.length > 400 ? "\n..." : ""));

  // ---- スコアリング ----
  const systemInstructions = await pattern.agent.getInstructions();
  const [adherenceResult, qualityResult] = await Promise.all([
    instructionAdherenceScorer.run({
      input: {
        systemInstructions: typeof systemInstructions === "string"
          ? systemInstructions
          : (systemInstructions as { content?: string })?.content ?? "",
        userRequest: pattern.request,
      },
      output: { articleText },
    }),
    contentQualityScorer.run({
      input: { userRequest: pattern.request },
      output: { articleText },
    }),
  ]);

  return {
    label: pattern.label,
    adherenceScore: adherenceResult.score,
    adherenceReason: adherenceResult.reason,
    qualityScore: qualityResult.score,
    qualityReason: qualityResult.reason,
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("Chapter 3: インプット品質の実験");
  console.log("=".repeat(60));
  console.log(`
【評価スコアの説明】
  指示準拠スコア: instructions の要件を記事がどれだけ守っているか (0.0〜1.0)
  コンテンツ品質: 構成・深さ・具体性・読者適切さの総合評価 (0.0〜1.0)
`);

  const patterns = [patternA, patternB, patternC];
  const results = [];

  for (const pattern of patterns) {
    const r = await runPattern(pattern);
    results.push(r);
  }

  // ---- 結果サマリー ----
  console.log("\n\n" + "=".repeat(60));
  console.log("【スコア比較サマリー】");
  console.log("=".repeat(60));
  console.log(
    `\n${"パターン".padEnd(10)} ${"指示準拠".padEnd(8)} ${"コンテンツ品質".padEnd(12)}`
  );
  console.log("─".repeat(40));

  for (const r of results) {
    const label = r.label.split(":")[0].trim();
    const adherence = (r.adherenceScore ?? 0).toFixed(2);
    const quality = (r.qualityScore ?? 0).toFixed(2);
    console.log(`${label.padEnd(12)} ${adherence.padEnd(10)} ${quality}`);
  }

  console.log("\n【各パターンの評価理由】");
  for (const r of results) {
    const label = r.label.split(":")[0].trim();
    console.log(`\n▼ ${label}`);
    console.log(`  指示準拠: ${r.adherenceReason}`);
    console.log(`  品質    : ${r.qualityReason}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("【観察ポイント】");
  console.log("=".repeat(60));
  console.log(`
1. A→B→C とスコアが上昇するか？（特に指示準拠スコアに注目）
2. パターン A の「指示準拠スコア」が低い理由:
   "ブログ記事を書いてください" では評価軸そのものが存在しないため、
   LLMも「何を守ればよいか」が分からない。
3. パターン C は明示された要件（対象読者・構成・トーン）があるため、
   スコアが安定して高くなる。

【Chapter 2 との繋がり】
Chapter 2 の researchStep の inputSchema:
  topic: z.string()     ← 最低限のトピック
  audience: z.string()  ← 「対象読者を必ず明示せよ」という強制
これが実は「パターンC相当のインプットを強制する仕組み」になっている。
ワークフローのスキーマ設計 = プロンプトエンジニアリング。
`);
}

main().catch(console.error);
