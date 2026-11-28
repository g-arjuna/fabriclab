import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const chapterPath = "/learn/ch0-hardware-foundations";
const reviewDir = "../../docs/review/ch0";

test.use({ hasTouch: true });

async function openChapterPage(page: Page, pageNumber: number) {
  await page.goto(`${chapterPath}?page=${pageNumber}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("span").filter({ hasText: /^Part \d+ of \d+$/ }).first()).toBeVisible();
  await page.waitForTimeout(500);
}

async function totalChapterPages(page: Page) {
  await openChapterPage(page, 0);
  const text = await page.locator("span").filter({ hasText: /^Part \d+ of \d+$/ }).first().innerText();
  return Number(text.match(/of (\d+)$/)?.[1] ?? "0");
}

async function findPageContaining(page: Page, needle: string | RegExp) {
  const total = await totalChapterPages(page);
  for (let index = 0; index < total; index += 1) {
    await openChapterPage(page, index);
    const count = typeof needle === "string"
      ? await page.getByText(needle, { exact: false }).count()
      : await page.getByText(needle).count();
    if (count > 0) return index;
  }
  throw new Error(`No chapter page contains ${String(needle)}`);
}

async function shot(page: Page, name: string, testId?: string) {
  mkdirSync(reviewDir, { recursive: true });
  if (testId) await page.getByTestId(testId).screenshot({ path: `${reviewDir}/${name}.png` });
  else await page.screenshot({ path: `${reviewDir}/${name}.png`, fullPage: true });
}

async function expectNoOverflow(page: Page, width: number) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

test("host data paths separate payload movement from orchestration and NVLink uses two GPUs", async ({ page }) => {
  test.setTimeout(120_000);
  await openChapterPage(page, 1);
  const viz = page.getByTestId("host-hardware-path-viz");
  await expect(viz).toBeVisible();

  await expect(page.getByTestId("host-edge-pcie-ram")).toHaveAttribute("data-payload", "true");
  await expect(page.getByTestId("host-edge-pcie-gpu0")).toHaveAttribute("data-payload", "true");
  await expect(page.getByTestId("host-edge-cpu-nic")).toHaveAttribute("data-control", "true");
  await shot(page, "r2-01-conventional-host-staging", "host-hardware-path-viz");

  await page.getByRole("button", { name: /GPUDirect RDMA/ }).click();
  await expect(page.getByTestId("host-edge-pcie-ram")).toHaveAttribute("data-payload", "false");
  await expect(page.getByTestId("host-edge-pcie-gpu0")).toHaveAttribute("data-payload", "true");
  await expect(page.getByTestId("host-edge-cpu-nic")).toHaveAttribute("data-control", "true");
  await shot(page, "r2-02-gpudirect-rdma-no-bypass-wire", "host-hardware-path-viz");

  await page.getByRole("button", { name: /GPU-to-GPU NVLink/ }).click();
  await expect(page.getByTestId("host-edge-gpu0-nvlink")).toHaveAttribute("data-payload", "true");
  await expect(page.getByTestId("host-edge-nvlink-gpu1")).toHaveAttribute("data-payload", "true");
  await expect(page.getByTestId("host-edge-cpu-gpu0")).toHaveAttribute("data-control", "true");
  await shot(page, "r2-03-nvlink-two-gpus", "host-hardware-path-viz");
});

test("ring AllReduce example exposes partition, reduce-scatter, all-gather, and final states", async ({ page }) => {
  test.setTimeout(120_000);
  await openChapterPage(page, 2);
  await page.getByRole("button", { name: /Data parallelism/ }).click();
  await expect(page.getByTestId("ring-rank-0")).toHaveAttribute("data-stage", "partition");
  await expect(page.getByTestId("ring-rank-0")).toContainText("[1,2,3,4]");
  await page.getByRole("button", { name: "reduce-scatter" }).click();
  await expect(page.getByTestId("ring-rank-0")).toHaveAttribute("data-stage", "reduce-scatter");
  await expect(page.getByTestId("ring-rank-0")).toContainText("owns c1=32");
  await expect(page.getByTestId("ring-rank-3")).toContainText("owns c0=28");
  await page.getByRole("button", { name: "all-gather" }).click();
  await expect(page.getByTestId("ring-rank-0")).toHaveAttribute("data-stage", "all-gather");
  await expect(page.getByTestId("ring-rank-0")).toContainText("c1=32");
  await page.getByRole("button", { name: "final" }).click();
  for (let rank = 0; rank < 4; rank += 1) {
    await expect(page.getByTestId(`ring-rank-${rank}`)).toHaveAttribute("data-stage", "final");
    await expect(page.getByTestId(`ring-rank-${rank}`)).toContainText("[28,32,36,40]");
  }
  await shot(page, "r2-04-four-rank-allreduce-final", "training-parallelism-viz");
});

test("NVLink comparison uses one direction convention at a time and truthful bar geometry", async ({ page }) => {
  test.setTimeout(120_000);
  await openChapterPage(page, 3);
  await page.getByRole("button", { name: "Bandwidth comparison" }).click();

  await expect(page.getByText(/^450 GB\/s$/).first()).toBeVisible();
  await expect(page.getByText(/^50 GB\/s$/).first()).toBeVisible();
  await expect(page.getByText(/^63 GB\/s$/).first()).toBeVisible();
  const nvWidth = await page.getByTestId("bandwidth-bar-450").evaluate((el) => el.style.width);
  const extWidth = await page.getByTestId("bandwidth-bar-50").evaluate((el) => el.style.width);
  expect(Number.parseFloat(extWidth) / Number.parseFloat(nvWidth)).toBeCloseTo(50 / 450, 2);

  await page.getByRole("button", { name: "Aggregate bidirectional" }).click();
  await expect(page.getByText(/^900 GB\/s$/).first()).toBeVisible();
  await expect(page.getByText(/^100 GB\/s$/).first()).toBeVisible();
  await expect(page.getByText(/^126 GB\/s$/).first()).toBeVisible();
  await expect(page.getByText(/^50 GB\/s$/)).toHaveCount(0);
  await shot(page, "r2-13-direction-normalized-bandwidth", "nvlink-viz");

  await expect(page.getByText(/7\.2 TB\/s when the endpoint figures are summed/).first()).toBeVisible();
  await expect(page.getByText(/25\.6 Tb\/s|13\.6 Tb\/s/)).toHaveCount(0);
});

test("RDMA recovery visualization reconstructs each execution state instead of showing the future", async ({ page }) => {
  test.setTimeout(120_000);
  await openChapterPage(page, 5);
  await page.getByRole("button", { name: /RDMA RC — recoverable loss/ }).click();

  await expect(page.getByTestId("transport-state")).toContainText("QP state: RTS");
  await expect(page.getByTestId("packet-psn-102")).toHaveAttribute("data-state", "queued");
  await page.getByRole("button", { name: /^Next$/ }).click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.getByTestId("packet-psn-102")).toHaveAttribute("data-state", "missing");
  await shot(page, "r2-05-rdma-missing-packet", "packet-drop-cost-viz");
  await page.getByRole("button", { name: /^Next$/ }).click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.getByTestId("packet-psn-102")).toHaveAttribute("data-state", "retransmitting");
  await shot(page, "r2-06-rdma-retransmission", "packet-drop-cost-viz");
  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.getByTestId("packet-psn-102")).toHaveAttribute("data-state", "recovered");
  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.getByTestId("step-outcome")).toContainText("successful completion");
  await expect(page.getByTestId("transport-state")).toContainText("QP state: RTS");
  await shot(page, "r2-07-rdma-successful-recovery", "packet-drop-cost-viz");

  await page.getByRole("button", { name: /RDMA RC — transport retry exhaustion/ }).click();
  await expect(page.getByTestId("transport-state")).toContainText("QP state: RTS");
  for (let i = 0; i < 4; i += 1) await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.getByTestId("transport-state")).toContainText("retry-exceeded");
  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.getByTestId("transport-state")).toContainText("QP state: ERR");
  await shot(page, "r2-08-rdma-retry-exhaustion-qp-error", "packet-drop-cost-viz");

  await page.getByRole("button", { name: /TCP — segment loss and recovery/ }).click();
  await expect(page.getByTestId("packet-state-tcp-step-0")).toBeVisible();
  await expect(page.getByTestId("packet-seg-1460")).toContainText("SEQ 1460–1919");
  await expect(page.getByText(/sequence numbers identify byte positions/).first()).toBeVisible();
});

test("rail topology modes form valid graphs with destination leaves and distinct scalable units", async ({ page }) => {
  test.setTimeout(120_000);
  await openChapterPage(page, 12);

  await page.getByRole("button", { name: /Same rail · same SU/ }).click();
  await expect(page.getByTestId("edge-a-gpu-nic")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("edge-a-nic-leaf0")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("edge-leaf0-b-nic")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("node-leafA0")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("node-leafA1")).toHaveCount(0);
  await shot(page, "r2-09-rail-same-rail-same-su", "rail-topology-viz");

  await page.getByRole("button", { name: /Different rail · same SU/ }).click();
  await expect(page.getByTestId("edge-leaf0-spine")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("edge-spine-leaf1")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("edge-leaf1-b1-nic")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("node-leafA1")).toHaveAttribute("data-active", "true");
  await shot(page, "r2-10-rail-cross-rail-same-su", "rail-topology-viz");

  await page.getByRole("button", { name: /Same rail · different SUs/ }).click();
  await expect(page.getByTestId("edge-spine-leafb0")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("edge-leafb0-b-nic")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("node-leafB0")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("su-b-boundary")).toBeVisible();
  await expect(page.getByTestId("edge-leaf0-b-nic")).toHaveCount(0);
  await shot(page, "r2-11-rail-cross-su-destination-leaf", "rail-topology-viz");
});

test("fabric roles expose four distinct compute, storage, in-band, and out-of-band mappings", async ({ page }) => {
  test.setTimeout(120_000);
  await openChapterPage(page, 11);
  const roles = [
    { name: /Compute fabric/, evidence: /Eight single-port ConnectX-7 compute adapters/ },
    { name: /Storage fabric/, evidence: /Slot1 P1 and Slot2 P1/ },
    { name: /In-band management/, evidence: /Slot1 P2 and Slot2 P2/ },
    { name: /Out-of-band management/, evidence: /Dedicated 1GbE RJ45 BMC/ },
  ];
  for (const role of roles) {
    const button = page.getByRole("button", { name: role.name }).first();
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(role.evidence).first()).toBeVisible();
    await shot(page, `r2-12-fabric-${String(role.name).replace(/[^a-z]+/gi, "-").toLowerCase()}`, "full-wiring-viz");
  }
});

test("ECMP conserves offered load and flowlet mode demonstrates an actual boundary and path change", async ({ page }) => {
  test.setTimeout(120_000);
  await openChapterPage(page, 7);

  await expect(page.getByTestId("ecmp-offered-load")).toContainText("1,200 Gb/s");
  await expect(page.getByTestId("ecmp-total-capacity")).toContainText("1,600 Gb/s");
  await expect(page.getByTestId("ecmp-carried-capacity")).toContainText("1,000 Gb/s");
  await expect(page.getByTestId("ecmp-excess-offered")).toContainText("200 Gb/s");
  await shot(page, "r2-14-ecmp-consistent-offered-traffic", "ecmp-viz");

  await openChapterPage(page, 5);
  await page.getByRole("button", { name: "Sufficient flowlet gap" }).click();
  await expect(page.getByTestId("flowlet-timeline-sufficient")).toBeVisible();
  await expect(page.getByTestId("flowlet-packet-A4")).toHaveAttribute("data-path", "spine-3");
  await expect(page.getByText(/Packets 4–5 can form another flowlet/).first()).toBeVisible();
  const lowBarWidth = await page.getByTestId("flowlet-util-spine-2").evaluate((el) => el.style.width);
  expect(lowBarWidth).not.toContain("16%");
  await shot(page, "r2-15-flowlet-boundary-demonstration", "flowlet-viz");
});

test("checkpoint calculator recalculates distinct blocking and lost-progress costs when controls change", async ({ page }) => {
  test.setTimeout(120_000);
  await openChapterPage(page, 10);
  await expect(page.getByTestId("checkpoint-result-estimated-checkpoint-size")).toContainText("140.0 GB");
  await expect(page.getByTestId("checkpoint-result-idealized-transfer-duration")).toContainText("1.40 seconds");
  await expect(page.getByTestId("checkpoint-result-worst-case-lost-useful-work")).toContainText("16,000 GPU-hours");
  await shot(page, "r2-16-checkpoint-before-input-change", "checkpoint-cost-viz");

  await page.getByRole("button", { name: /FP32 · 4 bytes\/param/ }).click();
  await expect(page.getByTestId("checkpoint-result-estimated-checkpoint-size")).toContainText("280.0 GB");
  await expect(page.getByTestId("checkpoint-result-idealized-transfer-duration")).toContainText("2.80 seconds");

  await page.getByTestId("checkpoint-multiplier").fill("2");
  await expect(page.getByTestId("checkpoint-result-estimated-checkpoint-size")).toContainText("560.0 GB");
  await expect(page.getByTestId("checkpoint-result-idealized-transfer-duration")).toContainText("5.60 seconds");

  await page.getByTestId("checkpoint-bandwidth").fill("400");
  await expect(page.getByTestId("checkpoint-result-idealized-transfer-duration")).toContainText("11.20 seconds");
  await page.getByTestId("checkpoint-gpus").fill("15872");
  await expect(page.getByTestId("checkpoint-result-worst-case-lost-useful-work")).toContainText("7,936 GPU-hours");
  await page.getByTestId("checkpoint-interval").fill("60");
  await expect(page.getByTestId("checkpoint-result-worst-case-lost-useful-work")).toContainText("15,872 GPU-hours");
  await page.getByTestId("checkpoint-cost").fill("10");
  await expect(page.getByTestId("checkpoint-result-worst-case-financial-cost")).toContainText("$158.7K");
  await expect(page.getByTestId("checkpoint-result-blocking-financial-cost")).toBeVisible();
  await shot(page, "r2-17-checkpoint-after-input-change", "checkpoint-cost-viz");
});

test("learner navigation, mobile interaction, keyboard activation, and browser health remain sound", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openChapterPage(page, 0);
  const firstPart = await page.locator("span").filter({ hasText: /^Part \d+ of \d+$/ }).first().innerText();
  await page.getByRole("link", { name: /Next/ }).first().click();
  await expect(page.locator("span").filter({ hasText: /^Part 2 of \d+$/ }).first()).toBeVisible();
  await page.getByRole("link", { name: /Previous/ }).first().click();
  await expect(page.locator("span").filter({ hasText: new RegExp(`^${firstPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await openChapterPage(page, 0);
  await expectNoOverflow(page, 390);
  await shot(page, "r2-20-mobile-390-first-page");

  await page.setViewportSize({ width: 320, height: 760 });
  await openChapterPage(page, 0);
  await expectNoOverflow(page, 320);

  await openChapterPage(page, 1);
  const gpudirect = page.getByRole("button", { name: /GPUDirect RDMA/ });
  await gpudirect.focus();
  await expect(gpudirect).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(gpudirect).toHaveAttribute("aria-pressed", "true");
  await gpudirect.tap();
  await expectNoOverflow(page, 320);
  await shot(page, "r2-21-mobile-320-interactive-state", "host-hardware-path-viz");

  const total = await totalChapterPages(page);
  await openChapterPage(page, total - 1);
  await expect(page.getByRole("link", { name: /Open the lab environment/ })).toBeVisible();
  await expect(page.getByText(/Learner references/).first()).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((line) => !line.includes("favicon"))).toEqual([]);
});
