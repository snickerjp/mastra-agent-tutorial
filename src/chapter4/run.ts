/**
 * Chapter 4: メモリで反復改善する
 *
 * 【このChapterで体験すること】
 * 1. メモリなしエージェント vs メモリありエージェントの違い
 *    - メモリなし: 「書き直して」と言っても、前の文脈がなく一から生成される
 *    - メモリあり: 前の記事を覚えており、修正指示を的確に適用できる
 *
 * 2. thread と resource の概念
 *    - thread  : 会話セッションの識別子（「この記事作業」という単位）
 *    - resource: ユーザー/エンティティの識別子（「誰の」という単位）
 *
 * 3. メモリがあることでエージェントへの指示が「差分指定」で済む
 *    - ❌ 「TypeScriptの記事を対象読者を初心者にして全体的に書き直して」
 *    - ✅ 「もっと初心者向けに書き直して」（前の記事を覚えているから短くてよい）
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
// Memory に storage を直接渡すことで会話履歴を保持する
// -----------------------------------------------------------------------
const storage = new LibSQLStore({
  id: "tutorial-storage",
  url: ":memory:",
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
  memory: new Memory({
    storage,
    options: {
      lastMessages: 10,
    },
  }),
});

const THREAD_ID = "article-session-001";
const RESOURCE_ID = "user-001";

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
  console.log("\n【初稿（先頭300字）】");
  console.log(noMemResult1.text.slice(0, 300) + "...");

  console.log("\n[2回目] 修正指示を出す（前の文脈を渡さずに）...");
  const noMemResult2 = await agentWithoutMemory.generate([
    { role: "user", content: "もっと初心者向けに書き直して、専門用語を減らしてください。" },
  ]);
  console.log("\n【修正後（先頭300字）】");
  console.log(noMemResult2.text.slice(0, 300) + "...");

  console.log("\n⚠️  【問題点】");
  console.log("  修正指示が「何の記事に対する指示か」をエージェントが知らない。");
  console.log("  そのため、前の記事とは無関係な新しい記事が生成される。");

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
  console.log("\n【初稿（先頭300字）】");
  console.log(memResult1.text.slice(0, 300) + "...");

  console.log("\n[2回目] 修正指示（同じthread IDで送信）...");
  const memResult2 = await agentWithMemory.generate(
    "もっと初心者向けに書き直して、専門用語を減らしてください。",
    memoryOptions
  );
  console.log("\n【修正後（先頭300字）】");
  console.log(memResult2.text.slice(0, 300) + "...");

  console.log("\n[3回目] さらに追加修正...");
  const memResult3 = await agentWithMemory.generate(
    "コード例をもう1つ追加して、anyの使いすぎに注意する話も入れてください。",
    memoryOptions
  );
  console.log("\n【最終稿（先頭300字）】");
  console.log(memResult3.text.slice(0, 300) + "...");

  // ====================================================================
  // まとめ
  // ====================================================================
  console.log("\n" + "=".repeat(60));
  console.log("【観察ポイント】");
  console.log("=".repeat(60));
  console.log(`
1. PART 1 の2回目の生成は、前の記事とは全く別の内容になっているか？
   → メモリなしでは「もっと初心者向けに」という指示が何に対してなのか不明。

2. PART 2 の2回目・3回目は、前の記事を踏まえた改善になっているか？
   → thread IDが同じ = 同一会話として記憶されているため、差分指定が機能する。

3. thread と resource の役割:
   - thread  = 「この記事作業」というセッション単位
   - resource = 「誰のセッションか」というユーザー単位
   → 複数ユーザーが同じシステムを使う場合も resource で分離できる。

【Chapter 2・3 との繋がり】
- Chapter 2 のワークフローはステートレス（毎回フルで実行）
- Chapter 4 のメモリはステートフル（会話履歴を保持）
- 用途が異なる: ワークフロー = バッチ型の品質向上、メモリ = 対話型の反復改善
`);
}

main().catch(console.error);
