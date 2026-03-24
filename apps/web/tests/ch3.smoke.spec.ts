import { expect, test } from "@playwright/test";

const chapterPath = "/learn/ch3-the-cli";
const expectedImageAlts = [
  "Illustration showing the same link appearing healthy from the DGX NIC side while the switch port is error-disabled.",
  "Illustration showing an operator reading the same fabric through separate DGX, leaf-switch, and ONYX terminal contexts.",
];

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
];

test("Chapter 3 smoke check passes without browser errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const seenImages = new Set<string>();
  let totalPages = 0;

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
    page.getByRole("heading", { name: /Chapter 3: The CLI.*Reading the Fabric/i }),
  ).toBeVisible();

  const partSummaryText = await getPartSummary().innerText();
  const totalMatch = partSummaryText.match(/^Part \d+ of (\d+)$/);
  expect(totalMatch, `Unexpected part summary: ${partSummaryText}`).not.toBeNull();
  totalPages = Number(totalMatch?.[1]);

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
