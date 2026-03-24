import { expect, test } from "@playwright/test";

const chapterPath = "/learn/ch2-why-different";
const expectedImageAlts = [
  "Illustration comparing how latency affects synchronized training versus independent inference requests.",
  "Illustration comparing TCP retransmit recovery with RDMA direct memory transfer over a lossless fabric.",
];

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
];

test("Chapter 2 rewrite smoke check passes without browser errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let totalPages = 0;
  let sawAllReduceViz = false;
  let sawTailLatencyViz = false;
  let sawWhatYouNowKnow = false;
  let sawContinueLink = false;
  const seenImages = new Set<string>();

  const getPartSummary = () =>
    page
      .locator("span")
      .filter({ hasText: /^Part \d+ of \d+$/ })
      .first();

  const openPage = async (pageNumber: number) => {
    await page.goto(`${chapterPath}?page=${pageNumber}`, { waitUntil: "domcontentloaded" });
    await expect(getPartSummary()).toBeVisible();
  };

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();
    if (allowedConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }

    consoleErrors.push(text);
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await openPage(0);
  await expect(
    page.getByRole("heading", { name: "Chapter 2: Why HPC Networking Is Different" }),
  ).toBeVisible();

  const partSummaryText = await getPartSummary().innerText();
  const totalMatch = partSummaryText.match(/^Part \d+ of (\d+)$/);
  expect(totalMatch, `Unexpected part summary: ${partSummaryText}`).not.toBeNull();
  totalPages = Number(totalMatch?.[1]);

  for (let currentPage = 0; currentPage < totalPages; currentPage += 1) {
    await openPage(currentPage);

    const allReduceButton = page.getByRole("button", { name: /Run simulation|Replay/i });
    if ((await allReduceButton.count()) > 0) {
      await expect(allReduceButton.first()).toBeVisible();
      sawAllReduceViz = true;
    }

    const rangeInputs = page.locator('input[type="range"]');
    if ((await rangeInputs.count()) === 3) {
      await expect(page.locator('input[type="range"]')).toHaveCount(3);
      await expect(page.getByText(/Tail Latency/i).first()).toBeVisible();
      sawTailLatencyViz = true;
    }

    const whatYouNowKnowHeading = page.getByRole("heading", { name: "What you now know" });
    if ((await whatYouNowKnowHeading.count()) > 0) {
      await expect(whatYouNowKnowHeading).toBeVisible();
      sawWhatYouNowKnow = true;
    }

    const continueLink = page.getByRole("link", { name: /Continue to Chapter 3/i });
    if ((await continueLink.count()) > 0) {
      await expect(continueLink).toHaveAttribute("href", "/learn/ch3-the-cli");
      sawContinueLink = true;
    }

    for (const alt of expectedImageAlts) {
      const image = page.getByAltText(alt);
      if ((await image.count()) > 0 && (await image.first().isVisible())) {
        seenImages.add(alt);
      }
    }
  }

  expect(sawAllReduceViz).toBe(true);
  expect(sawTailLatencyViz).toBe(true);
  expect(sawWhatYouNowKnow).toBe(true);
  expect(sawContinueLink).toBe(true);
  expect([...seenImages].sort()).toEqual([...expectedImageAlts].sort());
  expect(pageErrors, `Uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
});
