import type {
  VisionAnswerKeyResult,
  VisionHomeworkResult,
  VisionReader,
} from "./types";

/**
 * Gemini Flash vision reader. Implemented as a thin stub that throws if called
 * without a proper integration — production wiring uses @google/generative-ai.
 * For MVP file-pilot, prefer mock until key + prompt eval are ready.
 */
export class GeminiVisionReader implements VisionReader {
  async extractAnswerKey(): Promise<VisionAnswerKeyResult> {
    throw new Error(
      "GeminiVisionReader not fully wired in this build. Set VISION_PROVIDER=mock or add Gemini SDK call.",
    );
  }

  async extractHomework(): Promise<VisionHomeworkResult> {
    throw new Error(
      "GeminiVisionReader not fully wired in this build. Set VISION_PROVIDER=mock or add Gemini SDK call.",
    );
  }
}
