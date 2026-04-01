import { createStep } from "@mastra/core/workflows";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModel } from "../config/models.js";

// -----------------------------------------------------------------------
// タイムアウト付きラッパー（60秒）
// -----------------------------------------------------------------------
const TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error(`⏰ ${label} が ${TIMEOUT_MS / 1000}秒以内に応答しませんでした`)),
      TIMEOUT_MS,
    );
    promise.then(
      (v) => { clearTimeout(timeoutId); resolve(v); },
      (e) => { clearTimeout(timeoutId); reject(e); },
    );
  });
}

// Bedrock (Nova) は response_format 未対応のため jsonPromptInjection が必要
const isBedrock = (process.env.AI_PROVIDER || "openai") === "bedrock";
function structured<S extends z.ZodTypeAny>(schema: S) {
  return { structuredOutput: { schema, ...(isBedrock && { jsonPromptInjection: true }) } };
}

// -----------------------------------------------------------------------
// 各Stepで使うエージェント定義
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
  `.trim(),
  model: getModel(),
});

// -----------------------------------------------------------------------
// スキーマ定義
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
// Step 1: リサーチ — structuredOutput で確実に JSON を取得
// -----------------------------------------------------------------------
export const researchStep = createStep({
  id: "research",
  inputSchema: z.object({
    topic: z.string().describe("記事のトピック"),
    audience: z.string().describe("対象読者"),
  }),
  outputSchema: researchSchema,
  execute: async ({ inputData }) => {
    console.log("  📖 Step 1/4: リサーチ中...");
    const result = await withTimeout(
      researchAgent.generate(
        [{ role: "user", content: `トピック: ${inputData.topic}\n想定読者: ${inputData.audience}\n\nこのトピックの技術記事に必要なリサーチを行ってください。` }],
        structured(researchSchema),
      ),
      "research",
    );
    return researchSchema.parse(result.object);
  },
});

// -----------------------------------------------------------------------
// Step 2: アウトライン作成
// -----------------------------------------------------------------------
export const outlineStep = createStep({
  id: "outline",
  inputSchema: researchSchema,
  outputSchema: outlineSchema.merge(
    z.object({ targetAudience: z.string(), tone: z.string() })
  ),
  execute: async ({ inputData }) => {
    console.log("  📝 Step 2/4: アウトライン作成中...");
    const result = await withTimeout(
      outlineAgent.generate(
        [{ role: "user", content: `核心ポイント: ${inputData.keyPoints.join(", ")}\n対象読者: ${inputData.targetAudience}\nトーン: ${inputData.tone}\n\n記事の目次を設計してください。` }],
        structured(outlineSchema),
      ),
      "outline",
    );
    const parsed = outlineSchema.parse(result.object);
    // LLM 出力にはない targetAudience/tone を再付与（後続の write/review ステップに渡すため）
    return { ...parsed, targetAudience: inputData.targetAudience, tone: inputData.tone };
  },
});

// -----------------------------------------------------------------------
// Step 3: 執筆（テキスト出力なので structuredOutput は不要）
// -----------------------------------------------------------------------
export const writeStep = createStep({
  id: "write",
  inputSchema: outlineSchema.merge(
    z.object({ targetAudience: z.string(), tone: z.string() })
  ),
  outputSchema: z.object({
    draft: z.string().describe("記事の原稿（Markdown）"),
    targetAudience: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log("  ✍️  Step 3/4: 執筆中...");
    const sectionsText = inputData.sections
      .map((s, i) => `${i + 1}. ${s.title}\n   目的: ${s.goal}\n   要点: ${s.keyPoints.join(", ")}`)
      .join("\n");

    const result = await withTimeout(
      writeAgent.generate(
        [{ role: "user", content: `対象読者: ${inputData.targetAudience}\nトーン: ${inputData.tone}\n\n目次:\n${sectionsText}\n\n上記の目次に従って技術ブログ記事をMarkdownで執筆してください。` }],
      ),
      "write",
    );
    return { draft: result.text, targetAudience: inputData.targetAudience };
  },
});

// -----------------------------------------------------------------------
// Step 4: セルフレビュー
// -----------------------------------------------------------------------
export const reviewStep = createStep({
  id: "review",
  inputSchema: z.object({ draft: z.string(), targetAudience: z.string() }),
  outputSchema: reviewSchema,
  execute: async ({ inputData }) => {
    console.log("  🔍 Step 4/4: レビュー中...");
    const result = await withTimeout(
      reviewAgent.generate(
        [{ role: "user", content: `対象読者: ${inputData.targetAudience}\n\n以下の記事原稿をレビューし改善してください:\n\n---\n${inputData.draft}\n---` }],
        structured(reviewSchema),
      ),
      "review",
    );
    return reviewSchema.parse(result.object);
  },
});
