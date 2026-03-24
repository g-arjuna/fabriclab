import { expect, test } from "@playwright/test";

const chapterPath = "/learn/ch4-infiniband-operations";
const expectedImageAlts = [
  "Illustration comparing QM9700 front-panel micro-USB console access with Q3400 RJ45 serial console access.",
  "Official NVIDIA UFM network map screenshot showing a selected switch and its nearby fabric links.",
];

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
];

test("Chapter 4 smoke check passes without browser errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
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
    page.getByRole("heading", { name: /Chapter 4: InfiniBand Operations/i }),
  ).toBeVisible();

  const partSummaryText = await getPartSummary().innerText();
  const totalMatch = partSummaryText.match(/^Part \d+ of (\d+)$/);
  expect(totalMatch, `Unexpected part summary: ${partSummaryText}`).not.toBeNull();
  const totalPages = Number(totalMatch?.[1]);

  for (let currentPage = 0; currentPage < Math.min(totalPages - 1, 3); currentPage += 1) {
    await expect(getPartSummary()).toContainText(`Part ${currentPage + 1} of ${totalPages}`);
    await page.getByRole("link", { name: /Next/i }).click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(new RegExp(`page=${currentPage + 1}$`));
    await expect(getPartSummary()).toContainText(`Part ${currentPage + 2} of ${totalPages}`);
  }

  for (let currentPage = 0; currentPage < totalPages; currentPage += 1) {
    await openPage(currentPage);

    for (const alt of expectedImageAlts) {
      const image = page.getByAltText(alt);
      if ((await image.count()) > 0 && (await image.first().isVisible())) {
        seenImages.add(alt);
      }
    }
  }

  expect([...seenImages].sort()).toEqual([...expectedImageAlts].sort());
  expect(pageErrors, `Uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
});
