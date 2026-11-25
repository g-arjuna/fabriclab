import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const evidence = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "public/practical/rdma/reference-evidence.json"), "utf8"),
);
const writeExperiment = evidence.experiments.find((experiment: any) => experiment.id === "write");
const readExperiment = evidence.experiments.find((experiment: any) => experiment.id === "read");

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

async function waitForPracticalHydration(page: Page) {
  await expect(page.getByTestId("rdma-practical")).toHaveAttribute("data-hydrated", "true");
}

async function selectStep(page: Page, title: RegExp) {
  await waitForPracticalHydration(page);
  await page.getByRole("button", { name: title }).click();
}

test.describe("RDMA practical public experience", () => {
  test("practical landing page loads publicly and links to the RDMA replay", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Learn protocols from running code and packets that really happened/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start with RDMA WRITE/i })).toBeVisible();
    await expect(page.getByText(/Evidence first/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /^Practical$/i }).first()).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("reference evidence asset is publicly available and complete", async ({ request }) => {
    const response = await request.get("/practical/rdma/reference-evidence.json");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.schemaVersion).toBe(1);
    expect(body.source.validationStatus).toBe("pass");
    expect(body.provenance.evidenceDigest).toBe(evidence.provenance.evidenceDigest);
    expect(body.experiments.map((experiment: any) => experiment.id)).toEqual(["resources", "send-recv", "write", "read"]);
    expect(body.experiments.map((experiment: any) => experiment.packets.length)).toEqual([0, 2, 2, 2]);
  });

  test("RDMA WRITE is the default evidence-driven interactive demonstration", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByTestId("rdma-practical")).toBeVisible();
    await expect(page.getByRole("heading", { name: /One-Sided RDMA: Writing Directly Into Remote Memory/i })).toBeVisible();
    await expect(page.getByText(/Interactive replay of a verified RDMA execution/i).first()).toBeVisible();
    await expect(page.getByText(/does not consume a target receive WR/i).first()).toBeVisible();
    await expect(page.getByTestId("write-no-target-cqe")).toContainText(/observed 0 target CQEs/i);
    await expect(page.getByTestId("write-memory-before")).toBeVisible();
    await expect(page.getByTestId("write-memory-after")).toBeVisible();

    const requestPacket = writeExperiment.packets[0];
    await selectStep(page, /RDMA WRITE Only packet crosses UDP\/4791/i);
    await expect(page.getByTestId("packet-inspector")).toBeVisible();
    await expect(page.getByTestId("packet-inspector")).toContainText(requestPacket.opcodeName);
    await expect(page.getByTestId("packet-inspector")).toContainText(requestPacket.destinationQpn.hex);
    await expect(page.getByTestId("packet-inspector")).toContainText(requestPacket.psn.decimal);
    await expect(page.getByTestId("packet-inspector")).toContainText(requestPacket.reth.virtualAddress.hex);
    await expect(page.getByTestId("packet-inspector")).toContainText(requestPacket.reth.rkey.hex);
    await expect(page.getByTestId("packet-inspector")).toContainText(`${requestPacket.reth.dmaLength.decimal} bytes`);
    await expect(page.getByTestId("packet-inspector")).toContainText(/Captured frame bytes/i);

    const wrId = writeExperiment.workRequests.find((request: any) => request.kind === "rdma-write").id;
    const wrClass = await page.locator(`[data-work-request-id="${wrId}"]`).getAttribute("class");
    expect(wrClass).toContain("border-cyan");

    await selectStep(page, /ACK returns and writer completion is local/i);
    const completionId = writeExperiment.completions.find((completion: any) => completion.host === "hosta").id;
    await expect(page.locator(`[data-completion-id="${completionId}"]`)).toContainText(/SUCCESS/i);
    const completionClass = await page.locator(`[data-completion-id="${completionId}"]`).getAttribute("class");
    expect(completionClass).toContain("border-lime");

    expectNoBrowserErrors(tracker);
  });

  test("playback controls, code highlighting, event selection and restart work", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByText(/Step 1\/8/i)).toBeVisible();
    const firstHighlightedLine = await page.locator('[data-highlighted="true"]').first().getAttribute("data-line-number");
    expect(firstHighlightedLine).toBeTruthy();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/Step 2\/8/i)).toBeVisible();
    const secondHighlightedLine = await page.locator('[data-highlighted="true"]').first().getAttribute("data-line-number");
    expect(secondHighlightedLine).toBeTruthy();
    expect(secondHighlightedLine).not.toEqual(firstHighlightedLine);

    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByText(/Step 1\/8/i)).toBeVisible();
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.waitForTimeout(1900);
    await expect(page.getByText(/Step 2\/8/i)).toBeVisible();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(page.getByText(/Step 1\/8/i)).toBeVisible();
    await page.getByLabel(/Playback speed/i).selectOption("2");
    await expect(page.getByLabel(/Playback speed/i)).toHaveValue("2");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByText(/Step 1\/8/i)).toBeVisible();

    await selectStep(page, /Target shares address and RKEY/i);
    const metadataEvent = writeExperiment.events.find((event: any) => event.type === "metadata_exchange" && event.host === "hostb");
    await page.locator(`[data-event-id="${metadataEvent.id}"]`).click();
    await expect(page.locator(`[data-event-id="${metadataEvent.id}"]`)).toContainText(/metadata_exchange/i);

    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/Step 3\/8/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("experiment selector and deep links expose SEND/RECEIVE and READ evidence", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?experiment=send-recv", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByRole("heading", { name: /Two-Sided RDMA: SEND and RECEIVE/i })).toBeVisible();
    await selectStep(page, /SEND Only packet crosses the data network/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(/SEND Only/i);
    await expect(page.getByTestId("packet-inspector")).not.toContainText(/wr_id/i);

    await page.getByRole("button", { name: /D · RDMA READ/i }).click();
    await expect(page.getByRole("heading", { name: /One-Sided RDMA: Reading Remote Memory/i })).toBeVisible();
    expect(page.url()).toContain("experiment=read");
    await selectStep(page, /READ Request packet asks the source transport for data/i);
    const readRequest = readExperiment.packets[0];
    await expect(page.getByTestId("packet-inspector")).toContainText(readRequest.destinationQpn.hex);
    await selectStep(page, /Responder transport returns READ Response Only/i);
    const readResponse = readExperiment.packets[1];
    await expect(page.getByTestId("packet-inspector")).toContainText(/READ response Only/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(readResponse.destinationQpn.hex);
    await expect(page.getByText(/did not post a send WR for this response/i).first()).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("resources experiment explains the intentional absence of a data capture", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma?experiment=resources", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByRole("heading", { name: /From Python Objects to RDMA Resources/i })).toBeVisible();
    await expect(page.getByText(/RESET/i).first()).toBeVisible();
    await expect(page.getByText(/No data work request was posted/i).first()).toBeVisible();
    await expect(page.getByText(/No RDMA data-transfer packets were produced/i)).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("capture downloads are reachable and byte-identical in size to the committed assets", async ({ page, request }) => {
    await page.goto("/practical/rdma?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    const downloadLinks = page.locator("a[download]", { hasText: /Download/i });
    await expect(downloadLinks.first()).toBeVisible();
    for (const capture of ["send-recv.pcap", "rdma-write.pcap", "rdma-read.pcap"]) {
      const response = await request.get(`/practical/rdma/${capture}`);
      expect(response.ok()).toBeTruthy();
      const body = await response.body();
      const committed = readFileSync(path.resolve(process.cwd(), "public/practical/rdma", capture));
      expect(body.length).toBe(committed.length);
    }
  });

  test("mobile layout remains usable without page-level horizontal scrolling", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/practical/rdma?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByRole("heading", { name: /One-Sided RDMA: Writing Directly Into Remote Memory/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await selectStep(page, /RDMA WRITE Only packet crosses UDP\/4791/i);
    await expect(page.getByTestId("packet-inspector")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expectNoBrowserErrors(tracker);
  });
});
