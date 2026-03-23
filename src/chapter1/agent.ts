import { Agent } from "@mastra/core/agent";
import { getModel } from "../config/models.js";

/**
 * 【悪い例】 曖昧な instructions + 未分割タスク
 *
 * 問題点:
 * - instructions が「何をするか」しか伝えていない
 * - 対象読者・文字数・構成・トーンが未定義
 * - LLM が毎回異なる判断をするため品質がブレる
 */
export const naiveBlogAgent = new Agent({
  id: "naive-blog-agent",
  name: "naive-blog-agent",
  instructions: "ブログ記事を書いてください。",
  model: getModel(),
});
