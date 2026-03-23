export const MODEL_CONFIGS = {
  openai: "openai/gpt-4o-mini",
  bedrock: "bedrock/amazon.nova-lite-v1:0",
} as const;

export type AIProvider = keyof typeof MODEL_CONFIGS;
export type ModelId = (typeof MODEL_CONFIGS)[AIProvider];

export const getModel = (): ModelId => {
  const providerEnv = process.env.AI_PROVIDER || "openai";

  if (!Object.hasOwn(MODEL_CONFIGS, providerEnv)) {
    throw new Error(
      `Invalid AI_PROVIDER: ${providerEnv}. Must be one of: ${Object.keys(MODEL_CONFIGS).join(", ")}`
    );
  }

  const provider = providerEnv as AIProvider;
  return MODEL_CONFIGS[provider];
};
