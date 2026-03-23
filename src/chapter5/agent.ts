/**
 * Chapter 5: ツールを使うエージェント
 *
 * tools プロパティにツールを渡すと、LLM が自律的にツールを呼び出す。
 * エージェントは「テキスト生成」だけでなく「アクション実行」ができるようになる。
 */

import { Agent } from "@mastra/core/agent";
import { getModel } from "../config/models.js";
import { getCurrentDate, searchTopic } from "./tools.js";

export const researchBlogAgent = new Agent({
  id: "research-blog-agent",
  name: "research-blog-agent",
  instructions: `あなたはリサーチ力のある技術ブログライターです。

## ルール
- 記事を書く前に、必ず searchTopic ツールで最新情報を調べてください
- 記事の冒頭に getCurrentDate ツールで取得した日付を含めてください
- 検索結果の情報を記事に反映し、出典を明記してください
- 日本語で書いてください`,
  model: getModel(),
  tools: { getCurrentDate, searchTopic },
});
