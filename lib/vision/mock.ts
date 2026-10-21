import { mockAnswerKeyFixture, mockHomeworkFixture } from "./fixtures";
import type {
  VisionAnswerKeyResult,
  VisionHomeworkResult,
  VisionReader,
} from "./types";

/** Deterministic fixtures for $0 E2E — no network. */
export class MockVisionReader implements VisionReader {
  async extractAnswerKey(): Promise<VisionAnswerKeyResult> {
    return mockAnswerKeyFixture();
  }

  async extractHomework(): Promise<VisionHomeworkResult> {
    return mockHomeworkFixture();
  }
}
