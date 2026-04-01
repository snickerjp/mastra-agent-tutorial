/**
 * Chapter 4: メモリで反復改善する
 *
 * 【このChapterで体験すること】
 * 1. メモリなしエージェント vs メモリありエージェントの違い
 * 2. thread と resource の概念
 * 3. メモリがあることでエージェントへの指示が「差分指定」で済む
 *
 * 実行コマンド:
 *   npm run ch4
 */

import "dotenv/config";

import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { getModel } from "../config/models.js";

// -----------------------------------------------------------------------
// メモリなしエージェント
// -----------------------------------------------------------------------
const agentWithoutMemory = new Agent({
  id: "no-memory-blog-agent",
  name: "no-memory-blog-agent",
  instructions: `
あなたはプロの技術ブログライターです。
Markdown形式で、導入→本文→まとめ の構成で記事を書いてください。
コード例を含めてください。
  `.trim(),
  model: getModel(),
});

// -----------------------------------------------------------------------
// メモリありエージェント
// -----------------------------------------------------------------------
const storage = new LibSQLStore({
  id: "tutorial-storage",
  url: ":memory:",
});

const memory = new Memory({
  storage,
  options: { lastMessages: 10 },
});

const agentWithMemory = new Agent({
  id: "memory-blog-agent",
  name: "memory-blog-agent",
  instructions: `
あなたはプロの技術ブログライターです。
Markdown形式で、導入→本文→まとめ の構成で記事を書いてください。
コード例を含めてください。
修正を依頼された場合は、前の記事の内容を踏まえて改善してください。
  `.trim(),
  model: getModel(),
  memory,
});

const THREAD_ID = "article-session-001";
const RESOURCE_ID = "user-001";

/** 記事の最初の見出し行（# で始まる行）を抽出 */
function extractTitle(text: string): string {
  const line = text.split("\n").find((l) => l.startsWith("#"));
  return line?.replace(/^#+\s*/, "") ?? "(見出しなし)";
}

/** スレッド内のメッセージ数を表示 */
async function showThreadStatus() {
  const thread = await memory.getThreadById({ threadId: THREAD_ID });
  if (!thread) return;
  const { messages } = await memory.recall({ threadId: THREAD_ID });
  console.log(`  💾 スレッド内メッセージ数: ${messages.length}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Chapter 4: メモリで反復改善する");
  console.log("=".repeat(60));

  // ====================================================================
  // PART 1: メモリなしの問題を体験する
  // ====================================================================
  console.log("\n" + "━".repeat(60));
  console.log("PART 1: メモリなし — 修正指示が「無視」される");
  console.log("━".repeat(60));

  console.log("\n[1回目] 初稿を生成...");
  const noMemResult1 = await agentWithoutMemory.generate([
    {
      role: "user",
      content: "TypeScriptの型システムについての入門記事を書いてください。対象読者はJavaScript経験者です。",
    },
  ]);
  const noMemTitle1 = extractTitle(noMemResult1.text);
  console.log(`  📄 タイトル: ${noMemTitle1}`);
  console.log("\n【初稿（先頭800字）】");
  console.log(noMemResult1.text.slice(0, 800) + "\n...");

  console.log("\n[2回目] 修正指示を出す（前の文脈を渡さずに）...");
  const noMemResult2 = await agentWithoutMemory.generate([
    { role: "user", content: "もっと初心者向けに書き直して、専門用語を減らしてください。" },
  ]);
  const noMemTitle2 = extractTitle(noMemResult2.text);
  console.log(`  📄 タイトル: ${noMemTitle2}`);
  console.log("\n【修正後（先頭800字）】");
  console.log(noMemResult2.text.slice(0, 800) + "\n...");

  console.log("\n⚠️  【問題点】");
  console.log(`  1回目のタイトル: 「${noMemTitle1}」`);
  console.log(`  2回目のタイトル: 「${noMemTitle2}」`);
  console.log("  → 「書き直して」と言ったのに、別の記事が生成されている（前の記事を知らない）");

  // ====================================================================
  // PART 2: メモリありで同じことをやる
  // ====================================================================
  console.log("\n" + "━".repeat(60));
  console.log("PART 2: メモリあり — 文脈を保持した反復改善");
  console.log("━".repeat(60));

  const memoryOptions = {
    memory: { thread: THREAD_ID, resource: RESOURCE_ID },
  };

  console.log("\n[1回目] 初稿を生成（thread: article-session-001）...");
  const memResult1 = await agentWithMemory.generate(
    "TypeScriptの型システムについての入門記事を書いてください。対象読者はJavaScript経験者です。",
    memoryOptions
  );
  const memTitle1 = extractTitle(memResult1.text);
  console.log(`  📄 タイトル: ${memTitle1}`);
  await showThreadStatus();
  console.log("\n【初稿（先頭800字）】");
  console.log(memResult1.text.slice(0, 800) + "\n...");

  console.log("\n[2回目] 修正指示（同じthread IDで送信）...");
  const memResult2 = await agentWithMemory.generate(
    "もっと初心者向けに書き直して、専門用語を減らしてください。",
    memoryOptions
  );
  const memTitle2 = extractTitle(memResult2.text);
  console.log(`  📄 タイトル: ${memTitle2}`);
  await showThreadStatus();
  console.log("\n【修正後（先頭800字）】");
  console.log(memResult2.text.slice(0, 800) + "\n...");

  console.log("\n[3回目] さらに追加修正...");
  const memResult3 = await agentWithMemory.generate(
    "コード例をもう1つ追加して、anyの使いすぎに注意する話も入れてください。",
    memoryOptions
  );
  const memTitle3 = extractTitle(memResult3.text);
  console.log(`  📄 タイトル: ${memTitle3}`);
  await showThreadStatus();
  console.log("\n【最終稿（先頭800字）】");
  console.log(memResult3.text.slice(0, 800) + "\n...");

  // ====================================================================
  // 比較まとめ
  // ====================================================================
  console.log("\n" + "=".repeat(60));
  console.log("【タイトル比較】");
  console.log("=".repeat(60));
  console.log("\nメモリなし:");
  console.log(`  1回目: 「${noMemTitle1}」`);
  console.log(`  2回目: 「${noMemTitle2}」 ← 別の記事になっている`);
  console.log("\nメモリあり:");
  console.log(`  1回目: 「${memTitle1}」`);
  console.log(`  2回目: 「${memTitle2}」`);
  console.log(`  3回目: 「${memTitle3}」 ← 同じ記事を改善し続けている`);

  console.log("\n" + "=".repeat(60));
  console.log("【観察ポイント】");
  console.log("=".repeat(60));
  console.log(`
1. メモリなしの2回目は、TypeScriptの型システムとは無関係な記事になっていないか？
   → 「書き直して」が何に対してなのか不明なため、全く別の記事が生成される。

2. メモリありの2回目・3回目は、前の記事を踏まえた改善になっているか？
   → 💾 メッセージ数が増えている = 会話履歴が蓄積されている証拠。

3. thread と resource の役割:
   - thread  = 「この記事作業」というセッション単位
   - resource = 「誰のセッションか」というユーザー単位
`);
}

main().catch(console.error);
