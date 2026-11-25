import { expect, test, type Page } from "@playwright/test";

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
];

function trackErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !allowedConsolePatterns.some((pattern) => pattern.test(message.text()))) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

function expectNoBrowserErrors(tracker: { consoleErrors: string[]; pageErrors: string[] }) {
  expect(tracker.consoleErrors, `browser console errors: ${tracker.consoleErrors.join("\n")}`).toEqual([]);
  expect(tracker.pageErrors, `browser page errors: ${tracker.pageErrors.join("\n")}`).toEqual([]);
}

async function expectNoEmptySourceExcerpts(page: Page) {
  const emptySources = await page.getByTestId("source-excerpt").evaluateAll((elements) =>
    elements
      .filter((element) => element.querySelectorAll("pre > div").length === 0)
      .map((element) => element.textContent || "unnamed source excerpt"),
  );
  expect(emptySources).toEqual([]);
}

async function clickLessonAction(page: Page) {
  await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByTestId("lesson-action")).toBeEnabled();
  await expectNoEmptySourceExcerpts(page);
  await page.getByTestId("lesson-action").click();
}

async function advanceStates(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    await clickLessonAction(page);
  }
}

async function completeLesson(page: Page, lessonId: string, stateCount: number) {
  await expect(page.getByTestId(`guided-lesson-${lessonId}`)).toBeVisible();
  for (let index = 0; index < stateCount; index += 1) {
    if (lessonId === "write" && index === 8) {
      await page.getByRole("button", { name: /No — ordinary WRITE produces none/i }).click();
      await expect(page.getByTestId("write-prediction-result")).toContainText(/Correct prediction/i);
    }
    await clickLessonAction(page);
  }
}

