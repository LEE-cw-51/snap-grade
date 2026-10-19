export type VisionHomeworkItem = {
  number: string;
  section?: string | null;
  student_answer_latex: string;
  student_answer_raw: string;
  read_confidence: number;
  legible: boolean;
  alternatives?: string[];
  problem_latex?: string | null;
  location_hint?: string | null;
};

export type VisionHomeworkResult = {
  items: VisionHomeworkItem[];
  page_notes?: string;
};

export type VisionAnswerItem = {
  number: string;
  answer_latex: string;
  instruction_hint?: string | null;
};

export type VisionAnswerSection = {
  label: string;
  items: VisionAnswerItem[];
};

export type VisionAnswerKeyResult = {
  sections: VisionAnswerSection[];
};

export interface VisionReader {
  extractAnswerKey(image: Buffer | string, mimeType: string): Promise<VisionAnswerKeyResult>;
  extractHomework(image: Buffer | string, mimeType: string): Promise<VisionHomeworkResult>;
}
