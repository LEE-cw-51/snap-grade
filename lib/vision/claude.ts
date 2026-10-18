import type {
  VisionAnswerKeyResult,
  VisionHomeworkResult,
  VisionReader,
} from "./types";

export class ClaudeVisionReader implements VisionReader {
  async extractAnswerKey(): Promise<VisionAnswerKeyResult> {
    throw new Error(
      "ClaudeVisionReader not fully wired in this build. Set VISION_PROVIDER=mock.",
    );
  }

  async extractHomework(): Promise<VisionHomeworkResult> {
    throw new Error(
      "ClaudeVisionReader not fully wired in this build. Set VISION_PROVIDER=mock.",
    );
  }
}
