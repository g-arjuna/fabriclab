import { expect, test } from "@playwright/test";

import { assertNoBrowserErrors, signInWithSession, trackErrors } from "./helpers/liveAuth";

test.describe.serial("Homepage and curriculum catalog smoke", () => {
  test("guest sees the latest public catalog surface", async ({ page }) => {
    const tracker = trackErrors(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Learn the fabric that keeps AI clusters alive/i }),
    ).toBeVisible();
    await expect(page.getByText(/\d+ chapters\. \d+ scenario labs\./i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /The GPU Compute Network - Packet Anatomy/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /View the repo/i })).toBeVisible();

    await page.goto("/curriculum", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /HPC networking from hardware to routed AI fabrics/i }),
    ).toBeVisible();
    await expect(page.getByText(/Part 1 - Foundations/i)).toBeVisible();
    await expect(page.getByText(/Part 4 - Scale and Architecture/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /The Hardware Story/i })).toContainText("Sign in required");
    await expect(
      page.getByRole("link", { name: /The GPU Compute Network - Packet Anatomy/i }),
    ).toContainText("Sign in required");
    await expect(
      page.getByRole("link", { name: /Identify the failed rail/i }),
    ).toContainText("Sign in required");
    await expect(
      page.getByRole("link", { name: /BGP suboptimal routing: spine ASN design/i }),
    ).toContainText("Sign in required");

    assertNoBrowserErrors(tracker);
  });

  test("signed-in users see the same catalog unlocked for learning", async ({ page }) => {
    const tracker = trackErrors(page);

    await signInWithSession(page);
    await page.goto("/curriculum", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("link", { name: /The GPU Compute Network - Packet Anatomy/i }),
    ).toContainText("Available");
    await expect(
      page.getByRole("link", { name: /BGP suboptimal routing: spine ASN design/i }),
    ).toContainText("Available");
    await expect(page.getByText("Sign in required")).toHaveCount(0);

    assertNoBrowserErrors(tracker);
  });
});
