/**
 * Chapter 6: 構造化出力（Structured Output）
 *
 * エージェントの出力を Zod スキーマで型付きオブジェクトとして受け取る。
 * 「自由なテキスト」ではなく「プログラムで扱えるデータ」を得る方法を学ぶ。
 *
 * 実行コマンド:
 *   npm run ch6
 *   npm run ch6:bedrock
 */

import "dotenv/config";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModel } from "../config/models.js";

// 記事の構造を Zod スキーマで定義
const BlogArticleSchema = z.object({
  title: z.string().describe("記事のタイトル"),
  summary: z.string().describe("3文以内の要約"),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("セクション見出し"),
        body: z.string().describe("セクション本文"),
      })
    )
    .describe("記事のセクション（3〜5個）"),
  tags: z.array(z.string()).describe("関連タグ（3〜5個）"),
  targetAudience: z.string().describe("想定読者"),
});

const blogAgent = new Agent({
  id: "structured-blog-agent",
  name: "structured-blog-agent",
  instructions: `あなたは技術ブログライターです。
指定されたトピックについて、構造化された記事データを生成してください。
日本語で書いてください。`,
  model: getModel(),
});

const TOPIC = "TypeScriptの型システムを活用したバグ防止テクニック";

async function main() {
  console.log("=".repeat(60));
  console.log("Chapter 6: 構造化出力（Structured Output）");
  console.log("=".repeat(60));
  console.log(`\nトピック: "${TOPIC}"`);
  console.log("\n📌 出力が型付きオブジェクトとして返ってくることを確認してください\n");

  // Bedrock (Nova) は response_format をサポートしないため jsonPromptInjection が必要
  const isBedrock = (process.env.AI_PROVIDER || "openai") === "bedrock";

  const result = await blogAgent.generate(
    [{ role: "user", content: TOPIC }],
    {
      structuredOutput: {
        schema: BlogArticleSchema,
        ...(isBedrock && { jsonPromptInjection: true }),
      },
    }
  );

  // LLM出力を Zod でランタイム検証してから扱う
  const parsed = BlogArticleSchema.safeParse(result.object);
  if (!parsed.success) {
    console.error("❌ 構造化出力が BlogArticleSchema と一致しません:");
    console.error(parsed.error.format());
    throw new Error(
      "構造化出力の検証に失敗しました。プロンプトや BlogArticleSchema を確認してください。"
    );
  }
  const article = parsed.data;

  // 構造化データとして扱える
  console.log("--- 構造化データとして取得 ---\n");
  console.log(`📝 タイトル: ${article.title}`);
  console.log(`👤 想定読者: ${article.targetAudience}`);
  console.log(`🏷️  タグ: ${article.tags.join(", ")}`);
  console.log(`📄 要約: ${article.summary}`);
  console.log(`\n📚 セクション数: ${article.sections.length}`);
  article.sections.forEach((s, i) => {
    console.log(`\n  [${i + 1}] ${s.heading}`);
    console.log(`      ${s.body.substring(0, 80)}...`);
  });

  console.log("\n\n--- JSON として出力 ---\n");
  console.log(JSON.stringify(article, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("【観察ポイント】");
  console.log("=".repeat(60));
  console.log(`
1. 出力が自由テキストではなく、型付きオブジェクトになっているか？
2. article.title, article.sections[0].heading のようにプログラムでアクセスできるか？
3. JSON.stringify で正しくシリアライズできるか？

→ 構造化出力により、エージェントの出力を後続処理（DB保存、API返却等）に使えます。
  Chapter 7 では、自作ツールを MCP サーバーとして外部クライアントに公開する方法を学びます。
`);
}

main().catch(console.error);
