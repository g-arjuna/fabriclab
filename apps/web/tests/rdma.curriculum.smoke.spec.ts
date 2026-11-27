import { expect, test, type Page } from "@playwright/test";

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
];

function trackErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !allowedConsolePatterns.some((pattern) => pattern.test(message.text()))) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

function expectNoBrowserErrors(tracker: { consoleErrors: string[]; pageErrors: string[] }) {
  expect(tracker.consoleErrors, `browser console errors: ${tracker.consoleErrors.join("\n")}`).toEqual([]);
  expect(tracker.pageErrors, `browser page errors: ${tracker.pageErrors.join("\n")}`).toEqual([]);
}

async function openCurriculum(page: Page, lesson?: string) {
  await page.goto(`/practical/rdma${lesson ? `?lesson=${lesson}` : ""}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("rdma-curriculum")).toHaveAttribute("data-hydrated", "true", { timeout: 30000 });
  await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 30000 });
}

async function signature(page: Page) {
  if (await page.getByTestId("rdma-curriculum-complete").isVisible().catch(() => false)) return "course-complete";
  const lesson = page.locator("[data-testid^=guided-lesson-]").first();
  if (!(await lesson.count())) return "no-lesson";
  const article = page.getByTestId("guided-article");
  return `${await lesson.getAttribute("data-testid")}|${await article.getAttribute("data-guided-step")}|${await article.getAttribute("data-stage-index")}`;
}

async function clickNextAndWait(page: Page, before: string) {
  await expect(page.getByTestId("lesson-action")).toBeEnabled();
  await page.getByTestId("lesson-action").click();
  await expect.poll(() => signature(page), { timeout: 5000 }).not.toBe(before);
}

async function expectUsefulGuidedState(page: Page) {
  const visualChildren = await page.getByTestId("lesson-visual").evaluate((element) => element.childElementCount);
  const narrativeLength = await page.getByTestId("lesson-narrative").evaluate((element) => (element.textContent || "").trim().length);
  const position = (await page.getByTestId("guided-position").textContent()) || "";
  expect(visualChildren, `missing visual for ${position}`).toBeGreaterThan(0);
  expect(narrativeLength, `missing explanation for ${position}`).toBeGreaterThan(30);
  await expect(page.getByTestId("guided-next-preview")).toBeVisible();
}

test.describe("RDMA guided curriculum smoke", () => {
  test("practical landing starts beginners in Lesson 1 and keeps the explorer secondary", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "RDMA From First Principles" })).toBeVisible();
    await page.getByRole("link", { name: /^Start learning$/i }).last().click();
    await expect(page).toHaveURL(/\/practical\/rdma/);
    await expect(page.getByText("Lesson 1 of 8", { exact: true })).toBeVisible();
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByTestId("foundation-host-architecture")).toBeVisible();
    await expect(page.getByRole("link", { name: /Open advanced execution explorer/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Play$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Pause$/i })).toHaveCount(0);
    expectNoBrowserErrors(tracker);
  });

  test("a first-time learner can traverse every guided state in all eight lessons using only Next", async ({ page }) => {
    const tracker = trackErrors(page);
    test.setTimeout(600_000);
    await openCurriculum(page);
    const visited = new Map<string, string[]>();

    for (let transitions = 0; transitions < 500; transitions += 1) {
      if (await page.getByTestId("rdma-curriculum-complete").isVisible().catch(() => false)) break;
      const before = await signature(page);
      expect(before).not.toBe("no-lesson");
      const [lessonTestId, stepId] = before.split("|");
      const lessonSteps = visited.get(lessonTestId) || [];
      if (!lessonSteps.includes(stepId)) lessonSteps.push(stepId);
      visited.set(lessonTestId, lessonSteps);
      await expectUsefulGuidedState(page);
      await clickNextAndWait(page, before);
    }

    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    expect(visited.size).toBe(8);
    const stateCounts = Object.fromEntries([...visited.entries()].map(([lesson, steps]) => [lesson, steps.length]));
    expect(stateCounts).toMatchObject({
      "guided-lesson-moving-data": expect.any(Number),
      "guided-lesson-why-rdma": expect.any(Number),
      "guided-lesson-memory": expect.any(Number),
      "guided-lesson-queues": expect.any(Number),
      "guided-lesson-send-receive": expect.any(Number),
      "guided-lesson-write": expect.any(Number),
      "guided-lesson-read": expect.any(Number),
      "guided-lesson-packets": expect.any(Number),
    });
    expect(Object.values(stateCounts).every((count) => count > 1)).toBe(true);
    expectNoBrowserErrors(tracker);
  });

  test("refresh, Previous, direct reference access and restart preserve guided-state semantics", async ({ page }) => {
    const tracker = trackErrors(page);
    await openCurriculum(page);
    await expect(page.getByTestId("guided-position")).toContainText("1.1");
    await expect(page.getByTestId("guided-position")).toContainText("Stage 1 of 4");
    await expect(page.getByTestId("hardware-cpu")).toBeVisible();

    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("guided-position")).toContainText("Stage 2 of 4");
    await expect(page.getByTestId("software-responsibility-overlay")).toBeVisible();
    const stageTwoStep = await page.getByTestId("guided-article").getAttribute("data-guided-step");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 30000 });
    await expect(page.getByTestId("guided-article")).toHaveAttribute("data-guided-step", stageTwoStep || "");
    await expect(page.getByTestId("software-responsibility-overlay")).toBeVisible();

    await page.getByTestId("lesson-previous").click();
    await expect(page.getByTestId("guided-position")).toContainText("Stage 1 of 4");
    await expect(page.getByTestId("hardware-cpu")).toBeVisible();
    await expect(page.getByTestId("software-responsibility-overlay")).toHaveCount(0);

    const outline = page.getByTestId("lesson-outline");
    await outline.locator("summary").click();
    await outline.getByRole("button", { name: /Read the evidence, then ask why RDMA is needed/ }).click();
    for (let index = 0; index < 3; index += 1) {
      const before = await signature(page);
      await clickNextAndWait(page, before);
    }
    await expect(page.getByTestId("guided-position")).toContainText("Stage 4 of 4");
    await expect(page.getByTestId("lesson-action")).toBeDisabled();
    await expect(page.getByText(/completion is recorded only after each guided state has been viewed/i)).toBeVisible();

    await page.getByRole("button", { name: /Restart this lesson/i }).click();
    await expect(page.getByTestId("guided-position")).toContainText("1.1");
    await expect(page.getByTestId("guided-position")).toContainText("Stage 1 of 4");
    await expect(page.getByTestId("lesson-action")).toBeEnabled();
    expectNoBrowserErrors(tracker);
  });

  test("mobile guided state keeps explanation, visual result and persistent Next horizontally contained", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCurriculum(page);
    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("guided-position")).toContainText("Stage 2 of 4");
    await expect(page.getByTestId("guided-stage-explanation")).toBeVisible();
    const order = await page.evaluate(() => {
      const narrative = document.querySelector("[data-testid=lesson-narrative]")?.getBoundingClientRect().top ?? 0;
      const visual = document.querySelector("[data-testid=lesson-visual]")?.getBoundingClientRect().top ?? 0;
      const inspect = document.querySelector("[data-testid=inspect-panel]")?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      return { narrative, visual, inspect, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth };
    });
    expect(order.narrative).toBeLessThan(order.visual);
    expect(order.visual).toBeLessThan(order.inspect);
    expect(order.scrollWidth).toBeLessThanOrEqual(order.innerWidth + 1);
    await expect(page.getByTestId("lesson-action")).toBeVisible();
    await expect(page.getByTestId("guided-next-preview")).toBeVisible();
  });

  test("unversioned legacy completion is not silently carried into the redesigned guided course", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("fabriclab.rdma.curriculum.completed", JSON.stringify(["moving-data", "why-rdma", "memory", "queues", "send-receive", "write"]));
      window.localStorage.setItem("fabriclab.rdma.curriculum.finished", "true");
    });
    await openCurriculum(page, "moving-data");
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByTestId("guided-progress-migration-notice")).toContainText("progress was not carried forward");
    await expect(page.getByTestId("rdma-curriculum-complete")).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem("fabriclab.rdma.curriculum.completed.v3"))).toBe(JSON.stringify([]));
  });

  test("Foundations V2 completion migration preserves meaningful progress and restarts revised operations", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("fabriclab.rdma.curriculum.completed.v2", JSON.stringify(["moving-data", "why-rdma", "memory", "queues", "send-receive", "write", "read", "packets"]));
      window.localStorage.setItem("fabriclab.rdma.curriculum.finished", "true");
    });
    await openCurriculum(page, "send-receive");
    await expect(page.getByTestId("guided-lesson-send-receive")).toBeVisible();
    await expect(page.getByTestId("guided-progress-migration-notice")).toContainText("restart those lessons");
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem("fabriclab.rdma.curriculum.completed.v3"))).toBe(JSON.stringify(["moving-data", "why-rdma", "memory", "queues"]));
    await expect(page.getByTestId("rdma-curriculum-complete")).toHaveCount(0);
  });

  test("advanced execution explorer remains available as a secondary destination", async ({ page }) => {
    await openCurriculum(page);
    await page.getByRole("link", { name: /Open advanced execution explorer|Explorer/i }).first().click();
    await expect(page).toHaveURL(/\/practical\/rdma\/explorer/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /synchronized replay|advanced execution|execution explorer/i }).first()).toBeVisible({ timeout: 30000 });
  });

});
