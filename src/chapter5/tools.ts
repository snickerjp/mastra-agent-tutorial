/**
 * Chapter 5: ツール定義
 *
 * createTool でエージェントが「実行できるアクション」を定義する。
 * LLM は inputSchema を見て、いつ・どの引数で呼ぶかを自律的に判断する。
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * 現在の日時を返すツール
 * → エージェントが「今日は何日？」に答えられるようになる
 */
export const getCurrentDate = createTool({
  id: "get-current-date",
  description: "現在の日時を取得する。記事に日付を含めたいときに使う。",
  inputSchema: z.object({}),
  execute: async () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }),
      iso: now.toISOString(),
    };
  },
});

/**
 * トピックに関する情報を検索するツール（シミュレーション）
 * → エージェントが「調べてから書く」ことができるようになる
 *
 * 実際のプロダクトでは外部 API（Google Search, Wikipedia 等）を呼ぶ。
 * ここでは学習用にモックデータを返す。
 */
export const searchTopic = createTool({
  id: "search-topic",
  description:
    "トピックに関する最新情報や事実を検索する。記事を書く前のリサーチに使う。",
  inputSchema: z.object({
    query: z.string().describe("検索クエリ"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        snippet: z.string(),
        source: z.string(),
      })
    ),
  }),
  execute: async ({ query }) => {
    // モックデータ（実際は外部APIを呼ぶ）
    console.log(`  🔍 [Mock] 検索中: "${query}"`);
    const mockDB: Record<string, { title: string; snippet: string; source: string }[]> = {
      TypeScript: [
        {
          title: "TypeScript 5.x の新機能",
          snippet:
            "デコレータが正式サポートされ、satisfies 演算子で型の安全性が向上。const type parameters も追加。",
          source: "typescriptlang.org",
        },
        {
          title: "TypeScript 採用率の推移",
          snippet:
            "Stack Overflow 調査で TypeScript は最も愛される言語の上位に。GitHub での利用率も年々増加。",
          source: "stackoverflow.com",
        },
      ],
    };

    // クエリに部分一致するキーを探す
    const key = Object.keys(mockDB).find((k) =>
      query.toLowerCase().includes(k.toLowerCase())
    );

    return {
      results: key
        ? mockDB[key]
        : [
            {
              title: `${query} に関する最新動向`,
              snippet: `${query} は近年注目を集めている技術分野です。多くの企業が採用を進めています。`,
              source: "example.com",
            },
          ],
    };
  },
});

/**
 * DuckDuckGo Instant Answers API を使った実検索ツール（API キー不要）
 */
export const searchTopicLive = createTool({
  id: "search-topic-live",
  description:
    "DuckDuckGo API でトピックに関する情報を検索する。記事を書く前のリサーチに使う。",
  inputSchema: z.object({
    query: z.string().describe("検索クエリ（英語推奨）"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        snippet: z.string(),
        source: z.string(),
      })
    ),
  }),
  execute: async ({ query }) => {
    console.log(`  🌐 [Live] 検索中: "${query}"`);
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        Heading?: string;
        AbstractText?: string;
        AbstractSource?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      };

      const results: { title: string; snippet: string; source: string }[] = [];

      if (data.AbstractText) {
        results.push({
          title: data.Heading ?? query,
          snippet: data.AbstractText,
          source: data.AbstractSource ?? "",
        });
      }

      for (const topic of (data.RelatedTopics ?? []).slice(0, 3)) {
        if (topic.Text) {
          results.push({
            title: topic.Text.slice(0, 80),
            snippet: topic.Text,
            source: topic.FirstURL ?? "",
          });
        }
      }

      if (results.length === 0) {
        results.push({
          title: query,
          snippet: `「${query}」の Instant Answer は見つかりませんでした。`,
          source: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        });
      }

      return { results };
    } catch (e) {
      return {
        results: [{
          title: query,
          snippet: `検索に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
          source: "",
        }],
      };
    }
  },
});
