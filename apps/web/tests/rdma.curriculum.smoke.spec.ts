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
      await expect(page.getByTestId("write-prediction-result")).toContainText(/Prediction recorded/i);
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
    await expect(page.getByText("Lesson 1 of 8", { exact: true })).toBeVisible();
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByTestId("opening-memory-diagram")).toContainText("HELLO");
    await expect(page.getByTestId("rdma-curriculum")).not.toContainText(/QPN|RKEY|LKEY|Protection Domain|Completion Queue Entry/);
    await expect(page.getByRole("button", { name: /^Play$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Pause$/i })).toHaveCount(0);
    expectNoBrowserErrors(tracker);
  });

  test("a learner can progress manually through every state of all eight lessons and completion persists", async ({ page }) => {
    const tracker = trackErrors(page);
    test.setTimeout(150_000);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("rdma-curriculum")).toHaveAttribute("data-hydrated", "true");

    const before = await page.getByText(/Step 1 of 7/i).textContent();
    await page.waitForTimeout(1100);
    expect(await page.getByText(/Step 1 of 7/i).textContent()).toBe(before);

    await completeLesson(page, "moving-data", 7);
    await completeLesson(page, "why-rdma", 7);
    await completeLesson(page, "memory", 6);
    await completeLesson(page, "queues", 7);
    await completeLesson(page, "send-receive", 11);
    await completeLesson(page, "write", 13);
    await completeLesson(page, "read", 11);
    await completeLesson(page, "packets", 7);

    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    await expect(page.getByText(/not proof of subject mastery/i)).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    await page.getByRole("button", { name: /Resume current lesson/i }).click();
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    await page.getByRole("button", { name: /Review Lesson 1 from the beginning/i }).click();
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByText(/Step 1 of 7/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("backward navigation, direct reference access, restart and lesson progress behave consistently", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await clickLessonAction(page);
    await clickLessonAction(page);
    await expect(page.getByText(/Step 3 of 7/i)).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Step 3 of 7/i)).toBeVisible();
    await page.getByRole("button", { name: /Back to previous step/i }).click();
    await expect(page.getByText(/Step 2 of 7/i)).toBeVisible();

    await page.getByRole("button", { name: /Restart this lesson/i }).click();
    await expect(page.getByText(/Step 1 of 7/i)).toBeVisible();
    await page.getByTestId("lesson-action").focus();
    await expect(page.getByTestId("lesson-action")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Step 2 of 7/i)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/Step 3 of 7/i)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/Step 2 of 7/i)).toBeVisible();

    await page.goto("/practical/rdma?lesson=packets", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await page.getByTestId("lesson-outline").locator("summary").click();
    await page.getByRole("button", { name: /You can now connect the programming model to the fabric/i }).click();
    await expect(page.getByText(/Step 7 of 7/i)).toBeVisible();
    await expect(page.getByTestId("lesson-action")).toBeDisabled();
    await expect(page.getByText(/completion is recorded only after each guided step has been viewed/i)).toBeVisible();
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("DMA is demonstrated locally before RDMA and the comparison uses real data-path diagrams", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=why-rdma", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 2);
    await expect(page.getByTestId("cpu-copy-diagram")).toBeVisible();
    await expect(page.getByTestId("cpu-copy-diagram")).toContainText(/CPU executes instructions/i);

    await clickLessonAction(page);
    await expect(page.getByTestId("device-dma-diagram")).toBeVisible();
    await expect(page.getByTestId("dma-direct-path")).toContainText(/CPU does not execute a byte-by-byte copy loop/i);

    await clickLessonAction(page);
    await expect(page.getByTestId("hardware-rdma-concept-path")).toBeVisible();
    await expect(page.getByTestId("hardware-rdma-concept-path")).not.toContainText(/Kernel socket buffer/i);

    await clickLessonAction(page);
    await expect(page.getByTestId("transfer-model-comparison")).toBeVisible();
    await expect(page.getByTestId("conventional-data-path")).toBeVisible();
    await page.getByRole("button", { name: /Hardware RDMA/i }).click();
    await expect(page.getByTestId("hardware-rdma-concept-path")).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("QP and CQ resource relationships are mechanically distinct and outside the conventional socket stack", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=queues", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 5);
    await expect(page.getByTestId("qp-resource-hosta")).toContainText(/Send Queue/i);
    await expect(page.getByTestId("qp-resource-hosta")).toContainText(/Receive Queue/i);
    await expect(page.getByTestId("cq-resource-hosta")).toContainText(/separate associated resource/i);
    const cqInsideQp = await page.evaluate(() => {
      const qp = document.querySelector('[data-testid="qp-resource-hosta"]');
      const cq = document.querySelector('[data-testid="cq-resource-hosta"]');
      return Boolean(qp && cq && qp.contains(cq));
    });
    expect(cqInsideQp).toBe(false);
    await expect(page.getByTestId("kernel-control-hosta")).toContainText(/not depicted as a conventional per-payload socket processing path/i);
    await expect(page.getByTestId("rdma-system-diagram")).not.toContainText(/Kernel socket buffer/i);
    expectNoBrowserErrors(tracker);
  });

  test("SEND/RECEIVE queue lifecycle consumes work and separates completion from memory verification", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=send-receive", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 3);
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="posted"]')).toHaveCount(1);

    await advanceStates(page, 4);
    await expect(page.getByRole("heading", { name: /consumes the posted Receive Work Request/i })).toBeVisible();
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="posted"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="in-flight"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="consumed"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="receive-queue-hostb-history"] [data-lifecycle="consumed"]')).toHaveCount(1);

    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Each endpoint observes its own local completion/i })).toBeVisible();
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="completed"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="send-queue-hosta"] [data-lifecycle="completed"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="receive-queue-hostb-history"] [data-lifecycle="completed"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="send-queue-hosta-history"] [data-lifecycle="completed"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="completion-entry-visual"]')).toHaveCount(2);
    await expect(page.getByTestId("registered-memory-hostb")).not.toContainText(/recorded memory verification after completion/i);

    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Only after completion does the receiver verify application memory/i })).toBeVisible();
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/recorded memory verification after completion/i);
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/Hello RDMA - SEND\/RECV over Soft-RoCE/i);
    expectNoBrowserErrors(tracker);
  });

  test("ordinary WRITE prediction cannot be bypassed and unknown target CQ is not rendered as empty", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=write", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 8);
    await expect(page.getByTestId("write-completion-prediction")).toBeVisible();
    await expect(page.getByTestId("lesson-action")).toBeDisabled();
    await expect(page.locator('[data-testid="cq-resource-hostb"] [data-queue-state="unknown"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="cq-resource-hostb"]')).toContainText(/not yet inspected/i);
    await expect(page.locator('[data-testid="cq-resource-hostb"]')).not.toContainText(/known empty/i);

    await page.getByTestId("lesson-outline").locator("summary").click();
    await expect(page.getByRole("button", { name: /target Completion Queue is observed empty/i })).toBeDisabled();

    await page.getByRole("button", { name: /Yes — a normal receive completion appears/i }).click();
    await expect(page.getByTestId("write-prediction-result")).toContainText(/Prediction recorded/i);
    await expect(page.getByTestId("write-prediction-result")).not.toContainText(/contradicts|Correct prediction/i);
    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /explicitly tells the target when inspection is meaningful/i })).toBeVisible();
    await clickLessonAction(page);

    await expect(page.getByTestId("write-prediction-review")).toContainText(/evidence contradicts that prediction/i);
    await expect(page.locator('[data-testid="cq-resource-hostb"] [data-queue-state="empty"]')).toHaveCount(1);
    await expect(page.getByText(/recorded zero completions/i)).toBeVisible();
    await expect(page.getByText(/no normal target receive CQE exists/i)).toBeVisible();
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/causal memory-placement illustration/i);
    await expect(page.getByTestId("registered-memory-hostb")).not.toContainText(/recorded memory verification after synchronization/i);

    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Only afterward does the target verify memory/i })).toBeVisible();
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/recorded memory verification after synchronization/i);
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/RDMA WRITE landed in hostb memory/i);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Only afterward does the target verify memory/i })).toBeVisible();
    await page.getByRole("button", { name: /Back to previous step/i }).click();
    await expect(page.getByTestId("write-prediction-review")).toBeVisible();
    await page.getByRole("button", { name: /Restart this lesson/i }).click();
    await expect(page.getByText(/Step 1 of 13/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("READ request, response, completion and memory verification ordering are explicit", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=read", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 6);
    await expect(page.getByTestId("network-transfer")).toHaveAttribute("data-direction", "b-to-a");
    await expect(page.getByTestId("network-transfer")).toHaveAttribute("data-kind", "response");
    await expect(page.getByText(/request went A → B, while the payload response goes B → A/i)).toBeVisible();
    await expect(page.getByText(/does not contain an RETH header/i)).toBeVisible();

    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Local memory placement is separate from completion observation/i })).toBeVisible();
    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /initiating reader owns the completion/i })).toBeVisible();
    await expect(page.getByTestId("registered-memory-hosta")).not.toContainText(/recorded memory verification after completion/i);
    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /After completion, the reader verifies local memory/i })).toBeVisible();
    await expect(page.getByTestId("registered-memory-hosta")).toContainText(/recorded memory verification after completion/i);
    expectNoBrowserErrors(tracker);
  });

  test("packet fields and reverse packets correlate to the correct endpoints and originating work", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=packets", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 4);
    await expect(page.getByTestId("packet-investigator")).toBeVisible();

    await page.getByRole("button", { name: /Destination QPN/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/targets the responder endpoint on Server B/i);
    await page.getByRole("button", { name: /^RKEY/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/scoped region authorization/i);
    await expect(page.getByTestId("field-correlation")).toContainText(/c:memory:hostb/i);
    await page.getByRole("button", { name: /Operation opcode/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/Correlated application Work Request/i);
    await expect(page.getByTestId("field-correlation")).toContainText(/RDMA_WRITE/i);

    await page.getByRole("button", { name: /frame 8 · Acknowledge/i }).click();
    await page.getByRole("button", { name: /Destination QPN/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/targets the initiator endpoint on Server A/i);
    await page.getByRole("button", { name: /Operation opcode/i }).click();
    await expect(page.getByTestId("field-correlation")).toContainText(/not a new application-issued operation/i);
    await expect(page.getByTestId("field-correlation")).toContainText(/Originating application Work Request/i);
    expectNoBrowserErrors(tracker);
  });

  test("final packet investigation uses neutral cases, reverse packets and explanatory feedback", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=packets", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 5);
    await expect(page.getByTestId("final-packet-investigation")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Case 1$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^SEND$/i })).toHaveCount(0);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/SEND Only/i);

    await page.getByTestId("investigation-role").getByRole("button", { name: /Operation request/i }).click();
    await expect(page.getByTestId("feedback-role")).toContainText(/^Correct\./);
    await page.getByTestId("investigation-transmitter").getByRole("button", { name: /Server B/i }).click();
    await expect(page.getByTestId("feedback-transmitter")).toContainText(/^Not correct\./);
    await expect(page.getByTestId("feedback-transmitter")).toContainText(/source IP is 10\.10\.10\.1/i);
    await page.getByTestId("investigation-target").getByRole("button", { name: /Server B endpoint/i }).click();
    await expect(page.getByTestId("feedback-target")).toContainText(/destination QPN/i);

    await page.getByRole("button", { name: /^Case 4$/i }).click();
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/10\.10\.10\.2 → 10\.10\.10\.1/);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/RDMA READ response Only/i);
    await page.getByTestId("investigation-role").getByRole("button", { name: /Data-carrying response/i }).click();
    await page.getByTestId("investigation-transmitter").getByRole("button", { name: /Server B/i }).click();
    await page.getByTestId("investigation-target").getByRole("button", { name: /Server A endpoint/i }).click();
    await page.getByTestId("investigation-initiator").getByRole("button", { name: /Server A application/i }).click();
    await expect(page.getByTestId("feedback-initiator")).toContainText(/response or ACK travels backward as a consequence/i);
    await expect(page.getByTestId("feedback-target")).toContainText(/Reverse-direction responses and ACKs/i);

    await page.getByRole("button", { name: /^Case 5$/i }).click();
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Acknowledge/i);
    await page.getByTestId("investigation-role").getByRole("button", { name: /Transport acknowledgement/i }).click();
    await expect(page.getByTestId("feedback-role")).toContainText(/not a new application-issued operation|reliable-transport evidence/i);
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

  test("mobile opening is compact, readable, keyboard-accessible and horizontally contained", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByTestId("opening-memory-diagram")).toContainText("HELLO");
    await expect(page.getByTestId("lesson-action")).toBeVisible();
    const actionBox = await page.getByTestId("lesson-action").boundingBox();
    expect(actionBox, "primary opening action should be present in the first mobile viewport").not.toBeNull();
    expect(actionBox!.y).toBeLessThan(844);
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(844);
    const actionClass = await page.getByTestId("lesson-action").getAttribute("class");
    expect(actionClass).toContain("focus-visible:ring-2");
    await page.getByTestId("lesson-action").focus();
    await expect(page.getByTestId("lesson-action")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Step 2 of 7/i)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/Step 3 of 7/i)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/Step 2 of 7/i)).toBeVisible();
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
