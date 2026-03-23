import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

export const getModel = (options?: { pro?: boolean }) => {
  const provider = process.env.AI_PROVIDER || "openai";
  if (provider === "bedrock") {
    const bedrock = createAmazonBedrock({
      region: process.env.AWS_REGION || "us-east-1",
      credentialProvider: fromNodeProviderChain(),
    });
    const modelId = options?.pro ? "amazon.nova-pro-v1:0" : "amazon.nova-lite-v1:0";
    return bedrock(modelId);
  }
  return "openai/gpt-4o-mini" as const;
};
