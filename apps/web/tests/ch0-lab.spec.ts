import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const reviewDir = "../../docs/review/ch0";

async function typeCommand(page: Page, command: string) {
  await page.locator(".xterm:visible").first().click();
  await page.keyboard.type(command, { delay: 5 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
}

test("Lab 0 failed rail can be diagnosed and completed with consistent host/switch layers", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/lab?lab=lab0-failed-rail", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Identify the failed rail" })).toBeVisible();
  await expect(page.getByRole("button", { name: /\[SIM ONLY\] Fabric inventory server/ })).toBeVisible();
  await expect(page.getByText(/Protodown\/linkflap/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /UFM Map/ })).toHaveCount(0);
  await page.waitForSelector(".xterm:visible", { timeout: 15_000 });

  await typeCommand(page, "show rail topology");
  await expect(page.getByText("Rail identified").first()).toBeVisible();

  await page.getByRole("button", { name: /DGX H100 Node A/ }).click();
  await page.waitForTimeout(300);
  await typeCommand(page, "rdma link show");
  await expect(page.getByText("Link state confirmed").first()).toBeVisible();

  await typeCommand(page, "ethtool -S eth3");
  await page.getByRole("button", { name: /Leaf Switch Rail 3/ }).click();
  await page.waitForTimeout(300);
  await typeCommand(page, "nv show interface swp5 link");

  await expect(page.getByText("Lab complete", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  mkdirSync(reviewDir, { recursive: true });
  await page.screenshot({ path: `${reviewDir}/16-failed-rail-lab-completion.png`, fullPage: true });
});
