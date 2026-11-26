import { expect, test, type Page } from "@playwright/test";

async function openRdma(page: Page, lesson = "moving-data") {
  await page.goto(`/practical/rdma?lesson=${lesson}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
}
async function steps(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) await page.getByTestId("lesson-action").click();
}
async function byteText(page: Page, testId: string) {
  return page.getByTestId(testId).locator("[data-byte-index]").evaluateAll((cells) => cells.map((cell) => cell.textContent || ""));
}

test.describe("authored foundations semantic interactions", () => {
  test("buffer allocation, copy/reference, address translation, and subsection state isolation are semantic", async ({ page }) => {
    await openRdma(page);
    await steps(page, 3);

    const code = page.getByTestId("markdown-fenced-code-block").first();
    await expect(code).toContainText("buf = bytearray(16)");
    await expect(code).toContainText('buf[:5] = b"HELLO"');
    await expect(page.getByTestId("no-allocated-buffer")).toBeVisible();
    await page.getByTestId("allocate-16-bytes").click();
    let cells = await byteText(page, "sixteen-byte-buffer");
    expect(cells).toHaveLength(16);
    expect(cells.filter((cell) => cell.includes("00"))).toHaveLength(16);
    await page.getByTestId("write-hello").click();
    cells = await byteText(page, "sixteen-byte-buffer");
    for (const [index, hex] of ["48", "45", "4c", "4c", "4f"].entries()) expect(cells[index]).toContain(hex);
    expect(cells.slice(5).every((cell) => cell.includes("00"))).toBe(true);
    await expect(page.getByTestId("payload-length-observation")).toContainText("5 bytes");
    await expect(page.getByTestId("payload-length-observation")).toContainText("16 bytes");

    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("copy-reference-visual")).toBeVisible();
    await expect(page.getByTestId("payload-length-observation")).toHaveCount(0);
    await page.getByTestId("copy-five-bytes").click();
    await expect(page.getByTestId("copy-state-result")).toContainText("destination first byte 0x48");
    await page.getByTestId("modify-copy-destination").click();
    await expect(page.getByTestId("copy-state-result")).toContainText("source first byte 0x48");
    await expect(page.getByTestId("copy-state-result")).toContainText("destination first byte 0x58");
    await page.getByTestId("select-reference-demo").click();
    await page.getByTestId("pass-reference").click();
    await page.getByTestId("modify-through-reference").click();
    await expect(page.getByTestId("reference-state-result")).toContainText("Observed through alpha: 0x58");
    await expect(page.getByTestId("reference-state-result")).toContainText("observed through beta: 0x58");

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("buffer-allocation-visual")).toBeVisible();
    await expect(page.getByTestId("no-allocated-buffer")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("address-translation-visual")).toBeVisible();
    await page.getByTestId("request-memory-load").click();
    await expect(page.getByTestId("translation-result")).toContainText("returned 0x48");
    await page.getByTestId("request-memory-store").click();
    await expect(page.getByTestId("translation-result")).toContainText("byte is now 0x4c");
    await page.getByTestId("toggle-readonly-mapping").click();
    await page.getByTestId("request-memory-store").click();
    await expect(page.getByTestId("translation-result")).toContainText("rejected: protection fault");
    await expect(page.getByTestId("translation-result")).toContainText("memory remains 0x4c");
    await page.getByTestId("translation-select-c").click();
    await page.getByTestId("request-memory-load").click();
    await expect(page.getByTestId("translation-result")).toContainText("returned 0x99");

    const outline = page.getByTestId("lesson-outline");
    await outline.locator("summary").click();
    await outline.getByRole("button", { name: /Allocate a buffer, then put data into it/ }).click();
    await expect(page.getByTestId("no-allocated-buffer")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("buffer-allocation-visual")).toBeVisible();
    await expect(page.getByTestId("no-allocated-buffer")).toBeVisible();
    await expect(page.getByTestId("foundation-visual-next")).toHaveCount(0);
    await expect(page.locator("text=Visual contract")).toHaveCount(0);
  });

  test("socket wrappers, packet selection, segmentation ranges, receive ordering, and loopback are evidence-backed", async ({ page }) => {
    await openRdma(page);
    await steps(page, 7);
    await expect(page.getByTestId("kernel-socket-object")).toBeVisible();
    await page.getByTestId("create-tcp-socket").click();
    await expect(page.getByTestId("foundation-socket-objects")).toContainText("process-local handle");
    await page.getByTestId("lesson-action").click();
    await page.getByTestId("connect-to-server-b").click();
    await expect(page.getByTestId("connection-four-tuple")).toContainText("10.10.10.1:53082");

    await steps(page, 4);
    await expect(page.getByTestId("foundation-tcp-segmentation")).toBeVisible();
    await page.locator('[data-testid="captured-segment-ranges"] [data-range-id="segment-5"]').click();
    await expect(page.getByTestId("selected-byte-range")).toContainText("positions 1448–2895");
    await page.locator('[data-testid="application-read-ranges"] [data-range-id="read-1"]').click();
    await expect(page.getByTestId("selected-byte-range")).toContainText("returned byte positions");
    await page.getByTestId("tcp-segmentation-inspector").getByTestId("packet-row-4").click();
    await expect(page.getByTestId("tcp-segmentation-inspector").getByTestId("selected-packet-fields")).toContainText("Frame 4 decoded fields");
    await expect(page.getByTestId("tcp-segmentation-inspector").getByTestId("selected-packet-payload")).toContainText(/[0-9a-f]{100}/);

    await steps(page, 4);
    await expect(page.getByTestId("tcp-read-order-evidence")).toBeVisible();
    await page.getByTestId("sender-sends-first-case").click();
    await expect(page.getByTestId("tcp-read-order-evidence")).toContainText("five unread bytes");
    await expect(page.getByTestId("tcp-read-order-evidence")).toContainText("Recv-Q");
    await page.getByTestId("receiver-reads-first-case").click();
    await expect(page.getByTestId("tcp-read-order-evidence")).toContainText("recv_enter recorded, blocked before data");
    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("tcp-loopback-evidence")).toContainText("process A address space");
    await expect(page.getByTestId("tcp-loopback-evidence")).toContainText("process B address space");
    await expect(page.getByTestId("tcp-loopback-evidence")).toContainText("no physical Ethernet traversal");
    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("tcp-evidence-packet-inspector")).toContainText("FabricLab packet inspection");
    await expect(page.getByTestId("tcp-evidence-packet-inspector")).toContainText("Not Wireshark GUI");
    await page.getByTestId("tcp-evidence-packet-inspector").getByTestId("packet-row-4").click();
    await expect(page.getByTestId("tcp-evidence-packet-inspector").getByTestId("selected-packet-payload")).toContainText("48454c4c4f");
  });

  test("Soft-RoCE, registration, key association, metadata exchange, and queues implement authored state changes", async ({ page }) => {
    await openRdma(page, "why-rdma");
    await steps(page, 1);
    await expect(page.getByTestId("dma-address-contexts")).toBeVisible();
    await page.getByTestId("show-device-address-view").click();
    await expect(page.getByTestId("dma-address-contexts")).toContainText("DMA 0x4000");
    await steps(page, 2);
    await expect(page.getByTestId("rdma-operation-preview")).toBeVisible();
    await expect(page.getByTestId("operation-preview-result")).toContainText("A data → network → B receiver-selected buffer");
    await page.getByTestId("preview-operation-write").click();
    await expect(page.getByTestId("operation-preview-result")).toContainText("B named authorized buffer");
    await page.getByTestId("preview-operation-read").click();
    await expect(page.getByTestId("operation-preview-result")).toContainText("A request → B; then data B → A");
    await expect(page.getByTestId("rdma-operation-preview")).not.toContainText("RKEY");
    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("soft-roce-instruction-path")).toBeVisible();
    await expect(page.getByTestId("soft-roce-instruction-path")).toContainText("logical RXE RDMA device");
    await expect(page.getByTestId("soft-roce-instruction-path")).toContainText("does not demonstrate hardware bypass");

    await openRdma(page, "memory");
    await page.getByTestId("prepare-region-for-rdma").click();
    await expect(page.getByTestId("logical-memory-registration")).toContainText("base 0x1000");
    await expect(page.getByTestId("registration-illustration")).toContainText("does not create another copy");
    await steps(page, 1);
    await expect(page.getByTestId("actual-python-source-excerpt").first()).toContainText("new_memory_region");
    await steps(page, 1);
    await page.getByTestId("select-eight-at-offset-four").click();
    await expect(page.getByTestId("range-check-result")).toContainText("inside registered 0–15");
    await page.getByTestId("select-eight-at-offset-twelve").click();
    await expect(page.getByTestId("range-check-result")).toContainText("crosses boundary");
    expect(await page.getByTestId("twenty-four-cell-range").locator("[data-byte-index]").count()).toBe(24);
    await steps(page, 1);
    await expect(page.getByTestId("access-path-distinction")).toContainText("not RDMA local-write permission");
    await steps(page, 1);
    await page.getByTestId("choose-key-0x22").click();
    await expect(page.getByTestId("key-check-result")).toContainText("does not match");
    await page.getByTestId("choose-key-0x11").click();
    await expect(page.getByTestId("key-check-result")).toContainText("matches MR A");
    await steps(page, 1);
    await expect(page.getByTestId("server-a-local-source")).toContainText("LKEY 0x11");
    await expect(page.getByTestId("server-b-remote-destination")).toContainText("RKEY 0x42");
    await page.getByTestId("share-remote-memory-information").click();
    await expect(page.getByTestId("shared-remote-tuple")).toContainText("remote address 0x2000");
    await expect(page.getByTestId("shared-remote-tuple")).toContainText("remote key 0x42");
    await page.getByTestId("construct-remote-operation").click();
    await expect(page.getByTestId("constructed-remote-operation")).toContainText("source address 0x1000");
    await expect(page.getByTestId("constructed-remote-operation")).toContainText("destination address 0x2000");
    await page.getByTestId("preview-valid-remote-request").click();
    await expect(page.getByTestId("remote-validation-result")).toContainText("could be permitted");
    await page.getByTestId("preview-wrong-remote-key").click();
    await expect(page.getByTestId("remote-validation-result")).toContainText("fails the highlighted");
    await expect(page.getByTestId("remote-key-ownership-visual")).toContainText("no WRITE execution");

    await steps(page, 1);
    await page.getByTestId("share-remote-metadata").click();
    await expect(page.getByTestId("rdma-metadata-exchange")).toContainText("local LKEY");
    await expect(page.getByTestId("rdma-metadata-exchange")).toContainText("metadata only");
    await steps(page, 1);
    await expect(page.getByTestId("access-exercise-range-grid")).toBeVisible();
    await expect(page.getByTestId("access-decision-result")).toContainText("Permitted under the stated model");
    await page.getByTestId("access-case-write-no-permission").click();
    await expect(page.getByTestId("access-decision-result")).toContainText("Rejected under the stated model");
    await expect(page.getByTestId("access-decision-result")).toContainText("remote write absent");
    await page.getByTestId("access-case-read-crossing").click();
    await expect(page.getByTestId("access-decision-result")).toContainText("crosses boundary");
    await page.getByTestId("access-case-read-wrong-key").click();
    await expect(page.getByTestId("access-decision-result")).toContainText("incorrect");

    await steps(page, 1);
    await expect(page.getByTestId("actual-registration-inspection")).toContainText("0x3abda0f0");
    await expect(page.getByTestId("actual-registration-inspection")).toContainText("0x21b");

    await openRdma(page, "queues");
    await expect(page.getByTestId("resource-questions-visual")).toContainText("What task?");
    await expect(page.getByTestId("resource-questions-visual")).toContainText("Where should the instruction be submitted?");
    await expect(page.getByTestId("resource-questions-visual")).toContainText("How will the application learn the result?");
    await expect(page.getByTestId("unresolved-resource-questions")).not.toContainText("QPN");
    await expect(page.getByTestId("unresolved-resource-questions")).not.toContainText("Completion Queue");
    await page.getByTestId("describe-a-task").click();
    await expect(page.getByTestId("described-task-transition")).toContainText("construct a visible task description");

    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("unposted-work-request")).toContainText("operation SEND");
    await expect(page.getByTestId("unposted-work-request")).toContainText("WR ID 7");
    await expect(page.getByTestId("unposted-work-request")).toContainText("SGE addr 0x1000");
    await expect(page.getByTestId("unposted-work-request")).toContainText("length 5");
    await expect(page.getByTestId("unposted-work-request")).toContainText("lkey 0x11");
    await expect(page.getByTestId("post-illustrative-wr")).toHaveCount(0);
    await expect(page.getByTestId("illustrative-work-request")).toContainText("separate source memory");

    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("wr-outside-queue")).toContainText("not yet submitted");
    await expect(page.getByTestId("empty-send-queue")).toContainText("future submission point");
    await expect(page.getByTestId("queue-formation-visual")).not.toContainText("destination QPN");
    await page.getByTestId("reveal-receive-queue").click();
    await expect(page.getByTestId("receive-queue-revealed")).toBeVisible();
    await page.getByTestId("form-queue-pair").click();
    await expect(page.getByTestId("queue-pair-boundary")).toContainText("peer placeholder");

    await page.getByTestId("lesson-action").click();
    await expect(page.getByTestId("illustrative-bth-destination-qpn")).toContainText("destination QPN = 18");
    await expect(page.getByTestId("illustrative-bth-destination-qpn")).toContainText("destination IP = 10.10.10.2");
    await page.getByTestId("direction-b-to-a").click();
    await expect(page.getByTestId("illustrative-bth-destination-qpn")).toContainText("destination QPN = 17");
    await expect(page.getByTestId("illustrative-bth-destination-qpn")).toContainText("destination IP = 10.10.10.1");
    await page.getByTestId("inspect-recorded-endpoint-setup").click();
    await expect(page.getByTestId("recorded-endpoint-setup")).toContainText("local QPN 17");
    await expect(page.getByTestId("recorded-endpoint-setup")).toContainText("destination QPN 18");
    await expect(page.getByTestId("recorded-endpoint-setup")).toContainText("bring_qp_to_rts");

    await page.getByTestId("lesson-action").click();
    await page.getByTestId("provider-produces-completion").click();
    await expect(page.getByTestId("conceptual-cq")).toContainText("one conceptual entry pending");
    await page.getByTestId("application-polls-cq").click();
    await expect(page.getByTestId("conceptual-cq")).toContainText("no longer pending");
    await expect(page.getByTestId("retrieved-work-completion")).toContainText("outside CQ");
    await expect(page.getByTestId("resource-only-evidence-ledger")).toContainText("no data WR posted");
    await expect(page.getByTestId("resource-only-evidence-ledger")).toContainText("no RDMA data-operation packets");
    await expect(page.getByTestId("start-real-send-receive-practical")).toBeVisible();
  });
});
