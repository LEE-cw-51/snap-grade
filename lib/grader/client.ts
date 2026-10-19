import { spawn } from "node:child_process";
import path from "node:path";

export type CompareResult = {
  verdict: "O" | "TRI" | "X";
  reason_code: string | null;
};

export async function compareAnswers(
  student: string,
  answer: string,
  formRules?: Record<string, string>,
): Promise<CompareResult> {
  const url = process.env.GRADER_URL;
  if (url) {
    const res = await fetch(`${url.replace(/\/$/, "")}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student, answer, form_rules: formRules }),
    });
    if (!res.ok) throw new Error(`grader HTTP ${res.status}`);
    return (await res.json()) as CompareResult;
  }
  return runCli({ op: "compare", student, answer, form_rules: formRules });
}

export async function computeFromProblem(
  problemLatex: string,
): Promise<string | null> {
  const url = process.env.GRADER_URL;
  if (url) {
    const res = await fetch(`${url.replace(/\/$/, "")}/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem_latex: problemLatex }),
    });
    if (!res.ok) throw new Error(`grader HTTP ${res.status}`);
    const data = (await res.json()) as { computed_answer_latex: string | null };
    return data.computed_answer_latex;
  }
  const out = await runCli<{ computed_answer_latex: string | null }>({
    op: "compute",
    problem_latex: problemLatex,
  });
  return out.computed_answer_latex;
}

function runCli<T = CompareResult>(payload: Record<string, unknown>): Promise<T> {
  const cwd = path.join(process.cwd(), "python", "grader");
  const script = path.join(cwd, "cli.py");
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [script], { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`grader cli exit ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as T);
      } catch (e) {
        reject(e);
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
