import { expect, type APIRequestContext, type Page } from "@playwright/test";
import path from "node:path";

export const FIXTURE = path.join(
  process.cwd(),
  "fixtures",
  "sample-worksheet.png",
);

export const OPS_SECRET = process.env.OPS_SECRET || "e2e-ops";

export async function resetStore(request: APIRequestContext) {
  const res = await request.post("/api/ops/reset", {
    headers: { "x-ops-secret": OPS_SECRET },
  });
  expect(res.ok()).toBeTruthy();
}

export async function saveAnswerKeyViaUi(page: Page) {
  await page.goto("/answer-key");
  await page.getByText("정답지 등록").waitFor();
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);
  await expect(page.getByRole("button", { name: /1일차/ })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "이 구간 저장" }).click();
  await expect(page.getByText(/원본 이미지 삭제됨|저장됨 ·/)).toBeVisible({
    timeout: 15_000,
  });
}

export async function waitForQueueStatus(
  page: Page,
  studentName: string,
  statuses: string[],
) {
  const row = page.locator("li.panel", { hasText: studentName });
  await expect(row).toBeVisible();
  await expect
    .poll(async () => {
      const text = await row.innerText();
      return statuses.some((s) => text.includes(s));
    }, { timeout: 60_000 })
    .toBeTruthy();
}
