import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { researchStep, outlineStep, writeStep, reviewStep, reviewSchema } from "./steps.js";

/**
 * ブログ記事生成ワークフロー
 *
 * 分割の原則: 「アウトプットの種類が変わる境界線で切る」
 *
 *   research  → { keyPoints, targetAudience, tone }       ← 「何を書くか」の情報
 *   outline   → { sections[], targetAudience, tone }      ← 「どう書くか」の設計
 *   write     → { draft, targetAudience }                 ← 「書いた原稿」
 *   review    → { revisions[], article }                  ← 「改善済み完成稿」
 *
 * 各Stepのinputとoutputのスキーマが一致していることで、
 * TypeScriptの型安全性がワークフロー全体で保たれる。
 */
export const blogWorkflow = createWorkflow({
  id: "blog-workflow",
  inputSchema: z.object({
    topic: z.string().describe("記事のトピック"),
    audience: z
      .string()
      .describe(
        "対象読者（例: TypeScript初心者、React経験者で状態管理を学びたいエンジニア）"
      ),
  }),
  outputSchema: reviewSchema,
})
  .then(researchStep)
  .then(outlineStep)
  .then(writeStep)
  .then(reviewStep)
  .commit();
