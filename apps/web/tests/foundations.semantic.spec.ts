import { expect, test, type Page } from "@playwright/test";

async function openRdma(page: Page, lesson = "moving-data") {
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

async function jumpToSection(page: Page, title: string | RegExp) {
  const outline = page.getByTestId("lesson-outline");
  await outline.evaluate((element) => element.setAttribute("open", ""));
  await outline.getByRole("button", { name: title instanceof RegExp ? title : new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).dispatchEvent("click");
  await expect(page.getByTestId("lesson-action")).toBeEnabled();
}

async function byteText(page: Page, testId: string) {
  return page.getByTestId(testId).locator("[data-byte-index]").evaluateAll((cells) => cells.map((cell) => cell.textContent || ""));
}

test.describe("guided foundations semantics", () => {
  test("Lesson 1.1 follows the exact four-stage hardware/software teaching sequence with reversible state", async ({ page }) => {
    await openRdma(page);

    await expect(page.getByTestId("guided-position")).toContainText("1.1");
    await expect(page.getByTestId("guided-position")).toContainText("Stage 1 of 4");
    await expect(page.getByTestId("foundation-host-architecture")).toHaveAttribute("data-guided-stage", "0");
    await expect(page.getByTestId("hardware-cpu")).toBeVisible();
    await expect(page.getByTestId("hardware-ram")).toBeVisible();
    await expect(page.getByTestId("hardware-nic")).toBeVisible();
    await expect(page.getByTestId("software-responsibility-overlay")).toHaveCount(0);
    await expect(page.getByTestId("lesson-narrative")).toContainText("Before discussing networking");
    await expect(page.getByTestId("guided-observation")).toContainText("These are physical components");
    await expect(page.getByTestId("show-hardware")).toHaveCount(0);
    await expect(page.getByTestId("execute-application-instruction")).toHaveCount(0);

    await next(page);
    await expect(page.getByTestId("guided-position")).toContainText("Stage 2 of 4");
    await expect(page.getByTestId("software-responsibility-overlay")).toBeVisible();
    await expect(page.getByTestId("application-software-box")).toContainText("User-level work");
    await expect(page.getByTestId("kernel-software-box")).toContainText("Resource management");
    await expect(page.getByTestId("hardware-cpu")).toContainText("CPU");
    await expect(page.getByTestId("guided-observation")).toContainText("physical CPU, RAM and network interface are still the same");

    await next(page);
    await expect(page.getByTestId("guided-position")).toContainText("Stage 3 of 4");
    await expect(page.getByTestId("application-memory-access")).toBeVisible();
    await expect(page.getByTestId("application-memory-access")).toContainText("memory contains 0x48");
    await expect(page.getByTestId("application-memory-access")).toContainText("0x48");
    await expect(page.getByTestId("kernel-service-flow")).toHaveCount(0);

    await next(page);
    await expect(page.getByTestId("guided-position")).toContainText("Stage 4 of 4");
    await expect(page.getByTestId("kernel-service-flow")).toBeVisible();
    await expect(page.getByTestId("kernel-service-flow")).toContainText("CPU executes privileged kernel instructions");
    await expect(page.getByTestId("guided-observation")).toContainText("Application execution");
    await expect(page.getByTestId("guided-observation")).toContainText("The kernel is software running on the CPU");

    await page.getByTestId("lesson-previous").click();
    await expect(page.getByTestId("guided-position")).toContainText("Stage 3 of 4");
    await expect(page.getByTestId("application-memory-access")).toBeVisible();
    await expect(page.getByTestId("kernel-service-flow")).toHaveCount(0);

    await next(page);
    await expect(page.getByTestId("kernel-service-flow")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 30000 });
    await expect(page.getByTestId("guided-position")).toContainText("Stage 4 of 4");
    await expect(page.getByTestId("kernel-service-flow")).toBeVisible();
  });

  test("address translation, allocation, copy and reference states are semantic and guided", async ({ page }) => {
    await openRdma(page);
    await jumpToSection(page, /How the CPU finds a byte/);

    await expect(page.getByTestId("translation-result")).toContainText("before any memory request");
    await next(page, 3);
    await expect(page.getByTestId("translation-result")).toContainText("returned 0x48");
    await next(page, 3);
    await expect(page.getByTestId("translation-result")).toContainText("byte is now 0x4c");
    await next(page, 2);
    await expect(page.getByTestId("translation-result")).toContainText("rejected: protection fault");
    await expect(page.getByTestId("translation-result")).toContainText("memory remains 0x4c");
    await expect(page.getByTestId("request-memory-load")).toHaveCount(0);
    await expect(page.getByTestId("toggle-readonly-mapping")).toHaveCount(0);

    await next(page);
    await expect(page.getByTestId("buffer-allocation-visual")).toBeVisible();
    await expect(page.getByTestId("no-allocated-buffer")).toBeVisible();
    await next(page, 2);
    let cells = await byteText(page, "sixteen-byte-buffer");
    expect(cells).toHaveLength(16);
    expect(cells.every((cell) => cell.includes("00"))).toBe(true);
    await next(page);
    cells = await byteText(page, "sixteen-byte-buffer");
    for (const [index, hex] of ["48", "45", "4c", "4c", "4f"].entries()) expect(cells[index]).toContain(hex);
    expect(cells.slice(5).every((cell) => cell.includes("00"))).toBe(true);
    await next(page);
    await expect(page.getByTestId("capacity-length-comparison")).toContainText("Capacity: 16 bytes");
    await expect(page.getByTestId("capacity-length-comparison")).toContainText("Meaningful payload: 5 bytes");

    await next(page);
    await expect(page.getByTestId("copy-reference-visual")).toBeVisible();
    await next(page, 2);
    await expect(page.getByTestId("reference-state-result")).toContainText(/Observed through alpha: 0x58/i);
    await expect(page.getByTestId("reference-state-result")).toContainText(/observed through beta: 0x58/i);
    await next(page, 2);
    await expect(page.getByTestId("copy-state-result")).toContainText("original first byte 0x48");
    await expect(page.getByTestId("copy-state-result")).toContainText("independent copy first byte 0x48");
    await next(page);
    await expect(page.getByTestId("copy-state-result")).toContainText("original first byte 0x48");
    await expect(page.getByTestId("copy-state-result")).toContainText("independent copy first byte 0x58");
    await page.getByTestId("lesson-previous").click();
    await expect(page.getByTestId("copy-state-result")).toContainText("independent copy first byte 0x48");
  });

  test("TCP segmentation stages synchronize ranges and the packet inspector without requiring packet selection", async ({ page }) => {
    await openRdma(page);
    await jumpToSection(page, /TCP processing: turn a stream into segments/);

    await expect(page.getByTestId("foundation-tcp-segmentation")).toHaveAttribute("data-guided-stage", "0");
    await expect(page.getByTestId("selected-byte-range")).toContainText("one contiguous sendall buffer");
    await next(page);
    await expect(page.getByTestId("selected-byte-range")).toContainText("positions 0–1447");
    await expect(page.getByTestId("synchronized-selection-state")).toContainText("payload frame");
    await expect(page.getByTestId("tcp-segmentation-inspector").getByTestId("selected-packet-fields")).toContainText("Frame");
    await next(page);
    await expect(page.getByTestId("selected-byte-range")).toContainText("positions 1448–2895");
    await next(page);
    await expect(page.getByTestId("selected-byte-range")).toContainText("positions 2896–4095");
    await next(page);
    await expect(page.getByTestId("selected-byte-range")).toContainText("Application read 1 returned byte positions");
    await next(page);
    await expect(page.getByTestId("selected-byte-range")).toContainText("boundaries are different descriptions");

    await jumpToSection(page, /Read the evidence, then ask why RDMA is needed/);
    await expect(page.getByTestId("tcp-small-evidence-stage")).toBeVisible();
    await next(page);
    await expect(page.getByTestId("tcp-large-evidence-stage")).toBeVisible();
    await next(page);
    await expect(page.getByTestId("evidence-large-packet-byte-ranges")).toBeVisible();
    await expect(page.getByTestId("evidence-large-read-byte-ranges")).toBeVisible();
    await next(page);
    await expect(page.getByTestId("tcp-fin-ack-inspector")).toBeVisible();
    await expect(page.getByTestId("ack-interpretation")).toContainText("next expected TCP sequence number");
    await expect(page.getByTestId("fin-sequence-space-note")).toContainText("carries no application payload byte");
    await expect(page.getByTestId("tcp-evidence-conclusion-boundary")).toContainText("ACK and FIN consume transport sequence positions");
  });

  test("registration keys and resource-only queue boundaries are revealed in order", async ({ page }) => {
    await openRdma(page, "memory");
    await jumpToSection(page, /A buffer is not yet an RDMA Memory Region/);
    await expect(page.getByTestId("logical-memory-registration")).toContainText("no MR or keys yet");
    await next(page, 3);
    await expect(page.getByTestId("logical-memory-registration")).toContainText("base address");
    await expect(page.getByTestId("logical-memory-registration")).toContainText("keys revealed next");
    await next(page, 2);
    await expect(page.getByTestId("logical-memory-registration")).toContainText("base 0x1000");
    await expect(page.getByTestId("logical-memory-registration")).toContainText("length 16");
    await expect(page.getByTestId("logical-memory-registration")).toContainText("LKEY/RKEY references");
    await expect(page.getByTestId("mr-reference-link")).toBeVisible();

    await jumpToSection(page, /A local key identifies registered access/);
    await expect(page.getByTestId("key-check-result")).toContainText("key association matches");
    await next(page);
    await expect(page.getByTestId("key-check-result")).toContainText("key does not match");
    await next(page);
    await expect(page.getByTestId("local-access-operation-check")).toContainText("crosses the registered boundary");
    await next(page);
    await expect(page.getByTestId("local-access-operation-check")).toContainText(/permission present|access is available/i);

    await openRdma(page, "queues");
    await jumpToSection(page, /Completion reporting and what the resource-only run proves/);
    await next(page, 3);
    await expect(page.getByTestId("resource-only-evidence-ledger")).toContainText("no data WR posted in this run");
    await expect(page.getByTestId("resource-only-evidence-ledger")).toContainText("no RDMA data-operation packets recorded");
  });
});
