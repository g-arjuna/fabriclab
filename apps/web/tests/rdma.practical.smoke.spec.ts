import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const evidence = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "public/practical/rdma/reference-evidence.json"), "utf8"),
);
const writeExperiment = evidence.experiments.find((experiment: any) => experiment.id === "write");
const sendRecvExperiment = evidence.experiments.find((experiment: any) => experiment.id === "send-recv");
const readExperiment = evidence.experiments.find((experiment: any) => experiment.id === "read");

const writeWr = writeExperiment.workRequests.find((request: any) => request.kind === "rdma-write");
const writeCqe = writeExperiment.completions.find((completion: any) => completion.host === "hosta");
const writeRequestPacket = writeExperiment.packets[0];
const writeAckPacket = writeExperiment.packets[1];
const sendWr = sendRecvExperiment.workRequests.find((request: any) => request.host === "hosta");
const recvWr = sendRecvExperiment.workRequests.find((request: any) => request.host === "hostb");
const sendCqe = sendRecvExperiment.completions.find((completion: any) => completion.host === "hosta");
const recvCqe = sendRecvExperiment.completions.find((completion: any) => completion.host === "hostb");
const readWr = readExperiment.workRequests[0];
const readCqe = readExperiment.completions[0];
const readRequestPacket = readExperiment.packets[0];
const readResponsePacket = readExperiment.packets[1];

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
  await expect(page.getByTestId("rdma-practical")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
}

async function selectStep(page: Page, title: RegExp) {
  await waitForPracticalHydration(page);
  await page.getByRole("button", { name: title }).click();
}

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

