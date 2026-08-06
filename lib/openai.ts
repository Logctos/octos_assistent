import OpenAI from "openai";

let client: OpenAI | null = null;

/** Pass `apiKey` to use a caller-supplied key instead of `OPENAI_API_KEY` (not cached). */
export function getOpenAIClient(apiKey?: string): OpenAI {
  if (apiKey) {
    return new OpenAI({ apiKey });
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return client;
}
