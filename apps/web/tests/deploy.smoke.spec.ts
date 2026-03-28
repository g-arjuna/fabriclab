import { expect, test } from "@playwright/test";

import {
  assertNoBrowserErrors,
  smokeEmail,
  signInWithMagicLink,
  trackErrors,
} from "./helpers/liveAuth";

test.describe.serial("Deployed auth and gating smoke", () => {
  test("guest gating matches the catalog surface", async ({ page }) => {
    const tracker = trackErrors(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Master the fabric/i })).toBeVisible();
    await expect(page.getByText("17 chapters. 12 scenario labs. One interactive CLI simulator.")).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub" })).toHaveCount(0);

    await page.goto("/learn/ch3-the-cli", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Chapter preview/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /The CLI - Reading the Fabric/i })).toBeVisible();
    await expect(page.getByText(/The full lesson stays hidden until paid access is granted/i)).toBeVisible();

    await page.goto("/lab?lab=lab2-congestion", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Lab locked/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();

    assertNoBrowserErrors(tracker);
  });

  test("signed-in paid user can open gated routes", async ({ page }) => {
    const tracker = trackErrors(page);

    await signInWithMagicLink(page);

    await page.goto("/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(smokeEmail)).toBeVisible();
    await expect(page.getByText(/Admin access enabled\./i)).toBeVisible();
    await expect(page.getByText(/Core paid unlocked/i)).toBeVisible();

    await page.goto("/learn/ch3-the-cli", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Chapter 3: The CLI/i })).toBeVisible();
    await expect(page.getByText(/The investigation always starts with the same three questions/i)).toBeVisible();

    await page.goto("/lab?lab=lab2-congestion", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();
    await expect(page.getByText(/GPU training throughput has dropped 40%/i)).toBeVisible();
    await expect(page.getByText(/Lab locked/i)).toHaveCount(0);

    assertNoBrowserErrors(tracker);
  });
});
