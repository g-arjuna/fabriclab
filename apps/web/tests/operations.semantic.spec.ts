import { expect, test, type Page } from "@playwright/test";

async function openOperations(page: Page, lesson: "send-receive" | "write" | "read" | "packets") {
  await page.goto(`/practical/rdma?lesson=${lesson}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 30000 });
}

async function guidedSignature(page: Page) {
  const article = page.getByTestId("guided-article");
  return `${await article.getAttribute("data-guided-step")}|${await article.getAttribute("data-stage-index")}`;
}

async function next(page: Page, count = 1) {
  for (let index = 0; index < count; index += 1) {
    const before = await guidedSignature(page);
    await expect(page.getByTestId("lesson-action")).toBeEnabled();
    await page.getByTestId("lesson-action").click();
    await expect.poll(() => guidedSignature(page), { timeout: 5000 }).not.toBe(before);
  }
}

async function jumpToSection(page: Page, title: RegExp) {
  const outline = page.getByTestId("lesson-outline");
  await outline.evaluate((element) => element.setAttribute("open", ""));
  await outline.getByRole("button", { name: title }).dispatchEvent("click");
  await expect(page.getByTestId("lesson-action")).toBeEnabled();
}

test.describe("guided operations semantics", () => {
  test("SEND construction, packet placement, independent completions and verified memory appear in order", async ({ page }) => {
    await openOperations(page, "send-receive");
    await jumpToSection(page, /How does A construct and submit the actual SEND/);

    await expect(page.getByTestId("send-payload-exact-bytes")).toHaveCount(0);
    await next(page);
    await expect(page.getByTestId("send-payload-exact-bytes")).toContainText("50 bytes");
    await expect(page.getByTestId("send-wr-lifecycle")).toHaveAttribute("data-stage", "none");
    await next(page);
    await expect(page.getByTestId("send-wr-lifecycle")).toHaveAttribute("data-stage", "constructed");
    await expect(page.getByTestId("send-application-construction")).toContainText(/outside the Send Queue/i);
    await expect(page.getByTestId("actual-send-wr")).toContainText("length: 50");
    await expect(page.getByTestId("visual-5-5")).toContainText("no posted SEND WR");
    await next(page);
    await expect(page.getByTestId("send-wr-lifecycle")).toHaveAttribute("data-stage", "posted");
    await expect(page.getByTestId("visual-5-5")).toContainText("The application has submitted the instruction");
    await expect(page.getByTestId("write-bytes-a-buffer")).toHaveCount(0);

    await jumpToSection(page, /From local memory to a RoCEv2 packet/);
    await expect(page.getByTestId("operations-packet-inspector")).toHaveCount(0);
    await next(page);
    const sendPacket = page.locator('[data-testid="operations-packet-inspector"][data-packet-id="b:packet:3"]');
    await expect(sendPacket).toContainText("SEND Only");
    await expect(sendPacket).toContainText("Application payload bytes");
    await expect(sendPacket).toContainText("50");
    await expect(sendPacket).not.toContainText("Remote virtual address");
    await next(page);
    await expect(page.getByTestId("send-placement-state")).toContainText(/first 50 bytes/i);
    await expect(page.getByTestId("send-placement-state")).toContainText(/Completion evidence remains separate/i);

    await jumpToSection(page, /The transport acknowledgement is not the application completion/);
    await next(page);
    const ack = page.locator('[data-testid="send-ack-inspector"][data-packet-id="b:packet:4"]');
    await expect(ack).toContainText("Acknowledge");
    await expect(ack).toContainText("Application payload bytes");
    await expect(ack).toContainText("0");
    await expect(page.getByTestId("send-a-completion")).toHaveCount(0);
    await next(page);
    await expect(page.getByTestId("send-a-completion")).toContainText("cqe:b:hosta:exp-b-sender:6");
    await expect(page.getByTestId("send-b-completion")).toHaveCount(0);
    await next(page);
    await expect(page.getByTestId("send-b-completion")).toContainText("cqe:b:hostb:exp-b-receiver:5");

    await jumpToSection(page, /Read the memory that B actually received/);
    await next(page);
    await expect(page.getByTestId("send-exact-byte-equality")).toHaveAttribute("data-equal", "true");
    await expect(page.getByTestId("send-exact-byte-equality")).toContainText("50 received bytes / 4096 byte registered capacity");
    await expect(page.getByTestId("send-local-verification-order")).toContainText("B completion observed");
  });

  test("WRITE local and remote fields are attached in Python order and target notification is not misrepresented", async ({ page }) => {
    await openOperations(page, "write");
    await jumpToSection(page, /Build a WRITE instruction from two memory descriptions/);

    await next(page, 2);
    await expect(page.getByTestId("write-memory-descriptions")).toContainText("local source");
    await expect(page.getByTestId("write-memory-descriptions")).not.toContainText("remote destination");
    await next(page);
    await expect(page.getByTestId("write-wr-lifecycle")).toHaveAttribute("data-stage", "constructed");
    await expect(page.getByTestId("actual-write-wr")).toHaveAttribute("data-remote-fields", "not-attached");
    await expect(page.getByTestId("actual-write-wr")).not.toContainText("remote addr:");
    await next(page);
    await expect(page.getByTestId("write-source-line-remote-attachment")).toContainText("set_wr_rdma");
    await expect(page.getByTestId("actual-write-wr")).toHaveAttribute("data-remote-fields", "included");
    await expect(page.getByTestId("actual-write-wr")).toContainText("remote addr:");
    await expect(page.getByTestId("write-wr-lifecycle")).toHaveAttribute("data-stage", "constructed");
    await next(page);
    await expect(page.getByTestId("write-wr-lifecycle")).toHaveAttribute("data-stage", "posted");
    await expect(page.getByTestId("write-submit-explanation")).toContainText(/does not establish that the operation has completed/i);
    await expect(page.getByTestId("fill-write-source")).toHaveCount(0);

    await jumpToSection(page, /Does B receive a normal completion when its memory changes/);
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-result-revealed", "false");
    await expect(page.getByTestId("write-prediction-feedback")).toHaveCount(0);
    await page.getByTestId("target-cqe-predict-yes").click();
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "Yes");
    await expect(page.getByTestId("write-prediction-feedback")).toHaveCount(0);
    await next(page, 2);
    await expect(page.getByTestId("write-target-zero-poll")).toContainText("npolled=0");
    await expect(page.getByTestId("write-prediction-feedback")).toContainText(/zero entries/i);
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-result-revealed", "true");

    await jumpToSection(page, /Where did the data go if B's completion queue is empty/);
    await expect(page.getByTestId("write-memory-before-card")).toHaveCount(0);
    await next(page);
    await expect(page.getByTestId("write-memory-before-card")).toBeVisible();
    await expect(page.getByTestId("write-memory-after-card")).toBeVisible();
    await expect(page.getByTestId("write-memory-exact-comparison")).toHaveAttribute("data-equal", "true");
  });

  test("WRITE wire validation and READ request/response direction remain semantically correct", async ({ page }) => {
    await openOperations(page, "write");
    await jumpToSection(page, /What does the target provider do with the incoming request/);
    await next(page);
    const request = page.locator('[data-testid="write-request-inspector"][data-packet-id="c:packet:7"]');
    await expect(request).toContainText("RDMA WRITE Only");
    await expect(request).toContainText("Remote virtual address");
    await expect(request).toContainText("DMA length");
    await expect(request).toContainText("53");
    await next(page);
    await expect(page.getByTestId("write-access-interval")).toHaveAttribute("data-qpn-match", "true");
    await expect(page.getByTestId("write-access-interval")).toHaveAttribute("data-key-match", "true");
    await expect(page.getByTestId("write-access-interval")).toHaveAttribute("data-range-fits", "true");

    await openOperations(page, "read");
    await jumpToSection(page, /Why does the reader use a Send Work Request/);
    await next(page, 2);
    await expect(page.getByTestId("read-wr-lifecycle")).toHaveAttribute("data-stage", "constructed");
    await expect(page.getByTestId("actual-read-wr")).toHaveAttribute("data-remote-fields", "not-attached");
    await next(page);
    await expect(page.getByTestId("actual-read-wr")).toHaveAttribute("data-remote-fields", "included");
    await next(page);
    await expect(page.getByTestId("read-wr-lifecycle")).toHaveAttribute("data-stage", "posted");
    await expect(page.getByTestId("read-submit-explanation")).toContainText("operation is initiated by A");

    await jumpToSection(page, /Follow the request: A asks, but sends no message payload/);
    await next(page);
    await expect(page.getByTestId("read-request-range")).toContainText("application payload bytes 0");
    await expect(page.getByTestId("visual-7-4")).toContainText("request direction follows the initiator");
    await next(page);
    await expect(page.getByTestId("read-access-validation")).toBeVisible();

    await jumpToSection(page, /Follow the response: B supplies data to A/);
    await next(page);
    await expect(page.locator('[data-testid="read-response-inspector"]')).toContainText("READ response");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-direction", "b-to-a");
    await next(page);
    await expect(page.getByTestId("read-response-prefix-comparison")).toHaveAttribute("data-equal", "true");

    await jumpToSection(page, /Observe completion and verify the actual local data/);
    await next(page);
    await expect(page.getByTestId("read-a-completion")).toBeVisible();
    await next(page);
    await expect(page.getByTestId("read-result-exact-comparison")).toHaveAttribute("data-equal", "true");
    await next(page, 2);
    await expect(page.getByTestId("read-source-zero-poll")).toContainText("npolled=0");
  });

  test("packet investigation follows guided interpretation and reveals correlated evidence without arbitrary selection", async ({ page }) => {
    await openOperations(page, "packets");
    await expect(page.getByTestId("packet-orientation-panel")).toBeVisible();
    await expect(page.getByTestId("packet-orientation-panel")).toContainText("actual RoCEv2 SEND packet");
    await next(page);
    await expect(page.getByTestId("selected-layer-fields")).toBeVisible();
    await next(page, 2);
    await expect(page.getByTestId("packet-layer-strip")).toContainText("BTH");
    await next(page);
    await expect(page.getByTestId("guided-packet-interpretation")).toContainText("no RETH");
    await next(page, 2);
    await expect(page.getByTestId("guided-packet-interpretation")).toContainText("application bytes");
    await next(page, 2);
    await expect(page.getByTestId("guided-packet-interpretation")).toContainText("does not by itself establish application memory placement");
    expect(await page.locator('[data-testid="packet-layer-strip"] button').count()).toBe(0);

    await jumpToSection(page, /When does an RDMA packet contain a remote memory address/);
    await expect(page.getByTestId("reth-context-panel")).toHaveAttribute("data-has-reth", "true");
    await next(page);
    await expect(page.getByTestId("reth-context-panel")).toHaveAttribute("data-has-reth", "false");
    await expect(page.getByTestId("reth-context-panel")).toContainText("posted receive WR supplies destination memory");
    await next(page);
    await expect(page.getByTestId("reth-context-panel")).toHaveAttribute("data-has-reth", "true");
    await expect(page.getByTestId("reth-context-panel")).toContainText("source being read");

    await jumpToSection(page, /A complete correlation: Python → WR → packet → memory → completion/);
    await expect(page.getByTestId("selected-code-wire-chain")).toHaveAttribute("data-field", "remote-address");
    await next(page);
    await expect(page.getByTestId("selected-code-wire-chain")).toHaveAttribute("data-field", "remote-key");
    await next(page);
    await expect(page.getByTestId("selected-code-wire-chain")).toHaveAttribute("data-field", "length");
    await next(page);
    await expect(page.getByTestId("write-payload-target-match")).toHaveAttribute("data-equal", "true");

    await jumpToSection(page, /Investigation: where did the SEND land/);
    await expect(page.getByTestId("case-a-receive-wr")).toHaveCount(0);
    await next(page);
    await expect(page.getByTestId("case-a-receive-wr")).toBeVisible();
    await next(page);
    await expect(page.getByTestId("case-a-receive-completion")).toBeVisible();

    await jumpToSection(page, /Investigation: does an ACK notify the target application/);
    await next(page, 2);
    await expect(page.getByTestId("case-b-selected-packet-note")).toContainText("reverse ACK");
    await expect(page.getByTestId("investigation-evidence-reveal")).toContainText("target zero-entry poll");
    await next(page);
    await expect(page.getByTestId("case-b-buffer-comparison")).toHaveAttribute("data-equal", "true");

    await jumpToSection(page, /Investigation: who initiated this response/);
    await next(page);
    await expect(page.getByTestId("case-c-earlier-request")).toBeVisible();
    await next(page);
    await expect(page.getByTestId("case-c-originating-wr")).toBeVisible();
    await next(page);
    await expect(page.getByTestId("case-c-reader-completion")).toBeVisible();
  });
});
