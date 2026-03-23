import { createStep } from "@mastra/core/workflows";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModel } from "../config/models.js";

// -----------------------------------------------------------------------
// 各Stepで使うエージェント定義
// 目的が明確に絞られているため、instructions も具体的に書ける
// -----------------------------------------------------------------------

const researchAgent = new Agent({
  id: "research-agent",
  name: "research-agent",
  instructions: `
あなたは技術記事のリサーチ専門家です。
与えられたトピックについて以下を必ず明確にしてください:
- 読者が「これを読んでよかった」と感じる核心的なポイントを3〜5個
- その記事が最も役立つ対象読者の具体的なスキルレベル
- 記事全体のトーン（丁寧・カジュアル・実践的 など）
JSON形式で出力してください。
  `.trim(),
  model: getModel(),
});

const outlineAgent = new Agent({
  id: "outline-agent",
  name: "outline-agent",
  instructions: `
あなたは技術記事の構成設計の専門家です。
リサーチ結果を受け取り、読者が迷子にならない論理的な目次を作成します。
各セクションに「このセクションで読者が得る理解」を1行で必ず付けてください。
JSON形式で出力してください。
  `.trim(),
  model: getModel(),
});

const writeAgent = new Agent({
  id: "write-agent",
  name: "write-agent",
  instructions: `
あなたは技術記事ライターです。
アウトラインと対象読者の情報を厳守し、脱線せず記事を執筆します。
コードサンプルが必要な場合は必ず含めてください。
見出し・本文・コード例の構成を守ってMarkdownで出力してください。
  `.trim(),
  model: getModel(),
});

const reviewAgent = new Agent({
  id: "review-agent",
  name: "review-agent",
  instructions: `
あなたは技術記事の品質レビュアーです。
以下の観点で原稿を評価し、改善版を出力してください:
- 論理の流れが自然か
- 対象読者にとって難解すぎる・簡単すぎる表現がないか
- 誤字・不自然な日本語がないか
- コード例は正確か
出力は "revisions"（修正したポイントのリスト）と "article"（改善後の全文）を含むJSONにしてください。
  `.trim(),
  model: getModel(),
});

// -----------------------------------------------------------------------
// Step 定義
//
// 【タスク分割の重要な考え方】
// NG: 「前半を書く → 後半を書く」（出力の種類が同じ → 文脈が断絶する）
// OK: 「調べる → 構成する → 書く → 直す」（出力の種類が違う → 前Stepの成果が後Stepのインプットになる）
// -----------------------------------------------------------------------

export const researchSchema = z.object({
  keyPoints: z.array(z.string()).describe("記事の核心的なポイント（3〜5個）"),
  targetAudience: z.string().describe("対象読者の具体的なスキルレベル"),
  tone: z.string().describe("記事全体のトーン"),
});

export const outlineSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().describe("セクションの見出し"),
        goal: z.string().describe("このセクションで読者が得る理解"),
        keyPoints: z.array(z.string()).describe("このセクションで触れる要点"),
      })
    )
    .describe("記事のセクション一覧"),
});

export const reviewSchema = z.object({
  revisions: z.array(z.string()).describe("修正したポイントのリスト"),
  article: z.string().describe("改善後の記事全文"),
});

// -----------------------------------------------------------------------
// Step 1: リサーチ
// inputSchema の存在が「良いインプットを強制する装置」になる
// -----------------------------------------------------------------------
export const researchStep = createStep({
  id: "research",
  inputSchema: z.object({
    topic: z.string().describe("記事のトピック"),
    audience: z.string().describe("対象読者（例: TypeScript初心者, Reactの経験はあるが状態管理を学びたいエンジニア）"),
  }),
  outputSchema: researchSchema,
  execute: async ({ inputData }) => {
    const prompt = `
トピック: ${inputData.topic}
想定読者のヒント: ${inputData.audience}

このトピックの技術記事を書くために必要なリサーチを行ってください。
以下のJSONフォーマットで回答してください:
{
  "keyPoints": ["ポイント1", "ポイント2", ...],
  "targetAudience": "対象読者の具体的な説明",
  "tone": "記事のトーン"
}
    `.trim();

    const result = await researchAgent.generate([
      { role: "user", content: prompt },
    ]);

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("リサーチAgentがJSON形式で返しませんでした");
    return JSON.parse(jsonMatch[0]) as z.infer<typeof researchSchema>;
  },
});

