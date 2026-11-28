import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const chapterPath = "/learn/ch0-hardware-foundations";
const reviewDir = "../../docs/review/ch0";

async function openChapterPage(page: Page, pageNumber: number) {
  await page.goto(`${chapterPath}?page=${pageNumber}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("span").filter({ hasText: /^Part \d+ of \d+$/ }).first()).toBeVisible();
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

async function findPageWithAlt(page: Page, altPattern: RegExp) {
  const total = await totalChapterPages(page);
  for (let index = 0; index < total; index += 1) {
    await openChapterPage(page, index);
    if ((await page.getByAltText(altPattern).count()) > 0) return index;
  }
  throw new Error(`No chapter page contains image alt ${String(altPattern)}`);
}

async function shot(page: Page, name: string, fullPage = true) {
  mkdirSync(reviewDir, { recursive: true });
  await page.screenshot({ path: `${reviewDir}/${name}.png`, fullPage });
}

test("Chapter 0 technical statements and interactive remediation states", async ({ page }) => {
  test.setTimeout(120_000);

  const hostPage = await findPageContaining(page, "The host hardware path");
  await expect(page.getByText(/CPU involvement does not disappear/).first()).toBeVisible();
  await shot(page, "01-host-architecture");

  await findPageContaining(page, "70 × 10^9 parameters × 2 bytes = 140 GB");
  await expect(page.getByText(/bytes sent per rank = 2 × \(N − 1\) \/ N × S/).first()).toBeVisible();
  await expect(page.getByText(/27.890625 GB/).first()).toBeVisible();
  await shot(page, "02-allreduce-worked-example");

  await findPageContaining(page, "naming is a common source of confusion");
  await page.getByRole("button", { name: "Bandwidth comparison" }).click();
  await expect(page.getByText(/Compared consistently as aggregate bidirectional/).first()).toBeVisible();
  await shot(page, "03-direction-normalized-bandwidth");

  const amdPage = await findPageContaining(page, "1,075.2 GB/s");
  await expect(page.getByRole("button", { name: /Instinct MI325X platform/ })).toBeVisible();
  await page.getByRole("button", { name: /Instinct MI325X platform/ }).click();
  await expect(page.getByText(/896 GB\/s/).first()).toBeVisible();
  await shot(page, "04-amd-comparison");
  expect(amdPage).toBeGreaterThanOrEqual(0);

  await findPageContaining(page, "Packet loss and transport recovery");
  await page.getByRole("button", { name: /RDMA RC — recoverable loss/ }).click();
  await expect(page.getByText(/QP remains operational/).first()).toBeVisible();
  await shot(page, "05-rdma-recoverable-loss");
  await page.getByRole("button", { name: /RDMA RC — recovery exhausted/ }).click();
  await expect(page.getByText(/Completion error/).first()).toBeVisible();
  await shot(page, "06-rdma-unrecoverable-failure");

  await findPageContaining(page, "Entropy, ECMP, and flowlets");
  await expect(page.getByText(/burst or segment of packets within one flow/).first()).toBeVisible();
  await expect(page.getByText(/Distinct five-tuples can produce the same ECMP bucket/).first()).toBeVisible();
  await shot(page, "07-ecmp-flowlet-explanation");

  await findPageWithAlt(page, /Official NVIDIA DGX H100 system image/);
  await expect(page.getByAltText(/Official NVIDIA DGX H100 system image/)).toHaveCount(1);
  await shot(page, "08-dgx-hardware-anatomy");

  await findPageContaining(page, "Rail topology — three distinct cases");
  await page.getByRole("button", { name: /Same rail · same SU/ }).click();
  await expect(page.getByText(/can remain rail-local/).first()).toBeVisible();
  await shot(page, "09-rail-same-su");
  await page.getByRole("button", { name: /Same rail · different SUs/ }).click();
  await expect(page.getByText(/Scalable-unit boundaries require higher tiers/).first()).toBeVisible();
  await shot(page, "10-rail-cross-su");

  await findPageContaining(page, "Four functional networks");
  await expect(page.getByText(/Compute fabric/).first()).toBeVisible();
  await expect(page.getByText(/Out-of-band management/).first()).toBeVisible();
  await shot(page, "11-fabric-functions");

  await findPageContaining(page, "Checkpoint calculator");
  await expect(page.getByText(/140\.0 GB/).first()).toBeVisible();
  await expect(page.getByText(/1\.40 seconds/).first()).toBeVisible();
  await expect(page.getByText(/16,000 GPU-hours/).first()).toBeVisible();
  await shot(page, "12-checkpoint-calculator");

  await findPageContaining(page, "VPI-capable");
  await findPageWithAlt(page, /Official NVIDIA ConnectX-7/);
  await expect(page.getByAltText(/Official NVIDIA ConnectX-7/)).toHaveCount(1);
  await expect(page.getByText(/SKU- and firmware-dependent/).first()).toBeVisible();
  await shot(page, "13-connectx7-modes");
});

test("Chapter 0 has no horizontal overflow at representative widths", async ({ page }) => {
  test.setTimeout(120_000);
  const widths = [320, 360, 390, 430, 768, 1440];
  const total = await totalChapterPages(page);

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (let index = 0; index < total; index += 1) {
      await openChapterPage(page, index);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(metrics.scrollWidth, `horizontal overflow at ${width}px page ${index}`).toBeLessThanOrEqual(metrics.clientWidth + 1);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await openChapterPage(page, 0);
  await shot(page, "14-mobile-390-first-page");
});

test("Chapter 0 pagination and learner references remain available", async ({ page }) => {
  const total = await totalChapterPages(page);
  expect(total).toBeGreaterThan(8);
  await openChapterPage(page, total - 1);
  await expect(page.getByText(/Learner references/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /NVIDIA DGX H100\/H200 System User Guide/ }).first()).toBeVisible();
  await shot(page, "15-references-and-summary");
});
