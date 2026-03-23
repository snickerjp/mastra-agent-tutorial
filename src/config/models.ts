import { bedrock } from "@ai-sdk/amazon-bedrock";

export const getModel = () => {
  const provider = process.env.AI_PROVIDER || "openai";
  if (provider === "bedrock") {
    return bedrock("amazon.nova-lite-v1:0");
  }
  return "openai/gpt-4o-mini" as const;
};
