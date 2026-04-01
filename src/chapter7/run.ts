/**
 * Chapter 7: MCP サーバーを作る — デモ実行スクリプト
 *
 * 1. server.ts を子プロセスとして起動（stdio トランスポート）
 * 2. MCPClient で接続し、ツール一覧を取得
 * 3. 実際にツールを呼び出して結果を表示
 */

import { MCPClient } from "@mastra/mcp";

console.log("============================================================");
console.log("Chapter 7: MCP サーバーを作る");
console.log("============================================================");
console.log("");
console.log("Chapter 5 のツールを MCP サーバーとして公開し、クライアントから呼び出します。");
console.log("");

// --- MCPClient で server.ts に接続 ---
const client = new MCPClient({
  id: "ch7-demo",
  servers: {
    blogResearch: {
      command: "npx",
      args: ["tsx", "src/chapter7/server.ts"],
    },
  },
});

try {
  // ツール一覧を取得
  const tools = await client.listTools();
  const toolNames = Object.keys(tools);
  console.log(`📋 利用可能なツール (${toolNames.length}個):`);
  for (const name of toolNames) {
    console.log(`  - ${name}`);
  }
  console.log("");

  // get-current-date を呼び出し
  console.log("--- getCurrentDate を実行 ---");
  const dateTool = tools["blogResearch_getCurrentDate"];
  if (!dateTool?.execute) throw new Error("getCurrentDate ツールが見つかりません");
  const dateResult = await dateTool.execute({}, { context: {} } as any);
  console.log("  結果:", JSON.stringify(dateResult, null, 2));
  console.log("");

  // search-topic を呼び出し
  console.log("--- searchTopic を実行 ---");
  const searchTool = tools["blogResearch_searchTopic"];
  if (!searchTool?.execute) throw new Error("searchTopic ツールが見つかりません");
  const searchResult = await searchTool.execute({ query: "TypeScript" }, { context: {} } as any);
  console.log("  結果:", JSON.stringify(searchResult, null, 2));
  console.log("");

  console.log("✅ MCP サーバー経由でツールを呼び出せました！");
  console.log("");
  console.log("📌 Cursor / Windsurf / Claude Desktop から接続するには:");
  console.log('   "command": "npx",');
  console.log('   "args": ["tsx", "src/chapter7/server.ts"]');
} finally {
  await client.disconnect();
}
