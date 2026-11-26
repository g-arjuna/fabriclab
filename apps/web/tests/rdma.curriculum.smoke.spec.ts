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
    if (lessonId === "write" && index === 8) {
      await page.getByTestId("write-completion-prediction").getByRole("button", { name: /^No$/i }).click();
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
    await completeLesson(page, "send-receive", 11);
    await completeLesson(page, "write", 13);
    await completeLesson(page, "read", 12);
    await completeLesson(page, "packets", 7);

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
    await page.getByRole("button", { name: /You can now connect the programming model to the fabric/i }).click();
    await expect(page.getByText(/Step 7 of 7/i)).toBeVisible();
    await expect(page.getByTestId("lesson-action")).toBeDisabled();
    await expect(page.getByText(/completion is recorded only after each guided step has been viewed/i)).toBeVisible();
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await page.evaluate(() => window.localStorage.setItem("fabriclab.rdma.lesson.packets.state.v2", "corrupted"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-packets")).toBeVisible();
    await expect(page.getByText(/Step 1 of 7/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("host architecture and TCP foundations use authored copy and validated captures", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toContainText(/Before we connect two computers/i);
    await expect(page.getByTestId("foundation-host-architecture")).toContainText(/CPU/i);
    await expect(page.getByTestId("foundation-host-architecture")).toContainText(/RAM/i);
    await expect(page.getByTestId("foundation-host-architecture")).toContainText(/kernel/i);
    await expect(page.getByText(/19 authored subsections/i)).toBeVisible();
    await expect(page.getByTestId("guided-lesson-moving-data")).not.toContainText(/\{\{/);

    await advanceStates(page, 7);
    await expect(page.getByTestId("foundation-socket-endpoints")).toContainText(/process-local descriptor/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("foundation-socket-endpoints")).toContainText(/connection four-tuple/i);
    await expect(page.getByTestId("guided-lesson-moving-data")).toContainText(/Python includes a standard-library module called/i);
    await expect(page.getByTestId("tcp-handshake-evidence")).toContainText(/SYN/i);
    await expect(page.getByTestId("tcp-handshake-evidence")).toContainText(/5001/i);

    await advanceStates(page, 2);
    await expect(page.getByTestId("foundation-byte-stream")).toContainText(/continuous byte stream positions/i);
    await page.getByTestId("byte-stream-pattern-toggle").click();
    await expect(page.getByTestId("foundation-byte-stream")).toContainText(/read HE/i);
    await advanceStates(page, 2);
    await expect(page.getByTestId("tcp-segmentation-evidence")).toContainText(/frame 4: relative bytes 1–1448/i);
    await expect(page.getByTestId("tcp-segmentation-evidence")).toContainText(/frame 5: relative bytes 1449–2896/i);
    await expect(page.getByTestId("tcp-segmentation-evidence")).toContainText(/frame 6: relative bytes 2897–4096/i);

    await advanceStates(page, 3);
    await expect(page.getByTestId("tcp-read-evidence")).toContainText(/read 1: requested 2, returned 2/i);
    await expect(page.getByTestId("tcp-read-evidence")).toContainText(/read 3: requested 1, returned 1/i);
    await expect(page.getByTestId("tcp-read-evidence")).toContainText(/Recv-Q 5/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("tcp-read-order-evidence")).toContainText(/Receiver reads first/i);
    await expect(page.getByTestId("tcp-read-order-evidence")).toContainText(/Sender sends first/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("tcp-loopback-evidence")).toContainText(/software loopback/i);
    expectNoBrowserErrors(tracker);
  });

  test("DMA and Soft-RoCE foundations use the supplied authored progression", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=why-rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/A local memory transfer without CPU copying every byte/i);
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/DMA allows a suitably configured device/i);
    await expect(page.getByTestId("cpu-copy-diagram")).toBeVisible();
    await advanceStates(page, 2);
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/The question RDMA addresses is not whether a NIC can perform DMA at all/i);
    await advanceStates(page, 2);
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/Linux has a software implementation called RXE/i);
    await expect(page.getByTestId("soft-roce-stack-visual")).toContainText(/logical RXE device rxe0/i);
    await expect(page.getByTestId("soft-roce-stack-visual")).toContainText(/No CPU-offload or throughput claim/i);
    await expect(page.getByTestId("guided-lesson-why-rdma")).toContainText(/It is not an extra physical NIC/i);
    expectNoBrowserErrors(tracker);
  });

  test("memory resources keys and queue foundations use authored copy and verified RDMA bindings", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=memory", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/A buffer is not yet an RDMA Memory Region/i);
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/illustrative virtual address/i);
    await advanceStates(page, 6);
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/LKEY/i);
    await expect(page.getByTestId("guided-lesson-memory")).toContainText(/RKEY/i);

    await page.goto("/practical/rdma?lesson=queues", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guided-lesson-queues")).toContainText(/Why create communication resources before transferring anything/i);
    await clickLessonAction(page);
    await expect(page.getByTestId("guided-lesson-queues")).toContainText(/Constructing the request only prepares/i);
    await advanceStates(page, 3);
    await expect(page.getByTestId("guided-lesson-queues")).toContainText(/Polling removes the retrieved entries from the CQ/i);
    expectNoBrowserErrors(tracker);
  });

  test("SEND/RECEIVE queue lifecycle consumes work and separates completion from memory verification", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=send-receive", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("laboratory-orientation")).toBeVisible();
    await expect(page.getByTestId("laboratory-orientation")).toContainText(/Python program · sender/i);
    await expect(page.getByTestId("laboratory-orientation")).toContainText(/TCP control network/i);
    await expect(page.getByTestId("laboratory-orientation")).toContainText(/recorded execution/i);
    await expect(page.getByTestId("laboratory-orientation")).toContainText(/independent local outcome sequences, not one global ordering/i);
    await expect(page.getByTestId("laboratory-orientation")).toContainText(/receiver-local memory evidence; the sender completion is separate/i);
    await clickLessonAction(page);
    await page.getByTestId("missing-receive-exercise").getByRole("button", { name: /packet already waiting/i }).click();
    await expect(page.getByTestId("missing-receive-feedback")).toContainText(/Not correct/i);
    await page.getByTestId("missing-receive-exercise").getByRole("button", { name: /posted receive buffer/i }).click();
    await expect(page.getByTestId("missing-receive-feedback")).toContainText(/^Correct/i);
    await advanceStates(page, 2);
    await expect(page.getByRole("heading", { name: /Receive Work Request is pending/i })).toBeVisible();
    await showTechnicalDetails(page);
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="posted"]')).toHaveCount(1);

    await advanceStates(page, 4);
    await expect(page.getByRole("heading", { name: /consumes the posted Receive Work Request/i })).toBeVisible();
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="posted"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="in-flight"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="consumed"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="receive-queue-hostb-history"] [data-lifecycle="consumed"]')).toHaveCount(1);
    await expect(page.getByTestId("focus-receive-queue-hostb")).toContainText(/consumed · no longer pending/i);

    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Each endpoint observes its own local completion/i })).toBeVisible();
    await expect(page.locator('[data-testid="receive-queue-hostb"] [data-lifecycle="completed"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="send-queue-hosta"] [data-lifecycle="completed"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="receive-queue-hostb-history"] [data-lifecycle="completed"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="send-queue-hosta-history"] [data-lifecycle="completed"]')).toHaveCount(1);
    await expect(page.getByTestId("focus-send-queue-hosta")).toContainText(/completed · no longer pending/i);
    await expect(page.getByTestId("focus-receive-queue-hostb")).toContainText(/completed · no longer pending/i);
    await expect(page.locator('[data-testid="completion-entry-visual"]')).toHaveCount(0);
    await expect(page.getByTestId("observed-completion-hosta")).toContainText(/retrieved by Server A poll/i);
    await expect(page.getByTestId("observed-completion-hostb")).toContainText(/retrieved by Server B poll/i);
    await expect(page.locator('[data-testid="cq-resource-hosta"]')).toContainText(/no longer pending/i);
    await expect(page.getByTestId("registered-memory-hostb")).not.toContainText(/recorded memory verification after completion/i);

    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Only after completion does the receiver verify application memory/i })).toBeVisible();
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/recorded memory verification after completion/i);
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/Hello RDMA - SEND\/RECV over Soft-RoCE/i);
    expectNoBrowserErrors(tracker);
  });

  test("compact operation diagrams separate payload paths from instruction paths", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=send-receive", { waitUntil: "domcontentloaded" });
    await clickLessonAction(page);
    await expect(page.getByTestId("payload-path-hosta")).toContainText(/memory ↔ provider ↔ network/i);
    await expect(page.getByTestId("payload-path-hosta")).toContainText(/bytes bypass queues/i);
    await expect(page.getByTestId("instruction-path-hosta")).toContainText(/app → queue → provider/i);
    await expect(page.getByTestId("instruction-path-hosta")).toContainText(/instructions only/i);

    await page.goto("/practical/rdma?lesson=write", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 3);
    await expect(page.getByRole("heading", { name: /WRITE Work Request names local source memory/i })).toBeVisible();
    await expect(page.getByTestId("payload-path-hostb")).toContainText(/bytes bypass queues/i);
    await expect(page.getByTestId("instruction-path-hosta")).toContainText(/instructions only/i);
    await expect(page.getByTestId("focus-memory-hostb")).toContainText(/registered destination memory/i);

    await page.goto("/practical/rdma?lesson=read", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 3);
    await expect(page.getByRole("heading", { name: /READ Work Request points in two directions/i })).toBeVisible();
    await expect(page.getByTestId("payload-path-hosta")).toContainText(/bytes bypass queues/i);
    await expect(page.getByTestId("instruction-path-hosta")).toContainText(/instructions only/i);
    expectNoBrowserErrors(tracker);
  });

  test("ordinary WRITE prediction cannot be bypassed and unknown target CQ is not rendered as empty", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=write", { waitUntil: "domcontentloaded" });
    await showTechnicalDetails(page);
    await advanceStates(page, 8);
    await expect(page.getByTestId("write-completion-prediction")).toBeVisible();
    await expect(page.getByTestId("lesson-action")).toBeDisabled();
    await expect(page.locator('[data-testid="cq-resource-hostb"] [data-queue-state="unknown"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="cq-resource-hostb"]')).toContainText(/not yet inspected/i);
    await expect(page.locator('[data-testid="cq-resource-hostb"]')).not.toContainText(/known empty/i);

    await openLessonOutline(page);
    await expect(page.getByRole("button", { name: /target Completion Queue is observed empty/i })).toBeDisabled();

    await page.getByTestId("write-completion-prediction").getByRole("button", { name: /^Yes$/i }).click();
    await expect(page.getByTestId("write-prediction-result")).toContainText(/Prediction recorded/i);
    await expect(page.getByTestId("write-prediction-result")).not.toContainText(/contradicts|Correct prediction/i);
    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /explicitly tells the target when inspection is meaningful/i })).toBeVisible();
    await clickLessonAction(page);

    await expect(page.getByTestId("write-prediction-review")).toContainText(/evidence contradicts that prediction/i);
    await expect(page.locator('[data-testid="cq-resource-hostb"] [data-queue-state="empty"]')).toHaveCount(1);
    await expect(page.getByText(/recorded zero completions/i)).toBeVisible();
    await expect(page.getByText(/no normal target receive CQE exists/i)).toBeVisible();
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/illustrated transport placement/i);
    await expect(page.getByTestId("registered-memory-hostb")).not.toContainText(/recorded memory verification after synchronization/i);
    await expect(page.getByTestId("observed-completion-hosta")).toContainText(/retrieved by Server A poll/i);
    await expect(page.locator('[data-testid="cq-resource-hosta"]')).toContainText(/no longer pending/i);

    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Only afterward does the target verify memory/i })).toBeVisible();
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/recorded memory verification after synchronization/i);
    await expect(page.getByTestId("registered-memory-hostb")).toContainText(/RDMA WRITE landed in hostb memory/i);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
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
    await showTechnicalDetails(page);
    await advanceStates(page, 6);
    await expect(page.getByTestId("network-transfer")).toHaveAttribute("data-direction", "b-to-a");
    await expect(page.getByTestId("network-transfer")).toHaveAttribute("data-kind", "response");
    await expect(page.getByText(/request went A → B, while the payload response goes B → A/i)).toBeVisible();
    await expect(page.getByText(/does not contain an RETH header/i)).toBeVisible();

    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Local memory placement is separate from completion observation/i })).toBeVisible();
    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /initiating reader owns the completion/i })).toBeVisible();
    await expect(page.getByTestId("observed-completion-hosta")).toContainText(/retrieved by Server A poll/i);
    await expect(page.locator('[data-testid="cq-resource-hosta"]')).toContainText(/no longer pending/i);
    await expect(page.getByTestId("registered-memory-hosta")).not.toContainText(/recorded memory verification after completion/i);
    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /After completion, the reader verifies local memory/i })).toBeVisible();
    await expect(page.getByTestId("registered-memory-hosta")).toContainText(/recorded memory verification after completion/i);
    await expect(page.locator('[data-testid="cq-resource-hostb"] [data-queue-state="unknown"]')).toHaveCount(1);
    await clickLessonAction(page);
    await expect(page.getByRole("heading", { name: /Only after synchronization is the responder CQ observation revealed/i })).toBeVisible();
    await expect(page.locator('[data-testid="cq-resource-hostb"] [data-queue-state="empty"]')).toHaveCount(1);
    await expect(page.getByText(/read_done/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("packet fields and reverse packets correlate to the correct endpoints and originating work", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=packets", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
    await expect(page.getByTestId("write-code-packet-correlation")).toBeVisible();
    await expect(page.getByTestId("write-code-packet-correlation")).toContainText(/qp\.post_send\(swr\)/i);
    await expect(page.getByTestId("selected-correlation-chain")).toContainText(/Remote address assigned with set_wr_rdma/i);
    await page.getByTestId("correlation-field-wr-id").click();
    await expect(page.getByTestId("correlation-explanation")).toContainText(/not the Packet Sequence Number/i);
    await expect(page.getByTestId("correlation-packet-highlight")).toContainText(/No corresponding transmitted BTH\/RETH field/i);
    await page.getByTestId("correlation-field-local-memory").click();
    await expect(page.getByTestId("correlation-explanation")).toContainText(/local memory metadata/i);
    await page.getByTestId("correlation-field-remote-rkey").click();
    await expect(page.getByTestId("correlation-source-highlight")).toContainText(/set_wr_rdma/i);
    await expect(page.getByTestId("correlation-wr-highlight")).toContainText(/0x/i);
    await expect(page.getByTestId("correlation-packet-highlight")).toContainText(/RETH RKEY/i);
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

  test("final packet investigations require operational reconstruction and reveal authoritative evidence", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?lesson=packets", { waitUntil: "domcontentloaded" });
    await advanceStates(page, 5);
    await expect(page.getByTestId("final-packet-investigation")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Investigation A$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^SEND$/i })).toHaveCount(0);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/SEND Only/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/no RETH/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Application payload\s*50 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/BTH padding\s*2 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Captured data incl\. padding\s*52 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Total frame length\s*110 bytes/i);
    await expect(page.getByTestId("send-padding-observation")).toContainText(/application requested a transfer of 50 bytes/i);
    await expect(page.getByTestId("send-padding-observation")).toContainText(/two additional padding bytes/i);

    await page.getByTestId("investigation-destination-in-packet").getByRole("button", { name: /Yes — the packet names it/i }).click();
    await expect(page.getByTestId("feedback-destination-in-packet")).toContainText(/^Not correct\./);
    await expect(page.getByTestId("feedback-destination-in-packet")).toContainText(/no RETH remote-memory fields/i);
    await page.getByTestId("investigation-landing-resource").getByRole("button", { name: /posted Receive Work Request/i }).click();
    await expect(page.getByTestId("feedback-landing-resource")).toContainText(/^Correct\./);
    await page.getByTestId("reveal-investigation-evidence").click();
    await expect(page.getByTestId("revealed-investigation-evidence")).toContainText(/Revealed correlated Receive Work Request/i);

    await page.getByRole("button", { name: /^Investigation B$/i }).click();
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/RDMA WRITE Only/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/RETH remote address/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Application payload\s*53 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/BTH padding\s*3 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Captured data incl\. padding\s*56 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Total frame length\s*130 bytes/i);
    await page.getByTestId("investigation-ack-meaning").getByRole("button", { name: /^Yes$/i }).click();
    await expect(page.getByTestId("feedback-ack-meaning")).toContainText(/^Not correct\./);
    await expect(page.getByTestId("feedback-ack-meaning")).toContainText(/not a target application memory inspection/i);
    await page.getByTestId("investigation-target-cqe").getByRole("button", { name: /^No$/i }).click();
    await expect(page.getByTestId("feedback-target-cqe")).toContainText(/post-synchronization CQ poll recorded zero completions/i);
    await page.getByTestId("skip-investigation").click();
    await expect(page.getByTestId("investigation-status")).toContainText(/skipped · evidence reviewed/i);
    await expect(page.getByTestId("revealed-investigation-evidence")).toContainText(/verified target memory after synchronization/i);

    await page.getByRole("button", { name: /^Investigation C$/i }).click();
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/10\.10\.10\.2 → 10\.10\.10\.1/);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/RDMA READ response Only/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Application payload\s*46 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/BTH padding\s*2 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Captured data incl\. padding\s*48 bytes/i);
    await expect(page.getByTestId("decoded-investigation-packet")).toContainText(/Total frame length\s*110 bytes/i);
    await page.getByTestId("investigation-transmitter").getByRole("button", { name: /Server B/i }).click();
    await page.getByTestId("investigation-initiator").getByRole("button", { name: /Server A/i }).click();
    await page.getByTestId("investigation-direction-reason").getByRole("button", { name: /request goes A→B and payload returns B→A/i }).click();
    await expect(page.getByTestId("feedback-direction-reason")).toContainText(/^Correct\./);
    await expect(page.getByTestId("feedback-initiator")).toContainText(/correlated READ Work Request was posted by Server A/i);
    await page.getByTestId("reveal-investigation-evidence").click();
    await expect(page.getByTestId("revealed-investigation-evidence")).toContainText(/Revealed earlier READ request/i);
    await expect(page.getByTestId("revealed-investigation-evidence")).toContainText(/reader-local completion/i);
    expectNoBrowserErrors(tracker);
  });

  test("mobile SEND WRITE and READ states show the active two-host observation first", async ({ page }) => {
    const tracker = trackErrors(page);
    test.setTimeout(150_000);
    await page.addInitScript(() => window.localStorage.clear());

    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/practical/rdma?lesson=write", { waitUntil: "domcontentloaded" });
      await advanceStates(page, 5);
      await expect(page.getByRole("heading", { name: /captured WRITE packet/i })).toBeVisible();
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
      { lesson: "send-receive", advances: 6, heading: /captured SEND packet/i, direction: "a-to-b", kind: "request" },
      { lesson: "write", advances: 5, heading: /captured WRITE packet/i, direction: "a-to-b", kind: "request" },
      { lesson: "read", advances: 6, heading: /response travels from source to reader/i, direction: "b-to-a", kind: "response" },
    ];
    for (const scenario of scenarios) {
      await page.goto(`/practical/rdma?lesson=${scenario.lesson}`, { waitUntil: "domcontentloaded" });
      await advanceStates(page, scenario.advances);
      await expect(page.getByRole("heading", { name: scenario.heading })).toBeVisible();
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
