import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
];

const smokeEmail =
  process.env.SMOKE_TEST_EMAIL ??
  process.env.SUPABASE_ADMIN_EMAILS?.split(",").map((value) => value.trim()).find(Boolean) ??
  "";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const appUrl = (process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

function assertRequiredEnv() {
  expect(smokeEmail, "SMOKE_TEST_EMAIL or SUPABASE_ADMIN_EMAILS is required").not.toBe("");
  expect(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required").not.toBe("");
  expect(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is required").not.toBe("");
}

function createAdminClient() {
  assertRequiredEnv();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function trackErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

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

  return { consoleErrors, pageErrors };
}

async function ensurePaidEntitlement() {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  expect(error, error?.message ?? "Failed to list auth users").toBeNull();

  const user = data?.users.find((entry) => entry.email?.toLowerCase() === smokeEmail.toLowerCase());
  expect(user, `Could not find auth user for ${smokeEmail}`).toBeTruthy();

  const { error: entitlementError } = await admin
    .from("user_entitlements")
    .upsert(
      {
        user_id: user!.id,
        entitlement_key: "core_paid",
        source: "manual",
      },
      {
        onConflict: "user_id,entitlement_key",
        ignoreDuplicates: false,
      },
    );

  expect(entitlementError, entitlementError?.message ?? "Failed to ensure entitlement").toBeNull();
}

async function generateMagicLink() {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: smokeEmail,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  expect(error, error?.message ?? "Failed to generate magic link").toBeNull();
  const tokenHash = data?.properties?.hashed_token;
  expect(tokenHash, "Magic link did not include a hashed token").toBeTruthy();

  return `${appUrl}/auth/callback?token_hash=${encodeURIComponent(tokenHash ?? "")}&type=magiclink&next=%2Faccount`;
}

test.describe.serial("Deployed auth and gating smoke", () => {
  test("guest gating matches the catalog surface", async ({ page }) => {
    const { consoleErrors, pageErrors } = trackErrors(page);

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

    expect(pageErrors, `Uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
    expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("signed-in paid user can open gated routes", async ({ page }) => {
    const { consoleErrors, pageErrors } = trackErrors(page);

    await ensurePaidEntitlement();
    const magicLink = await generateMagicLink();

    await page.goto(magicLink, { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        async () => {
          await page.goto("/account", { waitUntil: "domcontentloaded" });
          return (await page.locator("body").textContent()) ?? "";
        },
        {
          timeout: 30_000,
          intervals: [1_000, 2_000, 3_000],
        },
      )
      .toContain(smokeEmail);

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

    expect(pageErrors, `Uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
    expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  });
});
