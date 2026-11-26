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
  await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
  await expect(page.getByTestId("lesson-action")).toBeEnabled();
  await expectNoEmptySourceExcerpts(page);
  await page.getByTestId("lesson-action").click();
}

async function openLessonOutline(page: Page) {
  const outline = page.getByTestId("lesson-outline");
  if (!(await outline.getAttribute("open"))) {
    await outline.locator("summary").click();
  }
}

async function showTechnicalDetails(page: Page) {
  await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
  await page.getByRole("button", { name: /^Inspect endpoint resources$/i }).click();
}

async function advanceStates(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    await clickLessonAction(page);
  }
}

async function completeLesson(page: Page, lessonId: string, stateCount: number) {
  await expect(page.getByTestId(`guided-lesson-${lessonId}`)).toBeVisible();
  for (let index = 0; index < stateCount; index += 1) {
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
    await expect(page.getByTestId("foundation-host-architecture")).toBeVisible();
    await expect(page.getByTestId("guided-lesson-moving-data")).toContainText(/Before we connect two computers/i);
    await expect(page.getByTestId("rdma-curriculum")).not.toContainText(/QPN|RKEY|LKEY|Protection Domain|Completion Queue Entry/);
    await expect(page.getByRole("button", { name: /^Play$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Pause$/i })).toHaveCount(0);
    expectNoBrowserErrors(tracker);
  });

  test("a learner can progress manually through every state of all eight lessons and completion persists", async ({ page }) => {
    const tracker = trackErrors(page);
    test.setTimeout(240_000);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("rdma-curriculum")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });

    const before = await page.getByText(/Step 1 of 19/i).textContent();
    await page.waitForTimeout(1100);
    expect(await page.getByText(/Step 1 of 19/i).textContent()).toBe(before);

    await completeLesson(page, "moving-data", 19);
    await completeLesson(page, "why-rdma", 6);
    await completeLesson(page, "memory", 9);
    await completeLesson(page, "queues", 5);
    await completeLesson(page, "send-receive", 9);
    await completeLesson(page, "write", 8);
    await completeLesson(page, "read", 7);
    await completeLesson(page, "packets", 12);

    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    await expect(page.getByText(/not proof of subject mastery/i)).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    await page.getByRole("button", { name: /Resume current lesson/i }).click();
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    await page.getByRole("button", { name: /Review Lesson 1 from the beginning/i }).click();
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByText(/Step 1 of 19/i)).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByTestId("rdma-curriculum-complete")).toHaveCount(0);
    expectNoBrowserErrors(tracker);
  });

  test("backward navigation, direct reference access, restart and lesson progress behave consistently", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await clickLessonAction(page);
    await clickLessonAction(page);
    await expect(page.getByText(/Step 3 of 19/i)).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
    await expect(page.getByText(/Step 3 of 19/i)).toBeVisible();
    await page.getByRole("button", { name: /Back to previous step/i }).click();
    await expect(page.getByText(/Step 2 of 19/i)).toBeVisible();

    await page.getByRole("button", { name: /Restart this lesson/i }).click();
    await expect(page.getByText(/Step 1 of 19/i)).toBeVisible();
    await page.getByTestId("lesson-action").focus();
    await expect(page.getByTestId("lesson-action")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Step 2 of 19/i)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/Step 3 of 19/i)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/Step 2 of 19/i)).toBeVisible();

    await page.goto("/practical/rdma?lesson=packets", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
    await openLessonOutline(page);
    await page.getByRole("button", { name: /A final investigation checklist/i }).click();
    await expect(page.getByText(/Step 12 of 12/i)).toBeVisible();
    await expect(page.getByTestId("lesson-action")).toBeDisabled();
    await expect(page.getByText(/completion is recorded only after each guided step has been viewed/i)).toBeVisible();
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await page.evaluate(() => window.localStorage.setItem("fabriclab.rdma.lesson.packets.state.v2", "corrupted"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await expect(page.getByText(/Step 1 of 12/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("host architecture and TCP foundations use authored copy and validated captures", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toContainText(/Before we connect two computers/i);
    await expect(page.getByTestId("foundation-host-architecture")).toContainText(/CPU/i);
    await expect(page.getByTestId("foundation-host-architecture")).toContainText(/RAM/i);
    await expect(page.getByTestId("foundation-host-architecture")).toContainText(/kernel/i);
    await expect(page.getByTestId("guided-lesson-moving-data")).not.toContainText(/\{\{/);

    await advanceStates(page, 7);
    await expect(page.getByTestId("foundation-socket-objects")).toContainText(/process-local handle/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("foundation-socket-endpoints")).toContainText(/process-local fd/i);
    await expect(page.getByTestId("guided-lesson-moving-data")).toContainText(/Python includes a standard-library module called/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("tcp-handshake-provenance")).toContainText(/SYN/i);
    await expect(page.getByTestId("tcp-handshake-provenance")).toContainText(/5001/i);

    await clickLessonAction(page);
    await expect(page.getByTestId("foundation-byte-stream")).toContainText(/continuous stream positions/i);
    await page.getByTestId("byte-stream-pattern-toggle").click();
    await expect(page.getByTestId("foundation-byte-stream")).toContainText(/read HE/i);
    await advanceStates(page, 2);
    await expect(page.getByTestId("tcp-segmentation-provenance")).toContainText(/frame 4: relative bytes 1–1448/i);
    await expect(page.getByTestId("tcp-segmentation-provenance")).toContainText(/frame 5: relative bytes 1449–2896/i);
    await expect(page.getByTestId("tcp-segmentation-provenance")).toContainText(/frame 6: relative bytes 2897–4096/i);

    await advanceStates(page, 3);
    await expect(page.getByTestId("tcp-read-provenance")).toContainText(/read 1: requested 2, returned 2/i);
    await expect(page.getByTestId("tcp-read-provenance")).toContainText(/read 3: requested 1, returned 1/i);
    await expect(page.getByTestId("tcp-read-provenance")).toContainText(/Recv-Q 5/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("tcp-read-order-provenance")).toContainText(/Receiver reads first/i);
    await expect(page.getByTestId("tcp-read-order-provenance")).toContainText(/Sender sends first/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("tcp-loopback-provenance")).toContainText(/software loopback/i);
    expectNoBrowserErrors(tracker);
  });

  test("DMA and Soft-RoCE foundations use the supplied authored progression", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=why-rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/A local memory transfer without CPU copying every byte/i);
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/DMA allows a suitably configured device/i);
    await expect(page.getByTestId("foundation-dma-copy")).toBeVisible();
    await advanceStates(page, 2);
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/The question RDMA addresses is not whether a NIC can perform DMA at all/i);
    await advanceStates(page, 2);
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/Linux has a software implementation called RXE/i);
    await expect(page.getByTestId("soft-roce-instruction-path")).toContainText(/logical RXE RDMA device/i);
    await expect(page.getByTestId("soft-roce-instruction-path")).toContainText(/does not demonstrate hardware bypass/i);
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/It is not an extra physical NIC/i);
    expectNoBrowserErrors(tracker);
  });

  test("memory resources keys and queue foundations use authored copy and verified RDMA bindings", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=memory", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/A buffer is not yet an RDMA Memory Region/i);
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/illustrative virtual address/i);
    await advanceStates(page, 4);
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/A local key identifies registered access/i);
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/LKEY/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/A remote key is for an authorized remote operation/i);
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/RKEY/i);

    await page.goto("/practical/rdma?lesson=queues", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-queues")).toContainText(/Why create communication resources before transferring anything/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("guided-lesson-queues")).toContainText(/Constructing the request only prepares/i);
    await advanceStates(page, 3);
    await expect(page.getByTestId("guided-lesson-queues")).toContainText(/Polling removes the retrieved entries from the CQ/i);
    expectNoBrowserErrors(tracker);
  });

  test("operations lessons render the authored Operations V2 section structure and provenance", async ({ page }) => {
    const tracker = trackErrors(page);
    const expectations = [
      ["send-receive", 9, "visual-5-1", "Where are our programs actually running?"],
      ["write", 8, "visual-6-1", "The question that SEND leaves unanswered"],
      ["read", 7, "visual-7-1", "Change the question: who already has the data?"],
      ["packets", 12, "visual-8-1", "What exactly are we looking at in a packet capture?"],
    ] as const;
    for (const [lesson, count, visualTestId, title] of expectations) {
      await page.goto(`/practical/rdma?lesson=${lesson}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
      await expect(page.getByText(new RegExp(`Step 1 of ${count}`, "i"))).toBeVisible();
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(page.getByTestId(visualTestId)).toBeVisible();
      await expect(page.getByTestId("evidence-provenance-legend")).toContainText(/Recorded/);
      await expect(page.getByTestId("evidence-provenance-legend")).toContainText(/Source-derived/);
      await expect(page.getByTestId("evidence-provenance-legend")).toContainText(/Conceptual/);
      await expect(page.locator('[data-testid^="learner-copy-operations-v2-"]').first()).toBeVisible();
      await expect(page.getByText(/Missing authored visual mapping/i)).toHaveCount(0);
      await expectNoEmptySourceExcerpts(page);
    }
    expectNoBrowserErrors(tracker);
  });

  test("mobile SEND WRITE and READ states show the active two-host observation first", async ({ page }) => {
    const tracker = trackErrors(page);
    test.setTimeout(150_000);
    await page.addInitScript(() => window.localStorage.clear());

    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/practical/rdma?lesson=write", { waitUntil: "domcontentloaded" });
      await advanceStates(page, 3);
      await page.getByTestId("inspect-write-request").click();
      await expect(page.getByTestId("visual-6-4")).toBeVisible();
      const endpointA = await page.getByTestId("focus-endpoint-hosta").boundingBox();
      const endpointB = await page.getByTestId("focus-endpoint-hostb").boundingBox();
      const transfer = await page.getByTestId("focus-transfer").boundingBox();
      const arrow = await page.getByTestId("focus-transfer-arrow").boundingBox();
      expect(endpointA).not.toBeNull();
      expect(endpointB).not.toBeNull();
      expect(transfer).not.toBeNull();
      expect(arrow).not.toBeNull();
      expect(transfer!.y).toBeGreaterThanOrEqual(Math.max(endpointA!.y + endpointA!.height, endpointB!.y + endpointB!.height) - 1);
      expect(transfer!.width).toBeGreaterThan(Math.max(endpointA!.width, endpointB!.width));
      expect(arrow!.height).toBeLessThanOrEqual(24);
      expect(arrow!.width).toBeGreaterThan(100);
      const labelMetrics = await page.getByTestId("focus-transfer-label").evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
      expect(labelMetrics.scrollWidth).toBeLessThanOrEqual(labelMetrics.clientWidth + 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const scenarios = [
      { lesson: "send-receive", advances: 5, visual: "visual-5-6", activate: "inspect-captured-send", direction: "a-to-b", kind: "request" },
      { lesson: "write", advances: 3, visual: "visual-6-4", activate: "inspect-write-request", direction: "a-to-b", kind: "request" },
      { lesson: "read", advances: 4, visual: "visual-7-5", activate: "inspect-read-response", direction: "b-to-a", kind: "response" },
    ];
    for (const scenario of scenarios) {
      await page.goto(`/practical/rdma?lesson=${scenario.lesson}`, { waitUntil: "domcontentloaded" });
      await advanceStates(page, scenario.advances);
      await page.getByTestId(scenario.activate).click();
      await expect(page.getByTestId(scenario.visual)).toBeVisible();
      await expect(page.getByTestId("focus-endpoint-hosta")).toBeVisible();
      await expect(page.getByTestId("focus-endpoint-hostb")).toBeVisible();
      await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-direction", scenario.direction);
      await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-kind", scenario.kind);
      const visualBox = await page.getByTestId("experiment-focus-diagram").boundingBox();
      const narrativeBox = await page.getByTestId("lesson-narrative").boundingBox();
      expect(visualBox).not.toBeNull();
      expect(narrativeBox).not.toBeNull();
      expect(visualBox!.y).toBeLessThan(narrativeBox!.y);
      const actionBox = await page.getByTestId("lesson-action").boundingBox();
      expect(actionBox).not.toBeNull();
      expect(visualBox!.y + visualBox!.height).toBeLessThanOrEqual(actionBox!.y + 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    }
    expectNoBrowserErrors(tracker);
  });

  test("advanced execution explorer remains available and functional as a secondary destination", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Open advanced execution explorer/i }).first().click();
    await expect(page).toHaveURL(/\/practical\/rdma\/explorer/);
    await expect(page.getByTestId("rdma-practical")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
    await expect(page.getByRole("group", { name: /Select RDMA experiment/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    await page.goto("/practical/rdma?experiment=write", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/practical\/rdma\/explorer\?experiment=write/);
    await expect(page.getByTestId("rdma-practical")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
    expectNoBrowserErrors(tracker);
  });

  test("mobile opening is compact, readable, keyboard-accessible and horizontally contained", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
    await expect(page.getByTestId("foundation-host-architecture")).toBeVisible();
    const foundationVisualBox = await page.getByTestId("lesson-visual").boundingBox();
    const foundationNarrativeBox = await page.getByTestId("lesson-narrative").boundingBox();
    expect(foundationVisualBox).not.toBeNull();
    expect(foundationNarrativeBox).not.toBeNull();
    expect(foundationVisualBox!.y).toBeLessThan(foundationNarrativeBox!.y);
    await expect(page.getByTestId("lesson-action")).toBeVisible();
    const actionBox = await page.getByTestId("lesson-action").boundingBox();
    expect(actionBox, "primary opening action should be present in the first mobile viewport").not.toBeNull();
    expect(actionBox!.y).toBeLessThan(844);
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(844);
    const actionClass = await page.getByTestId("lesson-action").getAttribute("class");
    expect(actionClass).toContain("focus-visible:ring-2");
    await expect(page.getByTestId("lesson-action")).toBeEnabled({ timeout: 15000 });
    await page.getByTestId("lesson-action").focus();
    await expect(page.getByTestId("lesson-action")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Step 2 of 19/i)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/Step 3 of 19/i)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/Step 2 of 19/i)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const clippedMainOverflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      return main ? main.scrollWidth - main.clientWidth : 0;
    });
    expect(clippedMainOverflow).toBeLessThanOrEqual(1);

    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
      const widthOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(widthOverflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
      const visualBox = await page.getByTestId("lesson-visual").boundingBox();
      const narrativeBox = await page.getByTestId("lesson-narrative").boundingBox();
      expect(visualBox!.y, `foundation visual should precede narrative at ${width}px`).toBeLessThan(narrativeBox!.y);
    }
    expectNoBrowserErrors(tracker);
  });
});
