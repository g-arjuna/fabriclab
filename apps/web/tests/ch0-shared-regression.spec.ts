import { expect, test, type Page } from "@playwright/test";

async function openLab(page: Page, labId: string, heading: RegExp) {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto(`/lab?lab=${labId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await page.waitForSelector(".xterm:visible", { timeout: 15_000 });
}

async function selectDevice(page: Page, pattern: RegExp) {
  await page.getByRole("button", { name: pattern }).click();
  await page.waitForTimeout(200);
}

async function typeCommand(page: Page, command: string) {
  await page.locator(".xterm:visible").first().click();
  await page.keyboard.type(command, { delay: 2 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(450);
}

async function terminalText(page: Page) {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".xterm-rows")).find(
      (node) => window.getComputedStyle(node).visibility !== "hidden",
    );
    return rows?.innerText ?? "";
  });
}

test.describe("Chapter 0 shared simulator regression", () => {
  test("lab0a keeps the legacy UFM orientation workflow and healthy rail output", async ({ page }) => {
    await openLab(page, "lab0a-fabric-cli-orientation", /Fabric CLI orientation/i);

    await selectDevice(page, /UFM Server/);
    await typeCommand(page, "show ufm topology");
    let text = await terminalText(page);
    expect(text).toContain("DGX endpoint:    dgx-node-01 mlx5_1 / eth1");
    expect(text).toContain("Switch endpoint: leaf-rail1 swp1");
    expect(text).not.toContain("[SIMULATED FABRIC INVENTORY");

    await selectDevice(page, /DGX Node 01/);
    await typeCommand(page, "ibstat");
    text = await terminalText(page);
    expect(text).toContain("State: Active");
    expect(text).toContain("Port GUID: 0x506b4b0300a1b201");
    expect(text).not.toContain("[SIMULATED ibstat output");

    await typeCommand(page, "rdma link show");
    text = await terminalText(page);
    expect(text).toContain("link mlx5_0/1 state ACTIVE physical_state LINK_UP");
    expect(text).toContain("netdev eth1");
  });

  test("lab9 preserves the active-host/protodown-switch trap and legacy command behavior", async ({ page }) => {
    await openLab(page, "lab9-errdisable-recovery", /Recover the err-disabled rail/i);

    await selectDevice(page, /DGX H100 Node A/);
    await typeCommand(page, "ibstat");
    let text = await terminalText(page);
    expect(text).toContain("Physical state: LinkUp");
    expect(text).toContain("host can retain carrier while the switch-side interface is protodown");

    await typeCommand(page, "rdma link show");
    text = await terminalText(page);
    expect(text).toContain("Rail 2 reports active/LINK_UP");
    expect(text).toContain("host output alone cannot prove end-to-end connectivity");

    await selectDevice(page, /UFM Server/);
    await typeCommand(page, "show ufm topology");
    text = await terminalText(page);
    expect(text).toContain("2     leaf-rail2.swp3  mlx5_2    eth2       protodown/linkflap");

    await typeCommand(page, "show rail topology");
    text = await terminalText(page);
    expect(text).toMatch(/Command not available on this device|Command not found|Did you mean/);
  });
});
