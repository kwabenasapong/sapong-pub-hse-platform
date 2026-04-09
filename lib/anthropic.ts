import Anthropic from "@anthropic-ai/sdk";

// Singleton Anthropic client — API key injected from env
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});
