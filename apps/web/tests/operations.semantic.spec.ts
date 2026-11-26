import { expect, test, type Page } from "@playwright/test";

async function openOperations(page: Page, lesson: string) {
  await page.goto(`/practical/rdma?lesson=${lesson}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
}

async function advance(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    await expect(page.getByTestId("lesson-action")).toBeEnabled();
    await page.getByTestId("lesson-action").click();
  }
}

test.describe("Operations V2 evidence semantics", () => {
  test("SEND setup, RNR fork, packet, independent completions and exact verified bytes are evidence-bound", async ({ page }) => {
    await openOperations(page, "send-receive");
    await advance(page, 2);

    await page.getByTestId("describe-receive-memory").click();
    await page.getByTestId("post-receive-request").click();
    await expect(page.getByTestId("send-receive-wr-card")).toContainText("wr:b:hostb:exp-b-receiver:4");
    await expect(page.getByTestId("send-receive-wr-card")).toContainText("length: 4096");
    await page.getByTestId("tell-a-ready").click();
    await expect(page.getByTestId("visual-5-3")).toContainText("b:hosta:exp-b-sender:4");
    await expect(page.getByTestId("visual-5-3")).not.toContainText("b:packet:3");

    await advance(page, 1);
    await page.getByTestId("try-send-no-receive").click();
    await expect(page.getByTestId("missing-receive-state")).toContainText(/receiver not ready/i);
    await expect(page.getByTestId("missing-receive-state")).toContainText(/no byte placement and no successful CQE/i);
    await expect(page.getByTestId("visual-5-4")).not.toContainText(/captured RNR|RNR frame/i);
    await page.getByTestId("prepare-receive-work").click();
    await expect(page.getByTestId("missing-receive-state")).toContainText(/prepared before the real SEND/i);

    await advance(page, 1);
    await page.getByTestId("write-bytes-a-buffer").click();
    await expect(page.getByTestId("send-payload-exact-bytes")).toContainText("50 bytes");
    await expect(page.getByTestId("send-payload-exact-bytes")).toContainText("\\n");
    await page.getByTestId("construct-send-instruction").click();
    await expect(page.getByTestId("actual-send-wr")).toContainText("wr:b:hosta:exp-b-sender:5");
    await expect(page.getByTestId("actual-send-wr")).toContainText("length: 50");
    await page.getByTestId("submit-to-send-queue").click();
    await expect(page.getByTestId("visual-5-5")).toContainText(/no successful completion yet/i);

    await advance(page, 1);
    await page.getByTestId("inspect-captured-send").click();
    const sendPacket = page.locator('[data-testid="operations-packet-inspector"][data-packet-id="b:packet:3"]');
    await expect(sendPacket).toContainText("SEND Only");
    await expect(sendPacket).toContainText("Application payload bytes");
    await expect(sendPacket).toContainText("50");
    await expect(sendPacket).toContainText("BTH padding bytes");
    await expect(sendPacket).toContainText("2");
    await expect(sendPacket).toContainText("Total frame bytes");
    await expect(sendPacket).toContainText("110");
    await expect(sendPacket).not.toContainText("Remote virtual address");
    await page.getByTestId("follow-placement-b").click();
    await expect(page.getByTestId("send-placement-state")).toContainText(/first 50 bytes/i);
    await expect(page.getByTestId("send-placement-state")).toContainText(/Completion evidence remains separate/i);

    await advance(page, 1);
    await page.getByTestId("inspect-reverse-ack").click();
    const ack = page.locator('[data-testid="send-ack-inspector"][data-packet-id="b:packet:4"]');
    await expect(ack).toContainText("Acknowledge");
    await expect(ack).toContainText("Application payload bytes");
    await expect(ack).toContainText("0");
    await expect(ack).not.toContainText("Remote virtual address");
    await page.getByTestId("observe-a-completion").click();
    await page.getByTestId("observe-b-completion").click();
    await expect(page.getByTestId("send-a-completion")).toContainText("cqe:b:hosta:exp-b-sender:6");
    await expect(page.getByTestId("send-b-completion")).toContainText("cqe:b:hostb:exp-b-receiver:5");
    await expect(page.getByTestId("visual-5-7")).toContainText(/independent/i);

    await advance(page, 1);
    await page.getByTestId("read-received-bytes").click();
    await expect(page.getByTestId("send-exact-byte-equality")).toHaveAttribute("data-equal", "true");
    await expect(page.getByTestId("send-exact-byte-equality")).toContainText("50 received bytes / 4096 byte registered capacity");
    await expect(page.getByTestId("send-exact-byte-equality")).toContainText("hex 0a");
    await expect(page.getByTestId("send-local-verification-order")).toContainText("B completion observed");
    await page.getByTestId("toggle-byte-representation").click();
    await expect(page.getByTestId("send-received-hex")).toContainText("0a");
  });

  test("WRITE remote tuple, hidden prediction, zero target poll and exact 53-byte verification are enforced", async ({ page }) => {
    await openOperations(page, "write");
    await advance(page, 2);

    await page.getByTestId("fill-write-source").click();
    await expect(page.getByTestId("write-payload-exact-bytes")).toContainText("53 bytes");
    await page.getByTestId("describe-write-local-source").click();
    await page.getByTestId("add-remote-destination").click();
    await expect(page.getByTestId("write-memory-descriptions")).toContainText("local source");
    await expect(page.getByTestId("write-memory-descriptions")).toContainText("remote destination");
    await page.getByTestId("construct-write-instruction").click();
    await expect(page.getByTestId("actual-write-wr")).toContainText("wr:c:hosta:exp-c-writer:5");
    await expect(page.getByTestId("actual-write-wr")).toContainText("length: 53");
    await expect(page.getByTestId("actual-write-wr")).toContainText("remote addr:");
    await expect(page.getByTestId("actual-write-wr")).toContainText("RKEY:");

    await advance(page, 1);
    await page.getByTestId("inspect-write-request").click();
    const request = page.locator('[data-testid="write-request-inspector"][data-packet-id="c:packet:7"]');
    await expect(request).toContainText("RDMA WRITE Only");
    await expect(request).toContainText("Remote virtual address");
    await expect(request).toContainText("DMA length");
    await expect(request).toContainText("53");
    await expect(request).toContainText("BTH padding bytes");
    await expect(request).toContainText("3");
    await expect(request).toContainText("Total frame bytes");
    await expect(request).toContainText("130");
    await page.getByTestId("check-target-access").click();
    await expect(page.getByTestId("write-access-interval")).toContainText("capacity 4096");
    await page.getByTestId("follow-target-placement").click();
    await expect(page.getByTestId("write-placement-caveat")).toContainText(/no target CQE is fabricated/i);

    await advance(page, 2);
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "none");
    await page.getByTestId("target-cqe-predict-yes").click();
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "Yes");
    await expect(page.getByTestId("write-prediction-feedback")).toHaveCount(0);
    await expect(page.getByTestId("poll-target-cq")).toBeDisabled();
    await page.getByTestId("follow-write-done-signal").click();
    await page.getByTestId("poll-target-cq").click();
    await expect(page.getByTestId("write-target-zero-poll")).toContainText("c:hostb:exp-c-target:6");
    await expect(page.getByTestId("write-target-zero-poll")).toContainText("npolled=0");
    await expect(page.getByTestId("write-prediction-feedback")).toContainText(/zero entries/i);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "Yes");
    await page.getByTestId("target-cqe-prediction-skip").click();
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "none");
    await page.getByTestId("follow-write-done-signal").click();
    await page.getByTestId("poll-target-cq").click();
    await expect(page.getByTestId("write-prediction-feedback")).toContainText(/skipping does not record mastery/i);

    await advance(page, 1);
    await page.getByTestId("inspect-write-before-after").click();
    await expect(page.getByTestId("write-memory-exact-comparison")).toHaveAttribute("data-equal", "true");
    await expect(page.getByTestId("write-memory-exact-comparison")).toContainText("53-byte range");
    await expect(page.getByTestId("write-memory-exact-comparison")).toContainText(/beyond 53 are not observed/i);
    await expect(page.getByTestId("write-target-local-order")).toContainText("write_done signal");
    await expect(page.getByTestId("write-target-local-order")).toContainText("poll returned zero");
  });

  test("READ request/response directions, lengths, completion ownership and comparison table are exact", async ({ page }) => {
    await openOperations(page, "read");
    await advance(page, 3);

    await page.getByTestId("inspect-read-request").click();
    const request = page.locator('[data-testid="read-request-inspector"][data-packet-id="d:packet:3"]');
    await expect(request).toContainText("RDMA READ Request");
    await expect(request).toContainText("Application payload bytes");
    await expect(request).toContainText("0");
    await expect(request).toContainText("DMA length");
    await expect(request).toContainText("46");
    await expect(page.getByTestId("read-request-range")).toContainText("payload bytes 0");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-direction", "a-to-b");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-kind", "request");

    await advance(page, 1);
    await page.getByTestId("inspect-read-response").click();
    const response = page.locator('[data-testid="read-response-inspector"][data-packet-id="d:packet:4"]');
    await expect(response).toContainText("RDMA READ response Only");
    await expect(response).toContainText("46");
    await expect(response).not.toContainText("Remote virtual address");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-direction", "b-to-a");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-kind", "response");
    await page.getByTestId("place-returned-bytes").click();
    await expect(page.getByTestId("read-response-prefix-comparison")).toHaveAttribute("data-equal", "true");
    await expect(page.getByTestId("read-response-prefix-comparison")).toContainText("first 46 bytes");

    await advance(page, 1);
    await page.getByTestId("poll-reader-cq").click();
    await expect(page.getByTestId("read-a-completion")).toContainText("cqe:d:hosta:exp-d-reader:6");
    await expect(page.getByTestId("inspect-source-cq")).toBeDisabled();
    await page.getByTestId("inspect-verified-reader-memory").click();
    await expect(page.getByTestId("read-result-exact-comparison")).toHaveAttribute("data-equal", "true");
    await page.getByTestId("signal-read-done").click();
    await expect(page.getByTestId("visual-7-6")).toContainText("d:hostb:exp-d-source:5");
    await page.getByTestId("inspect-source-cq").click();
    await expect(page.getByTestId("read-source-zero-poll")).toContainText("d:hostb:exp-d-source:6");
    await expect(page.getByTestId("read-source-zero-poll")).toContainText("npolled=0");
    await expect(page.getByTestId("visual-7-6")).not.toContainText(/B application SendWR submitted/i);

    await advance(page, 1);
    const table = page.getByTestId("three-operation-authored-table");
    await expect(table).toContainText("B, posted receive");
    await expect(table).toContainText("A, remote address and RKEY");
    await expect(table).toContainText("A, local SGE");
    await expect(table).toContainText("A SEND; B RECEIVE");
    await expect(table).toContainText("A WRITE");
    await expect(table).toContainText("A READ");
    await expect(page.getByTestId("read-direction-review-answer-hidden")).toBeVisible();
    await page.getByTestId("read-direction-review-option-1").click();
    await page.getByTestId("read-direction-review-check").click();
    await expect(page.getByTestId("read-direction-review-feedback")).toHaveAttribute("data-correct", "true");
    await expect(page.getByTestId("read-direction-review-feedback")).toContainText(/B back to A/i);
  });

  test("packet audit lengths, code correlation and all three investigations use scoped genuine evidence", async ({ page }) => {
    await openOperations(page, "packets");
    await advance(page, 3);

    const breakdown = page.getByTestId("packet-length-breakdown");
    await expect(breakdown).toHaveAttribute("data-packet-id", "b:packet:3");
    await expect(breakdown).toHaveAttribute("data-app-payload", "50");
    await expect(breakdown).toHaveAttribute("data-padding", "2");
    await expect(breakdown).toHaveAttribute("data-frame-length", "110");
    await page.getByTestId("length-packet-write").click();
    await expect(breakdown).toHaveAttribute("data-packet-id", "c:packet:7");
    await expect(breakdown).toHaveAttribute("data-app-payload", "53");
    await expect(breakdown).toHaveAttribute("data-padding", "3");
    await expect(breakdown).toHaveAttribute("data-frame-length", "130");
    await page.getByTestId("toggle-payload-padding-view").click();
    await expect(page.getByTestId("visual-8-4")).toContainText("application payload plus transport padding");
    await expect(page.getByTestId("visual-8-4")).toContainText("56 bytes");
    await page.getByTestId("length-packet-read-request").click();
    await expect(breakdown).toHaveAttribute("data-packet-id", "d:packet:3");
    await expect(breakdown).toHaveAttribute("data-app-payload", "0");
    await expect(breakdown).toHaveAttribute("data-padding", "0");
    await expect(breakdown).toHaveAttribute("data-frame-length", "74");
    await page.getByTestId("length-packet-read-response").click();
    await expect(breakdown).toHaveAttribute("data-packet-id", "d:packet:4");
    await expect(breakdown).toHaveAttribute("data-app-payload", "46");
    await expect(breakdown).toHaveAttribute("data-padding", "2");
    await expect(breakdown).toHaveAttribute("data-frame-length", "110");

    await advance(page, 3);
    await page.getByTestId("correlate-remote-key").click();
    await expect(page.getByTestId("selected-code-wire-chain")).toHaveAttribute("data-direct-field", "true");
    await expect(page.getByTestId("selected-code-wire-chain")).toContainText("set_wr_rdma");
    await expect(page.getByTestId("correlation-field-explanation")).toContainText(/RETH RKEY/i);
    await page.getByTestId("correlate-local-address").click();
    await expect(page.getByTestId("selected-code-wire-chain")).toHaveAttribute("data-direct-field", "false");
    await expect(page.getByTestId("correlation-field-explanation")).toContainText(/used by the initiator provider/i);
    await expect(page.getByTestId("correlation-write-wr")).toContainText("wr:c:hosta:exp-c-writer:5");
    await page.getByTestId("inspect-write-payload-match").click();
    await expect(page.getByTestId("write-payload-target-match")).toHaveAttribute("data-equal", "true");

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("visual-8-6")).toBeVisible();
    await page.getByTestId("inspect-lab-retry-settings").click();
    await expect(page.getByTestId("visual-8-6")).toContainText("rnr_retry");
    await expect(page.getByTestId("visual-8-6")).toContainText("cq.poll(1)");
    await expect(page.getByTestId("visual-8-6")).toContainText(/separate mechanisms/i);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("visual-8-7")).toBeVisible();

    await advance(page, 1);
    await expect(page.getByTestId("case-a-packet")).toHaveAttribute("data-packet-id", "b:packet:3");
    await expect(page.getByTestId("case-a-receive-wr")).toHaveCount(0);
    await expect(page.getByTestId("case-a-additional-record-quiz")).toContainText("A's destination QPN alone");
    await expect(page.getByTestId("case-a-additional-record-quiz")).toContainText("captured Ethernet destination alone");
    await page.getByTestId("case-a-destination-option-1").click();
    await page.getByTestId("case-a-destination-check").click();
    await expect(page.getByTestId("case-a-destination-feedback")).toHaveAttribute("data-correct", "true");
    await expect(page.getByTestId("reveal-completion-verified-bytes")).toBeDisabled();
    await page.getByTestId("reveal-receive-instruction").click();
    await expect(page.getByTestId("case-a-receive-wr")).toContainText("wr:b:hostb:exp-b-receiver:4");
    await page.getByTestId("reveal-completion-verified-bytes").click();
    await expect(page.getByTestId("visual-8-8")).toContainText("cqe:b:hostb:exp-b-receiver:5");
    await expect(page.getByTestId("visual-8-8")).toContainText("b:memory:hostb:received");
    await expect(page.getByTestId("visual-8-8")).toContainText("b:hostb:exp-b-receiver:7");

    await advance(page, 1);
    await expect(page.getByTestId("case-b-select-write-request")).toContainText("c:packet:7");
    await page.getByTestId("case-b-select-ack").click();
    await expect(page.getByTestId("case-b-selected-packet-note")).toContainText(/reverse ACK/i);
    await page.getByTestId("case-b-ack-meaning-option-0").click();
    await expect(page.getByTestId("case-b-ack-meaning-check")).toBeDisabled();
    await page.getByTestId("case-b-ack-meaning-skip").click();
    await expect(page.getByTestId("case-b-ack-meaning-feedback")).toContainText(/Skipping does not record mastery/i);
    await expect(page.getByTestId("reveal-control-and-target-poll")).toBeDisabled();
    await page.getByTestId("reveal-writer-completion").click();
    await expect(page.getByTestId("case-b-writer-completion")).toContainText("cqe:c:hosta:exp-c-writer:6");
    await page.getByTestId("reveal-control-and-target-poll").click();
    await expect(page.getByTestId("visual-8-9")).toContainText("c:hostb:exp-c-target:5");
    await expect(page.getByTestId("visual-8-9")).toContainText("c:hostb:exp-c-target:6");
    await expect(page.getByTestId("visual-8-9")).toContainText("cq.poll(1)");
    await page.getByTestId("reveal-target-memory-evidence").click();
    await expect(page.getByTestId("case-b-target-memory")).toContainText("c:memory:hostb:after");

    await advance(page, 1);
    await expect(page.getByTestId("case-c-response")).toHaveAttribute("data-packet-id", "d:packet:4");
    await expect(page.getByTestId("inspect-originating-read-work")).toBeDisabled();
    await page.getByTestId("find-earlier-read-request").click();
    await expect(page.getByTestId("case-c-earlier-request")).toContainText("d:packet:3");
    await page.getByTestId("inspect-originating-read-work").click();
    await expect(page.getByTestId("case-c-originating-wr")).toContainText("wr:d:hosta:exp-d-reader:5");
    await expect(page.getByTestId("visual-8-10")).toContainText(/No new B application SEND WR/i);
    await page.getByTestId("inspect-read-data-completion").click();
    await expect(page.getByTestId("case-c-reader-completion")).toContainText("cqe:d:hosta:exp-d-reader:6");
    await expect(page.getByTestId("case-c-read-result")).toContainText("d:memory:hosta:read-result");
    await expect(page.getByTestId("case-c-source-before")).toContainText("d:memory:hostb:before");
    await expect(page.getByTestId("visual-8-10")).toContainText("d:hostb:exp-d-source:6");

    await advance(page, 1);
    await expect(page.getByTestId("ai-fabric-bridge")).toBeVisible();
    await expect(page.getByTestId("ai-control-payload-paths")).toContainText(/CPU\/control path/i);
    await expect(page.getByTestId("ai-control-payload-paths")).toContainText(/Memory payload path/i);
    await expect(page.getByTestId("ai-troubleshooting-chapter-links").getByRole("link", { name: /Chapter 16/i })).toHaveAttribute("href", "/learn/ch16-gpu-compute-network-packet-anatomy");
    await expect(page.getByTestId("ai-troubleshooting-chapter-links").getByRole("link", { name: /Chapter 5/i })).toHaveAttribute("href", "/learn/ch5-pfc-ecn-congestion");
    await expect(page.getByTestId("ai-bridge-scope-label")).toContainText(/no measured NCCL\/GPU experiment/i);
  });
});
