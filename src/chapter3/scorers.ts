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
 * 入力の具体性を測るキーワード一覧
 * instructions + userRequest にこれらが含まれるほど「具体的な要件がある」と判定する。
 */
const SPECIFICITY_KEYWORDS = ["対象読者", "構成", "トーン", "文字数", "セクション"];

/** テキスト中のキーワード出現率を 0.0〜1.0 で返す */
function measureSpecificity(text: string): number {
  const found = SPECIFICITY_KEYWORDS.filter((k) => text.includes(k)).length;
  return found / SPECIFICITY_KEYWORDS.length;
}

/**
 * スコアラー1: 指示への準拠度
 *
 * preprocess（関数）で入力の具体性を機械的に計測し、
 * analyze（LLM）で記事の準拠度を評価、
 * generateScore で両者を掛け合わせる。
 *
 * → 指示が曖昧なほど、LLM評価が高くても最終スコアが下がる。
 */
export const instructionAdherenceScorer = createScorer<AdherenceInput, ArticleOutput>({
  id: "instruction-adherence",
  description: "エージェントへの指示とリクエストの要件を記事がどれだけ守っているかを評価する",
  judge: {
    model: getModel(),
    instructions: `
あなたは技術記事の品質評価専門家です。
「システム指示」と「ユーザーリクエスト」と「記事」を受け取り、指示+リクエストの要件をどれだけ守っているかを0.0〜1.0で採点してください。
JSON形式で { "score": 0.0〜1.0, "reason": "理由" } を返してください。
    `.trim(),
  },
})
  .preprocess(({ run }) => {
    const input = run.input as AdherenceInput;
    const text = `${input?.systemInstructions ?? ""} ${input?.userRequest ?? ""}`;
    return { specificityRatio: measureSpecificity(text) };
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

この記事がシステム指示とリクエストの要件をどれだけ守っているか評価してください。
JSON形式: { "score": 0.0〜1.0, "reason": "理由" }
    `.trim(),
  })
  .generateScore(({ results }) => {
    const llmScore = results.analyzeStepResult.score;
    const ratio = results.preprocessStepResult.specificityRatio;
    // 具体性が低いほどスコアが下がる（最低で LLM スコアの 20%）
    return Math.round(llmScore * (0.2 + 0.8 * ratio) * 100) / 100;
  })
  .generateReason(({ results }) => {
    const ratio = results.preprocessStepResult.specificityRatio;
    const base = results.analyzeStepResult.reason;
    if (ratio < 0.4) {
      return Promise.resolve(`${base}（※ 指示の具体性が低いためスコアを減衰）`);
    }
    return Promise.resolve(base);
  });

/**
 * スコアラー2: コンテンツ品質
 *
 * 同様に preprocess で入力の具体性を計測し、
 * 対象読者等が不明な場合はスコアを減衰させる。
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
  .preprocess(({ run }) => {
    const input = run.input as QualityInput;
    return { specificityRatio: measureSpecificity(input?.userRequest ?? "") };
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
  .generateScore(({ results }) => {
    const llmScore = results.analyzeStepResult.totalScore;
    const ratio = results.preprocessStepResult.specificityRatio;
    return Math.round(llmScore * (0.2 + 0.8 * ratio) * 100) / 100;
  })
  .generateReason(({ results }) => {
    const ratio = results.preprocessStepResult.specificityRatio;
    const base = results.analyzeStepResult.reason;
    if (ratio < 0.4) {
      return Promise.resolve(`${base}（※ リクエストの具体性が低いためスコアを減衰）`);
    }
    return Promise.resolve(base);
  });
