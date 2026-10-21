import answerKeyDefault from "../../fixtures/answer-key-default.json";
import type { VisionAnswerKeyResult, VisionHomeworkResult } from "./types";

export function mockAnswerKeyFixture(): VisionAnswerKeyResult {
  return structuredClone(answerKeyDefault) as VisionAnswerKeyResult;
}

/** Default homework answers aligned with 1일차 answer key (+ one ? item). */
export function mockHomeworkFixture(): VisionHomeworkResult {
  return {
    items: [
      {
        number: "1",
        student_answer_latex: "68",
        student_answer_raw: "68",
        read_confidence: 0.95,
        legible: true,
        problem_latex: "30+38",
      },
      {
        number: "2",
        student_answer_latex: "\\frac{6}{8}",
        student_answer_raw: "6/8",
        read_confidence: 0.92,
        legible: true,
        problem_latex: "\\frac{1}{2}+\\frac{1}{4}",
      },
      {
        number: "3",
        student_answer_latex: "\\sqrt{12}",
        student_answer_raw: "sqrt12",
        read_confidence: 0.88,
        legible: true,
        problem_latex: "\\sqrt{4\\cdot 3}",
      },
      {
        number: "4",
        student_answer_latex: "3 ... 2",
        student_answer_raw: "3...2",
        read_confidence: 0.9,
        legible: true,
        problem_latex: "14\\div4",
      },
      {
        number: "5",
        student_answer_latex: "12",
        student_answer_raw: "12",
        read_confidence: 0.91,
        legible: true,
        problem_latex: "길이",
      },
      {
        number: "6",
        student_answer_latex: "??",
        student_answer_raw: "",
        read_confidence: 0.4,
        legible: false,
        alternatives: ["7", "1"],
        problem_latex: "3+4",
        location_hint: "하단",
      },
    ],
    page_notes: "mock fixture",
  };
}
