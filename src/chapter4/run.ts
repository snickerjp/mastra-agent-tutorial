/**
 * Chapter 4: メモリで反復改善する
 *
 * 【このChapterで体験すること】
 * 1. メモリなし: 「2番目に決めた」→ 何の2番目？が分からない
 * 2. メモリあり: 前の会話を覚えているので「2番目」が通じる
 * 3. thread と resource で会話セッションを管理する
 *
 * 実行コマンド:
 *   npm run ch4
 */

import "dotenv/config";

import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { getModel } from "../config/models.js";

const INSTRUCTIONS = `
あなたはプロの技術ブログライターです。
簡潔に回答してください。箇条書きを活用してください。
`.trim();

// メモリなしエージェント
const agentWithoutMemory = new Agent({
  id: "no-memory-agent",
  name: "no-memory-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
});

// メモリありエージェント
const storage = new LibSQLStore({ id: "tutorial-storage", url: ":memory:" });
const memory = new Memory({ storage, options: { lastMessages: 10 } });

const agentWithMemory = new Agent({
  id: "memory-agent",
  name: "memory-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
  memory,
});

const THREAD_ID = "article-session-001";
const RESOURCE_ID = "user-001";

// 3ターンの会話（各ターンが前のターンに依存する）
const MESSAGES = [
  "TypeScriptの型システムについてブログ記事を書きたい。タイトル候補を3つ提案して。",
  "2番目のタイトルに決めた。そのタイトルで記事の構成案（章立て）を5つ出して。",
  "第2章をもっと詳しくして。具体的なコード例も含めて。",
];

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
  // PART 1: メモリなし
  // ====================================================================
  console.log("\n" + "━".repeat(60));
  console.log("PART 1: メモリなし");
  console.log("━".repeat(60));

  const noMemResults: string[] = [];
  for (let i = 0; i < MESSAGES.length; i++) {
    console.log(`\n[${i + 1}回目] ${MESSAGES[i]}`);
    const result = await agentWithoutMemory.generate([
      { role: "user", content: MESSAGES[i] },
    ]);
    noMemResults.push(result.text);
    console.log(`\n${result.text}`);
    if (i > 0) {
      console.log(`\n  ⚠️  「${i === 1 ? "2番目" : "第2章"}」が何を指すか分からず、的外れな回答になっていないか確認`);
    }
  }

  // ====================================================================
  // PART 2: メモリあり
  // ====================================================================
  console.log("\n" + "━".repeat(60));
  console.log("PART 2: メモリあり（同じ thread で会話）");
  console.log("━".repeat(60));

  const memOptions = { memory: { thread: THREAD_ID, resource: RESOURCE_ID } };
  const memResults: string[] = [];
  for (let i = 0; i < MESSAGES.length; i++) {
    console.log(`\n[${i + 1}回目] ${MESSAGES[i]}`);
    const result = await agentWithMemory.generate(MESSAGES[i], memOptions);
    memResults.push(result.text);
    console.log(`\n${result.text}`);
    await showThreadStatus();
  }

  // ====================================================================
  // 比較
  // ====================================================================
  console.log("\n" + "=".repeat(60));
  console.log("【比較サマリー】");
  console.log("=".repeat(60));

  console.log(`
📌 2回目の質問: 「2番目のタイトルに決めた。構成案を出して。」

  メモリなし → 「2番目」が何か不明。1回目のタイトル候補を知らない。
  メモリあり → 1回目で提案した3つのタイトルを覚えており、2番目を選べる。

📌 3回目の質問: 「第2章をもっと詳しくして。」

  メモリなし → 「第2章」が何か不明。構成案を知らない。
  メモリあり → 2回目で出した構成案の第2章を覚えており、詳細化できる。

💡 メモリにより「差分指定」（前の文脈を前提とした短い指示）が可能になる。
   これは人間同士の会話と同じ — 毎回全部説明し直す必要がない。
`);
}

main().catch(console.error);