// -----------------------------------------------------------------------
// Step 2: アウトライン作成
// Step 1 の出力がそのままインプットになる（スキーマで型安全に繋がる）
// -----------------------------------------------------------------------
export const outlineStep = createStep({
  id: "outline",
  inputSchema: researchSchema,
  outputSchema: outlineSchema.merge(
    z.object({
      targetAudience: z.string(),
      tone: z.string(),
    })
  ),
  execute: async ({ inputData }) => {
    const prompt = `
リサーチ結果:
- 核心ポイント: ${inputData.keyPoints.join(", ")}
- 対象読者: ${inputData.targetAudience}
- トーン: ${inputData.tone}

この情報をもとに記事の目次を設計してください。
以下のJSONフォーマットで回答してください:
{
  "sections": [
    { "title": "セクション名", "goal": "読者がここで得る理解", "keyPoints": ["要点1", "要点2"] },
    ...
  ]
}
    `.trim();

    const result = await outlineAgent.generate([
      { role: "user", content: prompt },
    ]);

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("アウトラインAgentがJSON形式で返しませんでした");
    const parsed = JSON.parse(jsonMatch[0]) as z.infer<typeof outlineSchema>;

    return {
      ...parsed,
      targetAudience: inputData.targetAudience,
      tone: inputData.tone,
    };
  },
});

// -----------------------------------------------------------------------
// Step 3: 執筆
// アウトライン + 読者情報 + トーンを受け取って原稿を書く
// -----------------------------------------------------------------------
export const writeStep = createStep({
  id: "write",
  inputSchema: outlineSchema.merge(
    z.object({
      targetAudience: z.string(),
      tone: z.string(),
    })
  ),
  outputSchema: z.object({
    draft: z.string().describe("記事の原稿（Markdown）"),
    targetAudience: z.string(),
  }),
  execute: async ({ inputData }) => {
    const sectionsText = inputData.sections
      .map(
        (s, i) =>
          `${i + 1}. ${s.title}\n   目的: ${s.goal}\n   要点: ${s.keyPoints.join(", ")}`
      )
      .join("\n");

    const prompt = `
対象読者: ${inputData.targetAudience}
トーン: ${inputData.tone}

目次:
${sectionsText}

上記の目次に従って、技術ブログ記事をMarkdown形式で執筆してください。
各セクションの「目的」と「要点」を必ず網羅してください。
コードサンプルが適切な箇所には必ず含めてください。
    `.trim();

    const result = await writeAgent.generate([
      { role: "user", content: prompt },
    ]);

    return {
      draft: result.text,
      targetAudience: inputData.targetAudience,
    };
  },
});

// -----------------------------------------------------------------------
// Step 4: セルフレビュー
// 原稿を別の視点（レビュアーAgent）で改善する
// -----------------------------------------------------------------------
export const reviewStep = createStep({
  id: "review",
  inputSchema: z.object({
    draft: z.string(),
    targetAudience: z.string(),
  }),
  outputSchema: reviewSchema,
  execute: async ({ inputData }) => {
    const prompt = `
対象読者: ${inputData.targetAudience}

以下の記事原稿をレビューし、改善してください:

---
${inputData.draft}
---

以下のJSONフォーマットで回答してください:
{
  "revisions": ["修正点1", "修正点2", ...],
  "article": "改善後の記事全文（Markdown）"
}
    `.trim();

    const result = await reviewAgent.generate([
      { role: "user", content: prompt },
    ]);

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("レビューAgentがJSON形式で返しませんでした");
    return JSON.parse(jsonMatch[0]) as z.infer<typeof reviewSchema>;
  },
});
