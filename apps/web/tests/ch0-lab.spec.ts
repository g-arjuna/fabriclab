import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const reviewDir = "../../docs/review/ch0";

async function openLab(page: Page) {
  await page.goto("/lab?lab=lab0-failed-rail", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Identify the failed rail" })).toBeVisible();
  await page.waitForSelector(".xterm:visible", { timeout: 15_000 });
}

async function selectDevice(page: Page, pattern: RegExp) {
  await page.getByRole("button", { name: pattern }).click();
  await page.waitForTimeout(250);
}

async function typeCommand(page: Page, command: string) {
  await page.locator(".xterm:visible").first().click();
  await page.keyboard.type(command, { delay: 3 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
}

async function expectConditionMet(page: Page, label: string, met: boolean) {
  const item = page.locator("li").filter({ hasText: label }).first();
  await expect(item).toBeVisible();
  const className = await item.getAttribute("class");
  if (met) expect(className).toContain("emerald");
  else expect(className).not.toContain("emerald");
}

async function completeIntendedWorkflow(page: Page) {
  await typeCommand(page, "show rail topology");
  await expectConditionMet(page, "Rail identified", true);

  await selectDevice(page, /DGX H100 Node A/);
  await typeCommand(page, "rdma link show");
  await expectConditionMet(page, "RDMA port evidence inspected", true);
  mkdirSync(reviewDir, { recursive: true });
  await page.screenshot({ path: `${reviewDir}/r2-17-lab0-host-rdma-evidence.png`, fullPage: true });
  await typeCommand(page, "ethtool -S eth3");
  await expectConditionMet(page, "NIC counter evidence inspected", true);
  await page.screenshot({ path: `${reviewDir}/r2-18-lab0-host-nic-evidence.png`, fullPage: true });

  await selectDevice(page, /Leaf Switch Rail 3/);
  await typeCommand(page, "nv show interface swp5 link");
  await expectConditionMet(page, "Fault isolated to switch port", true);
  await page.screenshot({ path: `${reviewDir}/r2-19-lab0-switch-fault-evidence.png`, fullPage: true });
}

test("Lab 0 intended solution requires correlated host, NIC, inventory, and switch evidence", async ({ page }) => {
  test.setTimeout(90_000);
  await openLab(page);

  await expect(page.getByText(/87\.5%|exactly 7\/8|application throughput falls by 12\.5%/i)).toHaveCount(0);
  await expect(page.getByText(/Protodown\/linkflap/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /UFM Map/ })).toHaveCount(0);

  await completeIntendedWorkflow(page);
  await expect(page.getByText("Lab complete", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Fault identified and isolated\. Recovery and application restart are separate operational steps\./)).toBeVisible();

  mkdirSync(reviewDir, { recursive: true });
  await page.screenshot({ path: `${reviewDir}/16-failed-rail-lab-completion.png`, fullPage: true });
});

test("Lab 0 negative paths do not grant unrelated completion evidence", async ({ page }) => {
  test.setTimeout(120_000);
  await openLab(page);

  // Repeating one diagnostic cannot satisfy unrelated evidence categories.
  await selectDevice(page, /DGX H100 Node A/);
  await typeCommand(page, "rdma link show");
  await typeCommand(page, "rdma link show");
  await expectConditionMet(page, "RDMA port evidence inspected", true);
  await expectConditionMet(page, "Rail identified", false);
  await expectConditionMet(page, "NIC counter evidence inspected", false);
  await expectConditionMet(page, "Fault isolated to switch port", false);
  await expect(page.getByText("Lab complete", { exact: false })).toHaveCount(0);

  // Inspecting a healthy rail does not isolate the fault.
  await typeCommand(page, "rdma link show mlx5_0");
  await typeCommand(page, "ethtool -i eth0");
  await selectDevice(page, /Leaf Switch Rail 0/);
  await typeCommand(page, "nv show interface swp5 link");
  await expectConditionMet(page, "Fault isolated to switch port", false);
  await expect(page.getByText("Lab complete", { exact: false })).toHaveCount(0);

  // The correct switch port without mandatory host-side evidence cannot complete the lab.
  await selectDevice(page, /Leaf Switch Rail 3/);
  await typeCommand(page, "nv show interface swp5 link");
  await expect(page.getByText("Lab complete", { exact: false })).toHaveCount(0);

  // Commands are gated by device role rather than accepted merely because they exist in the lab catalog.
  await selectDevice(page, /DGX H100 Node A/);
  await typeCommand(page, "nv show interface swp5 link");
  await expect(page.getByText(/Command not available on this device|Try:/).last()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Lab complete", { exact: false })).toHaveCount(0);
});

test("Lab 0 completion reset clears diagnostic evidence", async ({ page }) => {
  test.setTimeout(90_000);
  await openLab(page);
  await completeIntendedWorkflow(page);
  await expect(page.getByText("Lab complete", { exact: false }).first()).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Lab complete", { exact: false })).toHaveCount(0);
  await expectConditionMet(page, "Rail identified", false);
  await expectConditionMet(page, "RDMA port evidence inspected", false);
  await expectConditionMet(page, "NIC counter evidence inspected", false);
  await expectConditionMet(page, "Fault isolated to switch port", false);
});
