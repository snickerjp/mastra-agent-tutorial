import { createScorer } from "@mastra/core/evals";
import { z } from "zod";
import { getModel } from "../config/models.js";

// カスタム入出力の型定義
interface AdherenceInput {
  systemInstructions: string;
  userRequest: string;
}

interface QualityInput {
  userRequest: string;
}

interface ArticleOutput {
  articleText: string;
}

/**
 * スコアラー1: 指示への準拠度
 *
 * 「instructionsで与えた役割・制約を記事が守っているか」を評価する。
 * instructionsが曖昧なほど、そもそも評価軸がないためスコアが低くなる。
 */
export const instructionAdherenceScorer = createScorer<AdherenceInput, ArticleOutput>({
  id: "instruction-adherence",
  description: "エージェントへの指示（instructions）を記事がどれだけ守っているかを評価する",
  judge: {
    model: getModel(),
    instructions: `
あなたは技術記事の品質評価専門家です。
「システム指示」と「ユーザーリクエスト」と「記事」を受け取り、指示+リクエストの要件をどれだけ守っているかを0.0〜1.0で採点してください。

重要: 指示やリクエストに具体的な要件（対象読者・構成・トーン・文字数など）が少ない場合、
記事がどんなに良くても「準拠すべき基準が存在しない」ためスコアは低くなります。

採点基準:
- 1.0: 具体的な要件が複数あり、すべて満たしている
- 0.7: 具体的な要件があり、ほとんど満たしている
- 0.4: 要件が少ないか、あっても一部しか満たしていない
- 0.1: 具体的な要件がほぼなく、準拠度を測定できない
JSON形式で { "score": 0.0〜1.0, "reason": "理由" } を返してください。
    `.trim(),
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
${(run.input as AdherenceInput)?.systemInstructions ?? "（指示なし）"}

ユーザーリクエスト:
${(run.input as AdherenceInput)?.userRequest ?? "（リクエストなし）"}

生成された記事:
${(run.output as ArticleOutput).articleText}

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
export const contentQualityScorer = createScorer<QualityInput, ArticleOutput>({
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
4. 対象読者への適切さ（読者像が明確で、難易度が適切か）

重要: ユーザーリクエストに対象読者・構成・トーンが明示されていない場合、
「対象読者への適切さ」は低スコアにしてください（誰向けか不明な記事は評価できない）。

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
${(run.input as QualityInput)?.userRequest ?? "（リクエストなし）"}

生成された記事:
${(run.output as ArticleOutput).articleText}

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
