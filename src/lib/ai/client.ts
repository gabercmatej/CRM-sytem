import Anthropic from "@anthropic-ai/sdk";

// One shared client; the SDK reads ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic();

// Primary model for research, chat and email generation.
export const MODEL = "claude-opus-4-8";
// Cheap model for utility tasks (titles, classification, extraction).
export const UTILITY_MODEL = "claude-haiku-4-5";