test.describe("RDMA first-principles curriculum", () => {
  test("practical landing page starts beginners in Lesson 1 and keeps the explorer secondary", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "RDMA From First Principles" })).toBeVisible();
    await expect(page.getByText(/how data moves from an application’s memory/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Start with RDMA WRITE/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Begin with resources/i })).toHaveCount(0);

    await page.getByRole("link", { name: /^Start learning$/i }).last().click();
    await expect(page).toHaveURL(/\/practical\/rdma/);
    await expect(page.getByText(/Lesson 1 of 8/i)).toBeVisible();
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByTestId("rdma-curriculum")).not.toContainText(/QPN|RKEY|LKEY|Protection Domain|Completion Queue Entry/);
    await expect(page.getByRole("button", { name: /^Play$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Pause$/i })).toHaveCount(0);
    expectNoBrowserErrors(tracker);
  });

  test("a learner can progress manually through every state of all eight lessons", async ({ page }) => {
    const tracker = trackErrors(page);
    test.setTimeout(120_000);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("rdma-curriculum")).toHaveAttribute("data-hydrated", "true");

    const before = await page.getByText(/State 1 of 7/i).textContent();
    await page.waitForTimeout(1100);
    expect(await page.getByText(/State 1 of 7/i).textContent()).toBe(before);

    await completeLesson(page, "moving-data", 7);
    await completeLesson(page, "why-rdma", 6);
    await completeLesson(page, "memory", 6);
    await completeLesson(page, "queues", 7);
    await completeLesson(page, "send-receive", 10);
    await completeLesson(page, "write", 11);
    await completeLesson(page, "read", 10);
    await completeLesson(page, "packets", 7);

    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    await expect(page.getByText(/followed application memory all the way to genuine RoCEv2 packets/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("backward navigation and lesson progress survive reload without autoplay", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await clickLessonAction(page);
    await clickLessonAction(page);
    await expect(page.getByText(/State 3 of 7/i)).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(/State 3 of 7/i)).toBeVisible();
    await page.getByRole("button", { name: /Back to previous state/i }).click();
    await expect(page.getByText(/State 2 of 7/i)).toBeVisible();

    await page.getByRole("button", { name: /Why RDMA\?/i }).click();
    await expect(page.getByTestId("guided-lesson-why-rdma")).toBeVisible();
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-why-rdma")).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("SEND/RECEIVE evidence connects payload, packet and local completion ownership", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=send-receive", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-send-receive")).toBeVisible();
    await advanceStates(page, 8);
    await expect(page.getByRole("heading", { name: /Each endpoint observes its own local completion/i })).toBeVisible();
    await expect(page.getByText(/Server A observes a send completion/i)).toBeVisible();
    await expect(page.getByText(/Server B observes a receive completion/i)).toBeVisible();
    await expect(page.getByText(/Neither completion travels on the network/i)).toBeVisible();
    await expect(page.getByText(/Hello RDMA - SEND\/RECV over Soft-RoCE/i).first()).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("ordinary WRITE requires prediction and exposes empty target completion evidence", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=write", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-write")).toBeVisible();
    await advanceStates(page, 8);
    await expect(page.getByTestId("write-completion-prediction")).toBeVisible();
    await expect(page.getByTestId("lesson-action")).toBeDisabled();
    await page.getByRole("button", { name: /Yes — a normal receive completion appears/i }).click();
    await expect(page.getByTestId("write-prediction-result")).toContainText(/ordinary WRITE has different target-side semantics/i);
    await clickLessonAction(page);
    await expect(page.getByText(/recorded zero completions/i)).toBeVisible();
    await expect(page.getByText(/no normal target receive CQE exists/i)).toBeVisible();
    await expect(page.getByText(/does not carry the RDMA payload/i)).toBeVisible();
    await clickLessonAction(page);
    const comparison = page.getByTestId("operation-comparison");
    await expect(comparison.getByRole("columnheader", { name: /SEND\/RECEIVE/i })).toBeVisible();
    await expect(comparison.getByRole("columnheader", { name: /Ordinary WRITE/i })).toBeVisible();
    await expect(comparison.getByRole("columnheader", { name: /^READ$/i })).toHaveCount(0);
    expectNoBrowserErrors(tracker);
  });

  test("READ request and payload response directions are explicit and technically accurate", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=read", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-read")).toBeVisible();
    await advanceStates(page, 6);
    await expect(page.getByText(/request went A → B, while the payload response goes B → A/i)).toBeVisible();
    await expect(page.getByText(/does not contain an RETH header/i)).toBeVisible();
    await advanceStates(page, 2);
    await expect(page.getByRole("heading", { name: /initiating reader owns the completion/i })).toBeVisible();
    await expect(page.getByText(/did not post a Work Request for the READ/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("packet fields correlate to endpoints, memory resources, work requests and source", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=packets", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await advanceStates(page, 4);
    await expect(page.getByTestId("packet-investigator")).toBeVisible();

    await page.getByRole("button", { name: /Destination QPN/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/targets the responder endpoint on Server B/i);
    await page.getByRole("button", { name: /^RKEY/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/scoped region authorization/i);
    await expect(page.getByTestId("field-correlation")).toContainText(/c:memory:hostb/i);
    await page.getByRole("button", { name: /Remote virtual address/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/Correlated memory resource/i);
    await expect(page.getByTestId("field-correlation")).toContainText(/c:memory:hostb/i);
    await page.getByRole("button", { name: /Operation opcode/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/Correlated application Work Request/i);
    await expect(page.getByTestId("field-correlation")).toContainText(/RDMA_WRITE/i);

    await clickLessonAction(page);
    await expect(page.getByTestId("final-packet-investigation")).toBeVisible();
    await page.locator("fieldset", { hasText: /Which RDMA operation/ }).getByRole("button", { name: /ordinary WRITE/i }).click();
    await page.locator("fieldset", { hasText: /capture alone prove/ }).getByRole("button", { name: /Wire direction, headers and payload bytes only/i }).click();
    await expect(page.locator("fieldset", { hasText: /Which RDMA operation/ })).toContainText(/correct/i);
    expectNoBrowserErrors(tracker);
  });

  test("advanced execution explorer remains available and functional as a secondary destination", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Open advanced execution explorer/i }).first().click();
    await expect(page).toHaveURL(/\/practical\/rdma\/explorer/);
    await expect(page.getByTestId("rdma-practical")).toHaveAttribute("data-hydrated", "true");
    await expect(page.getByRole("group", { name: /Select RDMA experiment/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    await page.goto("/practical/rdma?experiment=write", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/practical\/rdma\/explorer\?experiment=write/);
    await expect(page.getByTestId("rdma-practical")).toHaveAttribute("data-hydrated", "true");
    expectNoBrowserErrors(tracker);
  });

  test("mobile curriculum rendering is readable, keyboard-accessible and horizontally contained", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByTestId("lesson-action")).toBeVisible();
    const actionClass = await page.getByTestId("lesson-action").getAttribute("class");
    expect(actionClass).toContain("focus-visible:ring-2");
    await clickLessonAction(page);
    await expect(page.getByText(/State 2 of 7/i)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const clippedMainOverflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      return main ? main.scrollWidth - main.clientWidth : 0;
    });
    expect(clippedMainOverflow).toBeLessThanOrEqual(1);
    expectNoBrowserErrors(tracker);
  });
});
