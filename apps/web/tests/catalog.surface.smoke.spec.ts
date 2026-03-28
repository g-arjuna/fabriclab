import { expect, test } from "@playwright/test";

import {
  assertNoBrowserErrors,
  signInWithMagicLink,
  trackErrors,
} from "./helpers/liveAuth";

test.describe.serial("Homepage and curriculum catalog smoke", () => {
  test("guest sees the latest public catalog surface", async ({ page }) => {
    const tracker = trackErrors(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Master the fabric/i })).toBeVisible();
    await expect(
      page.getByText("17 chapters. 12 scenario labs. One interactive CLI simulator."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /The GPU Compute Network - Packet Anatomy/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub" })).toHaveCount(0);

    await page.goto("/curriculum", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /HPC networking from hardware to routed AI fabrics/i }),
    ).toBeVisible();
    await expect(page.getByText(/Part 1 - Foundations/i)).toBeVisible();
    await expect(page.getByText(/Part 4 - Scale and Architecture/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /The Hardware Story/i })).toContainText("Free");
    await expect(
      page.getByRole("link", { name: /The GPU Compute Network - Packet Anatomy/i }),
    ).toContainText("Paid preview");
    await expect(
      page.getByRole("link", { name: /Identify the failed rail/i }),
    ).toContainText("Free");
    await expect(
      page.getByRole("link", { name: /BGP suboptimal routing: spine ASN design/i }),
    ).toContainText("Paid preview");

    assertNoBrowserErrors(tracker);
  });

  test("signed-in paid user sees paid curriculum cards unlocked", async ({ page }) => {
    const tracker = trackErrors(page);

    await signInWithMagicLink(page);
    await page.goto("/curriculum", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("link", { name: /The GPU Compute Network - Packet Anatomy/i }),
    ).toContainText("Available");
    await expect(
      page.getByRole("link", { name: /BGP suboptimal routing: spine ASN design/i }),
    ).toContainText("Available");
    await expect(page.getByText("Paid preview")).toHaveCount(0);

    assertNoBrowserErrors(tracker);
  });
});
