/**
 * Chapter 7: MCP サーバーを作る
 *
 * Chapter 5 で作ったツールを MCP (Model Context Protocol) サーバーとして公開する。
 * → Cursor, Windsurf, Claude Desktop など、MCP 対応クライアントから利用可能になる。
 *
 * お題: Chapter 5 のブログリサーチツールを MCP サーバー化する
 */

import { MCPServer } from "@mastra/mcp";
import { getCurrentDate, searchTopic } from "../chapter5/tools.js";

console.log("============================================================");
console.log("Chapter 7: MCP サーバー（stdio）");
console.log("============================================================");
console.log("");
console.log("Chapter 5 のツールを MCP サーバーとして公開します。");
console.log("  - get-current-date: 現在の日時を取得");
console.log("  - search-topic: トピックを検索");
console.log("");
console.log("📌 MCP クライアント（Cursor 等）から接続して使えます。");
console.log("============================================================");

const server = new MCPServer({
  id: "blog-research-server",
  name: "Blog Research MCP Server",
  version: "1.0.0",
  description: "ブログ記事のリサーチに使えるツールを提供する MCP サーバー",
  tools: { getCurrentDate, searchTopic },
});

server.startStdio().catch((err) => {
  console.error("MCP サーバーの起動に失敗しました:", err);
  process.exit(1);
});
