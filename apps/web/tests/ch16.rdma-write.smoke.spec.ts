import { expect, test } from "@playwright/test";

const chapterPath = "/learn/ch16-gpu-compute-network-packet-anatomy";

test("Chapter 16 teaches ordinary RDMA WRITE completion semantics correctly", async ({ page }) => {
  await page.goto(`${chapterPath}?page=2`, { waitUntil: "domcontentloaded" });

  await expect(page.getByText(/ordinary RDMA WRITE names its destination memory/i)).toBeVisible();
  await expect(page.getByText(/Payload placement, initiator completion, and remote notification are distinct/i)).toBeVisible();

  // Client visualisations hydrate after the RSC HTML becomes visible.
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Go to queue-pair step 7" }).click();
  await expect(page.getByText(/Initiator receives its own signalled completion/i)).toBeVisible();
  await expect(page.getByText(/not a receive CQE on the destination/i)).toBeVisible();
  await expect(page.getByText(/Initiator RNIC → signalled completion → Initiator CQ \/ WC/i)).toBeVisible();

  await page.getByRole("button", { name: "Go to queue-pair step 8" }).click();
  await expect(page.getByText(/Remote application notification is a separate protocol step/i)).toBeVisible();
  await expect(page.getByText(/Do not treat the ordinary WRITE itself as remote notification/i)).toBeVisible();

  await page.goto(`${chapterPath}?page=6`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Ordinary WRITE completion semantics/i)).toBeVisible();
  await expect(page.getByText(/does not consume a receive WR/i).first()).toBeVisible();
  await expect(page.getByText(/RDMA WRITE with immediate data/i).first()).toBeVisible();
  await expect(page.getByText(/posts a completion entry to the destination's Completion Queue/i)).toHaveCount(0);
});
