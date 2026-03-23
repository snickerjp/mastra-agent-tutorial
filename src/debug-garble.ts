/**
 * 文字化けの切り分けテスト
 * Mastra Agent を経由せず AI SDK の generateText() を直接使って
 * 日本語テキストが正しく返るか確認する。
 *
 * 実行: AI_PROVIDER=bedrock npx tsx src/debug-garble.ts
 */
import { generateText } from "ai";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain(),
});

async function main() {
  console.log("=== Test 1: generateText (非ストリーミング) ===\n");
  const { text } = await generateText({
    model: bedrock("amazon.nova-lite-v1:0"),
    prompt: "TypeScriptの型システムについて、日本語で300文字程度で説明してください。",
  });
  console.log(text);

  // 文字化けチェック
  const hasGarble = text.includes("�");
  console.log(`\n文字化け検出: ${hasGarble ? "❌ あり" : "✅ なし"}`);
}

main().catch(console.error);