test.describe("RDMA practical public experience", () => {
  test("practical landing page loads publicly and links to the RDMA replay", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /RDMA From First Principles/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Start learning$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Open advanced execution explorer/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Start with RDMA WRITE/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Begin with resources/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Practical$/i }).first()).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("reference evidence asset is publicly available, complete and explicitly provenanced", async ({ request }) => {
    const response = await request.get("/practical/rdma/reference-evidence.json");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.schemaVersion).toBe(1);
    expect(body.source.validationStatus).toBe("pass");
    expect(body.provenance.evidenceDigest).toBe(evidence.provenance.evidenceDigest);
    expect(body.provenance.executionSourceCheckout).toBe(evidence.provenance.gitCommit);
    expect(body.provenance.sourceSnapshot.relationship).toBe("matches-verified-execution-source");
    expect(body.experiments.map((experiment: any) => experiment.id)).toEqual(["resources", "send-recv", "write", "read"]);
    expect(body.experiments.map((experiment: any) => experiment.packets.length)).toEqual([0, 2, 2, 2]);
  });

  test("WRITE memory, work request, completion and target-CQ state are revealed causally", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);

    await expect(page.getByRole("link", { name: /Open the runnable rdma-basics lab source/i })).toHaveAttribute("href", /a208af6ecf4e838d6d2c475ede366494de81a706/);
    await expect(page.getByTestId("write-memory-before")).toBeVisible();
    await expect(page.getByTestId("write-memory-after")).toHaveCount(0);
    await expect(page.getByTestId("write-memory-after-pending")).toBeVisible();
    await expect(page.getByTestId("write-memory-state-label")).toContainText(/guided state: before/i);
    await expect(page.getByTestId("no-work-requests-reached")).toBeVisible();
    await expect(page.getByTestId("no-completions-reached")).toBeVisible();
    await expect(page.getByTestId("write-target-cqe-pending")).toBeVisible();
    await expect(page.locator(`[data-work-request-id="${writeWr.id}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-completion-id="${writeCqe.id}"]`)).toHaveCount(0);

    await selectStep(page, /Writer posts one RDMA WRITE work request/i);
    await expect(page.locator(`[data-work-request-id="${writeWr.id}"]`)).toBeVisible();
    await expect(page.getByTestId("write-memory-after")).toHaveCount(0);
    await expect(page.getByTestId("write-memory-state-label")).toContainText(/guided state: before/i);
    await expect(page.locator(`[data-completion-id="${writeCqe.id}"]`)).toHaveCount(0);

    await selectStep(page, /RDMA WRITE Only packet crosses UDP\/4791/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(writeRequestPacket.opcodeName);
    await expect(page.getByTestId("packet-inspector")).toContainText(writeRequestPacket.reth.virtualAddress.hex);
    await expect(page.getByTestId("packet-inspector")).toContainText(writeRequestPacket.reth.rkey.hex);
    await expect(page.getByTestId("packet-inspector")).toContainText(`${writeRequestPacket.reth.dmaLength.decimal} bytes`);
    await expect(page.getByTestId("write-memory-after")).toHaveCount(0);

    await selectStep(page, /Remote memory changes without a receive WR/i);
    await expect(page.getByTestId("write-memory-after")).toBeVisible();
    await expect(page.getByTestId("write-memory-state-label")).toContainText(/guided state: after/i);
    await expect(page.getByTestId("write-verification-pending")).toBeVisible();
    await expect(page.getByTestId("write-verification-result")).toHaveCount(0);
    await expect(page.getByTestId("write-verification-pending")).toContainText(/Application verification was recorded later/i);
    const changedByteCount = await page.getByTestId("write-memory-after").locator("span").evaluateAll(
      (spans) => spans.filter((span) => span.className.includes("bg-emerald-400/25")).length,
    );
    expect(changedByteCount).toBeGreaterThan(0);

    await selectStep(page, /ACK returns and writer completion is local/i);
    await expect(page.locator(`[data-completion-id="${writeCqe.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-completion-id="${writeCqe.id}"]`)).toContainText(/Host A/i);
    await expect(page.getByTestId("write-verification-pending")).toBeVisible();
    await expect(page.getByTestId("write-verification-result")).toHaveCount(0);
    await expect(page.getByTestId("write-target-cqe-pending")).toBeVisible();
    expect(writeExperiment.completions.some((completion: any) => completion.host === "hostb")).toBe(false);

    await selectStep(page, /Separate synchronisation lets the target verify memory/i);
    await expect(page.getByTestId("write-verification-result")).toContainText(/payloadOk=true/i);
    await expect(page.getByTestId("write-verification-result")).toContainText(/targetCqeCount=0/i);
    await expect(page.getByTestId("write-no-target-cqe")).toContainText(/observed 0 target CQEs/i);
    await expect(page.getByText(/Separate synchronisation/i).first()).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("inspect full recording is explicit and separate from guided causal replay", async ({ page }) => {
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.locator(`[data-completion-id="${writeCqe.id}"]`)).toHaveCount(0);

    await page.getByTestId("inspect-full-recording-toggle").click();
    await expect(page.getByTestId("selection-mode")).toContainText(/Inspect full recording/i);
    await expect(page.getByTestId("packet-inspection-mode")).toContainText(/independent recorded artifacts/i);
    await expect(page.locator(`[data-work-request-id="${writeWr.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-completion-id="${writeCqe.id}"]`)).toBeVisible();
    await expect(page.getByTestId("write-memory-after")).toBeVisible();
    await expect(page.getByTestId("write-memory-state-label")).toContainText(/inspecting full recording/i);

    await page.getByTestId("inspect-full-recording-toggle").click();
    await expect(page.getByTestId("selection-mode")).toContainText(/Guided causal step/i);
    await expect(page.locator(`[data-completion-id="${writeCqe.id}"]`)).toHaveCount(0);
    await expect(page.getByTestId("write-memory-after")).toHaveCount(0);
  });

  test("selecting the WRITE posting event correlates WR, packet exchange, memory and code context", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await selectStep(page, /Writer posts one RDMA WRITE work request/i);

    const postEvent = writeExperiment.events.find((event: any) => event.type === "post_send" && event.host === "hosta");
    await page.locator(`[data-event-id="${postEvent.id}"]`).click();
    await expect(page.getByTestId("selection-mode")).toContainText(/Application event correlation · post_send on Host A/i);
    await expect(page.getByTestId("selection-work-requests")).toContainText(`wr_id ${writeWr.wrId.hex}`);
    await expect(page.getByTestId("selection-packets")).toContainText(`frame ${writeRequestPacket.frameNumber}`);
    await expect(page.getByTestId("selection-memory")).toContainText(writeExperiment.endpoints.responder.memoryRegion.address.hex);
    await expect(page.getByTestId("selection-code-context")).toContainText(/Build and post RDMA WRITE/i);
    await expect(page.locator(`[data-work-request-id="${writeWr.id}"]`)).toHaveClass(/border-cyan/);

    const highlightedLines = await page.locator('[data-highlighted="true"]').allTextContents();
    expect(highlightedLines.join("\n")).toContain("post_send");
    expectNoBrowserErrors(tracker);
  });

  test("packet reverse correlation identifies WR, memory, completion and independent inspection mode", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await selectStep(page, /RDMA WRITE Only packet crosses UDP\/4791/i);

    await expect(page.getByTestId("selection-packets")).toContainText(`frame ${writeRequestPacket.frameNumber}`);
    await expect(page.getByTestId("selection-work-requests")).toContainText(`wr_id ${writeWr.wrId.hex}`);
    await expect(page.getByTestId("selection-memory")).toContainText(writeExperiment.endpoints.responder.memoryRegion.address.hex);
    await expect(page.locator(`[data-work-request-id="${writeWr.id}"]`)).toHaveClass(/border-cyan/);

    await page.locator(`[data-packet-id="${writeAckPacket.id}"]`).click();
    await expect(page.getByTestId("packet-inspection-mode")).toContainText(/Independent recorded artifact inspection/i);
    await expect(page.getByTestId("selection-completions")).toContainText(/Host A · SUCCESS/i);
    await expect(page.getByTestId("selection-work-requests")).toContainText(`wr_id ${writeWr.wrId.hex}`);

    await selectStep(page, /ACK returns and writer completion is local/i);
    await expect(page.getByTestId("packet-inspection-mode")).toHaveCount(0);
    await expect(page.getByTestId("packet-inspector")).toContainText(/Acknowledge/i);
    await expect(page.locator(`[data-completion-id="${writeCqe.id}"]`)).toHaveClass(/border-lime/);
    expectNoBrowserErrors(tracker);
  });


  test("control and receive-posting event selection does not invent network packets", async ({ page }) => {
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await selectStep(page, /Target shares address and RKEY/i);
    const metadataEvent = writeExperiment.events.find((event: any) => event.type === "metadata_exchange" && event.host === "hostb");
    await page.locator(`[data-event-id="${metadataEvent.id}"]`).click();
    await expect(page.getByTestId("selection-mode")).toContainText(/Application event correlation · metadata_exchange on Host B/i);
    await expect(page.getByTestId("selection-packets")).toContainText(/none supported by evidence/i);
    await expect(page.getByTestId("selection-memory")).toContainText(writeExperiment.endpoints.responder.memoryRegion.address.hex);
    await expect(page.getByText(/Metadata and synchronisation only\. No payload and no control packets/i).first()).toBeVisible();

    await page.goto("/practical/rdma/explorer?experiment=send-recv", { waitUntil: "domcontentloaded" });
    await selectStep(page, /Receiver posts a receive work request/i);
    const postRecvEvent = sendRecvExperiment.events.find((event: any) => event.type === "post_recv" && event.host === "hostb");
    await page.locator(`[data-event-id="${postRecvEvent.id}"]`).click();
    await expect(page.getByTestId("selection-mode")).toContainText(/Application event correlation · post_recv on Host B/i);
    await expect(page.getByTestId("selection-work-requests")).toContainText(`wr_id ${recvWr.wrId.hex}`);
    await expect(page.getByTestId("selection-packets")).toContainText(/none supported by evidence/i);
  });

  test("completion selection explains local ownership and does not fabricate WRITE target completion", async ({ page }) => {
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await selectStep(page, /ACK returns and writer completion is local/i);
    await page.locator(`[data-completion-id="${writeCqe.id}"]`).click();
    await expect(page.getByTestId("selection-mode")).toContainText(/Completion correlation · RDMA write on Host A \(initiator\)/i);
    await expect(page.getByTestId("selection-completions")).toContainText(/Host A · SUCCESS/i);
    await expect(page.getByTestId("selection-work-requests")).toContainText(`wr_id ${writeWr.wrId.hex}`);
    await expect(page.getByTestId("selection-packets")).toContainText(`frame ${writeAckPacket.frameNumber}`);
    await expect(page.getByText(/completion ownership remains local/i).first()).toBeVisible();
    await expect(page.getByText(/normal target receive CQE/i).first()).toBeVisible();
  });


  test("event and completion selection cannot retain a different manually inspected packet", async ({ page }) => {
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await selectStep(page, /ACK returns and writer completion is local/i);

    await page.locator(`[data-packet-id="${writeRequestPacket.id}"]`).click();
    await expect(page.getByTestId("packet-inspection-mode")).toContainText(/Independent recorded artifact inspection/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(/RDMA WRITE Only/i);

    const cqeEvent = writeExperiment.events.find((event: any) => event.type === "cqe" && event.host === "hosta");
    await page.locator(`[data-event-id="${cqeEvent.id}"]`).click();
    await expect(page.getByTestId("selection-mode")).toContainText(/Application event correlation · cqe on Host A/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(/Acknowledge/i);
    await expect(page.getByTestId("packet-inspector")).not.toContainText(/RDMA WRITE Only/i);
    await expect(page.getByTestId("packet-inspection-mode")).toHaveCount(0);
    await expect(page.getByTestId("selection-work-requests")).toContainText(`wr_id ${writeWr.wrId.hex}`);
    await expect(page.getByTestId("selection-completions")).toContainText(/Host A · SUCCESS/i);

    await page.locator(`[data-packet-id="${writeRequestPacket.id}"]`).click();
    await expect(page.getByTestId("packet-inspector")).toContainText(/RDMA WRITE Only/i);
    await page.locator(`[data-completion-id="${writeCqe.id}"]`).click();
    await expect(page.getByTestId("selection-mode")).toContainText(/Completion correlation · RDMA write on Host A \(initiator\)/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(/Acknowledge/i);
    await expect(page.getByTestId("packet-inspection-mode")).toHaveCount(0);
  });

  test("SEND/RECEIVE endpoint ownership and progressive completion state are correct", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma/explorer?experiment=send-recv", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByRole("heading", { name: /Two-Sided RDMA: SEND and RECEIVE/i })).toBeVisible();

    await selectStep(page, /Receiver posts a receive work request/i);
    await expect(page.locator(`[data-work-request-id="${recvWr.id}"]`)).toContainText(/Host B/i);
    await expect(page.locator(`[data-work-request-id="${sendWr.id}"]`)).toHaveCount(0);
    await expect(page.getByTestId("selection-packets")).toContainText(/none supported by evidence/i);
    await expect(page.locator('[data-memory-region-id="b:memory:hostb"]')).toHaveAttribute("data-memory-state", "before");
    await expect(page.locator('[data-memory-region-id="b:memory:hostb"]')).not.toContainText(/Verification:/i);

    await selectStep(page, /Sender posts a signalled SEND/i);
    await expect(page.locator(`[data-work-request-id="${sendWr.id}"]`)).toContainText(/Host A/i);
    await expect(page.getByTestId("no-completions-reached")).toBeVisible();

    await selectStep(page, /Receiver memory and receive completion/i);
    await expect(page.locator(`[data-completion-id="${recvCqe.id}"]`)).toContainText(/Host B/i);
    await expect(page.locator(`[data-completion-id="${sendCqe.id}"]`)).toHaveCount(0);
    await expect(page.locator('[data-memory-region-id="b:memory:hostb"]')).toHaveAttribute("data-memory-state", "after");
    await expect(page.locator('[data-memory-region-id="b:memory:hostb"]')).toContainText(/Verification: byteLength=50/i);

    await selectStep(page, /ACK returns; sender completion is local/i);
    await expect(page.locator(`[data-completion-id="${sendCqe.id}"]`)).toContainText(/Host A/i);
    await expect(page.getByTestId("packet-inspector")).not.toContainText(/wr_id/i);
    expectNoBrowserErrors(tracker);
  });

  test("READ request and response direction, QPNs, completion and no source SEND are correct", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma/explorer?experiment=read", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByRole("heading", { name: /One-Sided RDMA: Reading Remote Memory/i })).toBeVisible();

    await selectStep(page, /READ Request packet asks the source transport for data/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(readRequestPacket.opcodeName);
    await expect(page.getByTestId("packet-inspector")).toContainText(readExperiment.endpoints.responder.qpn.hex);
    await expect(page.getByTestId("selection-work-requests")).toContainText(readWr.wrId.hex);
    await expect(page.locator(`[data-completion-id="${readCqe.id}"]`)).toHaveCount(0);

    await selectStep(page, /Responder transport returns READ Response Only/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(readResponsePacket.opcodeName);
    await expect(page.getByTestId("packet-inspector")).toContainText(readExperiment.endpoints.initiator.qpn.hex);
    await expect(page.getByText(/did not post a send WR for this response/i).first()).toBeVisible();
    await expect(page.locator('[data-memory-region-id="d:memory:hosta"]')).toHaveAttribute("data-memory-state", "before");
    await expect(page.locator('[data-memory-region-id="d:memory:hosta"]')).not.toContainText(/Verification:/i);

    await selectStep(page, /Reader completion and payload verification/i);
    await expect(page.locator(`[data-completion-id="${readCqe.id}"]`)).toContainText(/Host A/i);
    await expect(page.getByTestId("selection-completions")).toContainText(/Host A · SUCCESS/i);
    await expect(page.locator('[data-memory-region-id="d:memory:hosta"]')).toHaveAttribute("data-memory-state", "after");
    await expect(page.locator('[data-memory-region-id="d:memory:hosta"]')).toContainText(/Verification: check=payload_match · ok=true/i);
    expectNoBrowserErrors(tracker);
  });

  test("QP readiness and lifecycle milestones are not claimed before recorded setup evidence", async ({ page }) => {
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByTestId("qp-state-reset")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("qp-state-init")).toHaveAttribute("data-active", "false");
    await expect(page.getByTestId("qp-state-rtr")).toHaveAttribute("data-active", "false");
    await expect(page.getByTestId("qp-state-rts")).toHaveAttribute("data-active", "false");
    await expect(page.getByTestId("qp-lifecycle")).toContainText(/reached · resources created/i);
    await expect(page.getByTestId("qp-lifecycle")).toContainText(/not reached · QP ready at RTS/i);
    await expect(page.getByTestId("qp-state-explanation")).toContainText(/not claimed as separately timestamped/i);

    await selectStep(page, /Both queue pairs reach RTS/i);
    await expect(page.getByTestId("qp-state-init")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("qp-state-rtr")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("qp-state-rts")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("qp-lifecycle")).toContainText(/reached · QP ready at RTS/i);
  });

  test("navigation, restart, experiment switching, deep links and packet selection reset coherently", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await selectStep(page, /RDMA WRITE Only packet crosses UDP\/4791/i);
    await expect(page.getByTestId("packet-inspector")).toContainText(/RDMA WRITE Only/i);

    await page.getByTestId("rdma-practical").getByRole("button", { name: "Previous" }).click();
    await expect(page.getByText(/Step 4\/8/i)).toBeVisible();
    await expect(page.getByTestId("no-packet-at-step")).toBeVisible();

    await page.getByTestId("rdma-practical").getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/Step 5\/8/i)).toBeVisible();
    await expect(page.getByTestId("packet-inspector")).toContainText(/RDMA WRITE Only/i);

    await page.locator(`[data-packet-id="${writeAckPacket.id}"]`).click();
    await expect(page.getByTestId("packet-inspection-mode")).toBeVisible();
    await page.getByTestId("rdma-practical").getByRole("button", { name: "Restart" }).click();
    await expect(page.getByText(/Step 1\/8/i)).toBeVisible();
    await expect(page.getByTestId("no-packet-at-step")).toBeVisible();
    await expect(page.getByTestId("packet-inspection-mode")).toHaveCount(0);

    await selectStep(page, /RDMA WRITE Only packet crosses UDP\/4791/i);
    await page.getByRole("button", { name: /D · RDMA READ/i }).click();
    await expect(page).toHaveURL(/experiment=read/);
    await expect(page.getByText(/Step 1\/7/i)).toBeVisible();
    await expect(page.getByTestId("no-packet-at-step")).toBeVisible();
    await expect(page.getByTestId("packet-inspector")).not.toContainText(/RDMA WRITE Only/i);

    await page.goto("/practical/rdma/explorer?experiment=send-recv", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Two-Sided RDMA: SEND and RECEIVE/i })).toBeVisible();
    expectNoBrowserErrors(tracker);
  });

  test("playback controls and keyboard navigation work without hijacking interactive controls", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByText(/Step 1\/8/i)).toBeVisible();
    const firstHighlightedLine = await page.locator('[data-highlighted="true"]').first().getAttribute("data-line-number");
    expect(firstHighlightedLine).toBeTruthy();

    await page.getByTestId("rdma-practical").getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/Step 2\/8/i)).toBeVisible();
    const secondHighlightedLine = await page.locator('[data-highlighted="true"]').first().getAttribute("data-line-number");
    expect(secondHighlightedLine).toBeTruthy();
    expect(secondHighlightedLine).not.toEqual(firstHighlightedLine);

    await page.getByTestId("rdma-practical").getByRole("button", { name: "Play" }).click();
    await expect(page.getByTestId("rdma-practical").getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect(page.getByText(/Step 3\/8/i)).toBeVisible({ timeout: 5000 });
    await page.getByTestId("rdma-practical").getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByTestId("rdma-practical").getByRole("button", { name: "Play", exact: true })).toBeVisible();

    await page.getByTestId("rdma-practical").getByRole("button", { name: "Next" }).focus();
    const stepBeforeControlArrow = await page.getByText(/Step \d+\/8/i).textContent();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(new RegExp(stepBeforeControlArrow!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/Step 4\/8/i)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/Step 3\/8/i)).toBeVisible();

    await page.getByLabel(/Playback speed/i).selectOption("2");
    await expect(page.getByLabel(/Playback speed/i)).toHaveValue("2");
    await page.getByTestId("rdma-practical").getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("rdma-practical").getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect(page.getByText(/Step 1\/8/i)).toBeVisible();
    await page.getByTestId("rdma-practical").getByRole("button", { name: "Pause", exact: true }).click();
    expectNoBrowserErrors(tracker);
  });

  test("capture downloads are byte-identical by SHA-256 to the committed assets", async ({ page, request }) => {
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    const downloadLinks = page.locator("a[download]", { hasText: /Download/i });
    await expect(downloadLinks.first()).toBeVisible();
    for (const capture of ["send-recv.pcap", "rdma-write.pcap", "rdma-read.pcap"]) {
      const response = await request.get(`/practical/rdma/${capture}`);
      expect(response.ok()).toBeTruthy();
      const body = await response.body();
      const committed = readFileSync(path.resolve(process.cwd(), "public/practical/rdma", capture));
      expect(sha256(body)).toBe(sha256(committed));
    }
  });

  test("mobile layout, accessible labels, focus affordances and horizontal overflow are correct", async ({ page }) => {
    const tracker = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/practical/rdma/explorer?experiment=write", { waitUntil: "domcontentloaded" });
    await waitForPracticalHydration(page);
    await expect(page.getByRole("heading", { name: /One-Sided RDMA: Writing Directly Into Remote Memory/i })).toBeVisible();
    await expect(page.getByTestId("rdma-practical").getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByLabel(/Playback speed/i)).toBeVisible();
    await expect(page.getByRole("group", { name: /Select RDMA experiment/i })).toBeVisible();
    await expect(page.getByLabel(/Queue pair state transition/i)).toBeVisible();

    const nextClass = await page.getByTestId("rdma-practical").getByRole("button", { name: "Next" }).getAttribute("class");
    expect(nextClass).toContain("focus-visible:ring-2");
    await selectStep(page, /RDMA WRITE Only packet crosses UDP\/4791/i);
    await expect(page.getByTestId("packet-inspector")).toBeVisible();
    const selectedTab = page.locator(`[data-packet-id="${writeRequestPacket.id}"]`);
    await expect(selectedTab).toHaveAttribute("aria-selected", "true");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expectNoBrowserErrors(tracker);
  });
});
