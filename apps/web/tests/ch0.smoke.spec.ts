import { expect, test } from "@playwright/test";

const chapterPath = "/learn/ch0-hardware-foundations";
const imagePages = [
  {
    page: 7,
    alt: "Official NVIDIA BlueField-3 DPU image showing the physical DPU card form factor.",
  },
  {
    page: 8,
    alt: "Official NVIDIA DGX H100 system image.",
  },
  {
    page: 10,
    alt: "Official NVIDIA DGX SuperPOD H100 scalable unit rack layout diagram.",
  },
  {
    page: 12,
    alt: "Official NVIDIA ConnectX-7 SuperNIC image showing the adapter form factor discussed in the mode-selection section.",
  },
];

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
];

test("Chapter 0 smoke check passes without browser errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const partSummary = (pageNumber: number) =>
    page.locator("span").filter({ hasText: new RegExp(`^Part ${pageNumber} of 14$`) }).first();
  const openPage = async (pageNumber: number) => {
    await page.goto(`${chapterPath}?page=${pageNumber}`, { waitUntil: "domcontentloaded" });
    await expect(partSummary(pageNumber + 1)).toBeVisible();
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
    page.getByRole("heading", { name: "Chapter 0: How We Got Here — The Hardware Story" }),
  ).toBeVisible();

  for (let currentPage = 0; currentPage < 3; currentPage += 1) {
    await expect(partSummary(currentPage + 1)).toBeVisible();
    await page.getByRole("link", { name: /Next/i }).click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(new RegExp(`page=${currentPage + 1}$`));
    await expect(partSummary(currentPage + 2)).toBeVisible();
  }

  for (const imagePage of imagePages) {
    await openPage(imagePage.page);
    const image = page.getByAltText(imagePage.alt);
    await expect(image).toHaveCount(1);
    await expect(image.first()).toBeVisible();
  }

  for (let currentPage = 0; currentPage <= 13; currentPage += 1) {
    await openPage(currentPage);
  }

  expect(pageErrors, `Uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
});
