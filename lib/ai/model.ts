import { createOpenAI } from "@ai-sdk/openai";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

if (
	process.env.OLLAMA_BASE_URL === undefined ||
	process.env.OLLAMA_MODEL === undefined
) {
	throw new Error("Missing environment variables");
}

const BASE_URL = process.env.OLLAMA_BASE_URL as string;
const m = process.env.GOOGLE_API_KEY
	? createGoogleGenerativeAI({
			apiKey: process.env.GOOGLE_API_KEY,
		})
	: createOpenAI({ baseURL: BASE_URL, apiKey: "ollama" });
const model = m(process.env.GOOGLE_MODEL ?? process.env.OLLAMA_MODEL as string, {
	structuredOutputs: true,
});
// middleware to extract reasoning tokens
export const AIModel = wrapLanguageModel({
	model: model,
	middleware: extractReasoningMiddleware({ tagName: "think" }),
});
