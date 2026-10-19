import { ClaudeVisionReader } from "./claude";
import { GeminiVisionReader } from "./gemini";
import { MockVisionReader } from "./mock";
import type { VisionReader } from "./types";

export type { VisionReader } from "./types";
export { MockVisionReader } from "./mock";

export function getVisionReader(): VisionReader {
  const provider = (process.env.VISION_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "gemini":
      if (!process.env.GEMINI_API_KEY) {
        console.warn("VISION_PROVIDER=gemini but no GEMINI_API_KEY; using mock");
        return new MockVisionReader();
      }
      return new GeminiVisionReader();
    case "claude":
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn("VISION_PROVIDER=claude but no ANTHROPIC_API_KEY; using mock");
        return new MockVisionReader();
      }
      return new ClaudeVisionReader();
    case "mock":
    default:
      return new MockVisionReader();
  }
}
