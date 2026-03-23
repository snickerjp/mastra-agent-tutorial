import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

export const getModel = () => {
  const provider = process.env.AI_PROVIDER || "openai";
  if (provider === "bedrock") {
    const bedrock = createAmazonBedrock({
      region: process.env.AWS_REGION || "us-east-1",
      credentialProvider: fromNodeProviderChain(),
    });
    return bedrock("amazon.nova-lite-v1:0");
  }
  return "openai/gpt-4o-mini" as const;
};
