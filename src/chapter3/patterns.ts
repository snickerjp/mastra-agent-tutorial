import { Agent } from "@mastra/core/agent";
import { getModel } from "../config/models.js";

/**
 * Chapter 3 で比較する3パターンのエージェント定義
 *
 * 同じトピック（TypeScript入門）で生成しても、
 * instructions と inputData の品質次第でスコアが大きく変わることを体験する。
 */

// -----------------------------------------------------------------------
// パターン A: 最悪ケース
// - instructions が「何をするか」しか伝えていない
// - ユーザーリクエストも曖昧
// -----------------------------------------------------------------------
export const patternA = {
  label: "パターン A（最悪）: 曖昧な instructions + 曖昧なリクエスト",
  agent: new Agent({
    id: "pattern-a-agent",
    name: "pattern-a-agent",
    instructions: "ブログ記事を書いてください。",
    model: getModel(),
  }),
  request: "TypeScriptについて",
};

// -----------------------------------------------------------------------
// パターン B: 中程度ケース
// - instructions は詳細だが
// - ユーザーリクエストにはトピックしか含まれていない
// -----------------------------------------------------------------------
export const patternB = {
  label: "パターン B（中程度）: 詳細な instructions + トピックのみのリクエスト",
  agent: new Agent({
    id: "pattern-b-agent",
    name: "pattern-b-agent",
    instructions: `
あなたはプロの技術ブログライターです。
記事は以下の形式に従ってください:
- Markdown形式
- 導入（背景・読者が得られること）→ 本文（概念説明 + コード例）→ まとめ の構成
- 専門用語には簡単な説明を添える
- コード例は必ず含める
    `.trim(),
    model: getModel(),
  }),
  request: "TypeScriptについて",
};

// -----------------------------------------------------------------------
// パターン C: 最良ケース
// - instructions が詳細
// - ユーザーリクエストに対象読者・文字数・構成の要件が含まれている
// -----------------------------------------------------------------------
export const patternC = {
  label: "パターン C（最良）: 詳細な instructions + 構造化されたリクエスト",
  agent: new Agent({
    id: "pattern-c-agent",
    name: "pattern-c-agent",
    instructions: `
あなたはプロの技術ブログライターです。
記事は以下の形式に従ってください:
- Markdown形式
- 導入（背景・読者が得られること）→ 本文（概念説明 + コード例）→ まとめ の構成
- 専門用語には簡単な説明を添える
- コード例は必ず含める
    `.trim(),
    model: getModel(),
  }),
  request: `
以下の条件で技術ブログ記事を書いてください:

【トピック】TypeScript の型システム入門
【対象読者】JavaScriptは1年以上の経験があるが、TypeScriptを使ったことがないフロントエンドエンジニア
【目標文字数】1500〜2000字
【必須セクション】
  1. なぜ TypeScript を使うのか（型があることのメリット）
  2. 基本的な型アノテーション（string, number, boolean, 配列）
  3. 関数の型定義
  4. よくある間違いと対処法
【トーン】丁寧だが堅すぎない。実務目線で書く。
  `.trim(),
};
