import { expect, test } from "@playwright/test";
import {
  FIXTURE,
  resetStore,
  saveAnswerKeyViaUi,
  waitForQueueStatus,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("mock MVP @ 390×844", () => {
  test("1) 정답지 저장 → 1장 채점 → 결과", async ({ page, request }) => {
    await resetStore(request);
    await saveAnswerKeyViaUi(page);

    await page.goto("/");
    await expect(page.getByText("1일차 연산")).toBeVisible();

    await page.goto("/grade");
    await page.locator("select").nth(0).selectOption({ index: 0 });
    await page.locator("select").nth(1).selectOption({ label: "김민수 · 초4-A" });
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    await waitForQueueStatus(page, "김민수", ["확인 필요", "완료"]);
    await page.getByRole("link", { name: /결과 보기|확인 필요 처리/ }).click();
    await expect(page.getByText("✕ 틀린 번호")).toBeVisible();
    await expect(page.getByText("? 확인 필요")).toBeVisible();
  });

  test("2) 연속 채점 + ? 일괄 확정", async ({ page }) => {
    await page.goto("/grade");
    await page.locator("select").nth(1).selectOption({ label: "이서연 · 초4-A" });
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    await waitForQueueStatus(page, "이서연", ["확인 필요", "완료"]);
    await page
      .locator("li.panel", { hasText: "이서연" })
      .getByRole("link", { name: /결과 보기|확인 필요 처리/ })
      .click();

    await expect(page.getByRole("button", { name: "6번" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "6번" }).click();
    await expect(page.getByText("확인 필요 · 6번")).toBeVisible();
    await expect(page.getByText("AI 추정:")).toBeVisible();
    await page.getByRole("button", { name: "이 학습지 남은 ? 모두 △" }).click();
    await expect(page.getByText("확인 필요")).toBeVisible();
    await expect(page.getByRole("button", { name: "6번" })).toHaveCount(0);
  });

  test("3) 일일 한도 / 페이지 한도 거부", async ({ page, request }) => {
    // DAILY_GRADE_LIMIT=2 for webServer — two prior grades exhausted the day.
    await page.goto("/grade");
    await page.locator("select").nth(1).selectOption({ label: "김민수 · 초4-A" });
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    await expect(
      page.getByText(/오늘 채점 한도|daily/i),
    ).toBeVisible({ timeout: 20_000 });

    const worksheets = await request.get("/api/worksheets").then((r) => r.json());
    const wsId = worksheets.worksheets[0].id as string;
    const pageLimit = await request.post("/api/submissions", {
      data: {
        worksheetId: wsId,
        studentId: "stu-2",
        photoDataUrl: "data:image/png;base64,AAAA",
        pageCount: 3,
      },
    });
    expect(pageLimit.status()).toBe(400);
    const body = await pageLimit.json();
    expect(body.error).toBe("page_limit");
  });
});
