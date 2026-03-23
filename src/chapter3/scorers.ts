import { createScorer } from "@mastra/core/evals";
import { z } from "zod";
import { getModel } from "../config/models.js";

/**
 * スコアラー1: 指示への準拠度
 *
 * 「instructionsで与えた役割・制約を記事が守っているか」を評価する。
 * instructionsが曖昧なほど、そもそも評価軸がないためスコアが低くなる。
 */
export const instructionAdherenceScorer = createScorer({
  id: "instruction-adherence",
  description: "エージェントへの指示（instructions）を記事がどれだけ守っているかを評価する",
  judge: {
    model: getModel(),
    instructions: `
あなたは技術記事の品質評価専門家です。
「システム指示」と「記事」を受け取り、記事が指示をどれだけ守っているかを0.0〜1.0で採点してください。
採点基準:
- 1.0: 指示の全要件を完全に満たしている
- 0.7: ほとんどの要件を満たしているが一部不足
- 0.4: 一部の要件は満たしているが重要な部分が欠けている
- 0.1: 指示をほぼ無視している（または指示が曖昧すぎて評価できない）
JSON形式で { "score": 0.0〜1.0, "reason": "理由" } を返してください。
    `.trim(),
  },
  type: {
    input: z.object({
      systemInstructions: z.string().describe("エージェントに与えたinstructions"),
      userRequest: z.string().describe("ユーザーのリクエスト"),
    }),
    output: z.object({
      articleText: z.string().describe("生成された記事テキスト"),
    }),
  },
})
  .analyze({
    description: "指示への準拠度を分析する",
    outputSchema: z.object({
      score: z.number().min(0).max(1),
      reason: z.string(),
    }),
    createPrompt: ({ run }) => `
システム指示:
${run.input?.systemInstructions ?? "（指示なし）"}

ユーザーリクエスト:
${run.input?.userRequest ?? "（リクエストなし）"}

生成された記事:
${run.output.articleText}

この記事がシステム指示をどれだけ守っているか評価してください。
JSON形式: { "score": 0.0〜1.0, "reason": "理由" }
    `.trim(),
  })
  .generateScore(({ results }) => results.analyzeStepResult.score)
  .generateReason(({ results }) => Promise.resolve(results.analyzeStepResult.reason));

/**
 * スコアラー2: コンテンツ品質
 *
 * 記事単体の品質（構成・深さ・具体性）を評価する。
 * 対象読者・文字数・構成指定があるほどスコアが上がる。
 */
export const contentQualityScorer = createScorer({
  id: "content-quality",
  description: "記事の構成・深さ・具体性・対象読者への適切さを総合評価する",
  judge: {
    model: getModel(),
    instructions: `
あなたは技術記事の品質評価専門家です。
記事を受け取り、以下の観点で0.0〜1.0で採点してください:
1. 構成の論理性（導入→本題→まとめ の流れが明確か）
2. 内容の深さ（表面的でなく実践的な情報があるか）
3. 具体性（コード例・具体的な説明があるか）
4. 対象読者への適切さ（難易度が適切か、無駄に難しくないか）

JSON形式で以下を返してください:
{
  "structure": 0.0〜1.0,
  "depth": 0.0〜1.0,
  "specificity": 0.0〜1.0,
  "audienceFit": 0.0〜1.0,
  "totalScore": 0.0〜1.0,
  "reason": "理由"
}
    `.trim(),
  },
  type: {
    input: z.object({
      userRequest: z.string().describe("ユーザーのリクエスト"),
    }),
    output: z.object({
      articleText: z.string().describe("生成された記事テキスト"),
    }),
  },
})
  .analyze({
    description: "記事の品質を多角的に分析する",
    outputSchema: z.object({
      structure: z.number().min(0).max(1),
      depth: z.number().min(0).max(1),
      specificity: z.number().min(0).max(1),
      audienceFit: z.number().min(0).max(1),
      totalScore: z.number().min(0).max(1),
      reason: z.string(),
    }),
    createPrompt: ({ run }) => `
ユーザーリクエスト:
${run.input?.userRequest ?? "（リクエストなし）"}

生成された記事:
${run.output.articleText}

この記事の品質を評価してください。
JSON形式:
{
  "structure": 0.0〜1.0,
  "depth": 0.0〜1.0,
  "specificity": 0.0〜1.0,
  "audienceFit": 0.0〜1.0,
  "totalScore": 0.0〜1.0,
  "reason": "理由"
}
    `.trim(),
  })
  .generateScore(({ results }) => results.analyzeStepResult.totalScore)
  .generateReason(({ results }) => Promise.resolve(results.analyzeStepResult.reason));
