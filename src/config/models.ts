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

  if (provider === "gemini") {
    const { createGoogleGenerativeAI } = require("@ai-sdk/google");
    const google = createGoogleGenerativeAI();
    return google("gemini-3.1-flash-lite-preview");
  }

  if (provider === "vertex") {
    const { createVertex } = require("@ai-sdk/google-vertex");
    const vertex = createVertex({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "global",
    });
    return vertex("gemini-3.1-flash-lite-preview");
  }

  return "openai/gpt-4o-mini" as const;
};
