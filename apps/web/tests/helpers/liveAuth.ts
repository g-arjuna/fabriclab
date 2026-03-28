import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export type BrowserErrorTracker = {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
};

export type CatalogRowState = {
  access_tier: "free" | "paid";
  is_published: boolean;
  preview_enabled: boolean;
  preview_summary: string | null;
};

export type ChapterProgressRow = {
  chapter_slug: string;
  completed_pages: number[];
  last_page_index: number | null;
};

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
  /TypeError: Failed to fetch/i,
];

export const smokeEmail =
  process.env.SMOKE_TEST_EMAIL ??
  process.env.SUPABASE_ADMIN_EMAILS?.split(",").map((value) => value.trim()).find(Boolean) ??
  "";
export const learnerEmail =
  process.env.SMOKE_TEST_LEARNER_EMAIL?.trim() || "smoke-learner@fabriclab.dev";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const appUrl = (
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

function assertRequiredEnv() {
  expect(smokeEmail, "SMOKE_TEST_EMAIL or SUPABASE_ADMIN_EMAILS is required").not.toBe("");
  expect(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required").not.toBe("");
  expect(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is required").not.toBe("");
}

export function createAdminClient() {
  assertRequiredEnv();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function trackErrors(page: Page): BrowserErrorTracker {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];

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

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown request failure";
    const url = request.url();
    const isAbortedRscRequest =
      failure === "net::ERR_ABORTED" &&
      url.startsWith(appUrl) &&
      url.includes("_rsc=");
    const isAbortedStaticChunkRequest =
      failure === "net::ERR_ABORTED" &&
      url.startsWith(appUrl) &&
      /\/_next\/static\/chunks\//.test(url);
    const isAbortedSupabaseUserProbe =
      failure === "net::ERR_ABORTED" &&
      url.startsWith(supabaseUrl) &&
      /\/auth\/v1\/user(?:\?|$)/.test(url);

    if (isAbortedRscRequest || isAbortedStaticChunkRequest || isAbortedSupabaseUserProbe) {
      return;
    }

    requestFailures.push(`${failure} ${url}`);
  });

  return { consoleErrors, pageErrors, requestFailures };
}

export function assertNoBrowserErrors(tracker: BrowserErrorTracker) {
  expect(tracker.pageErrors, `Uncaught page errors:\n${tracker.pageErrors.join("\n")}`).toEqual([]);
  expect(tracker.consoleErrors, `Console errors:\n${tracker.consoleErrors.join("\n")}`).toEqual([]);
  expect(
    tracker.requestFailures,
    `Request failures:\n${tracker.requestFailures.join("\n")}`,
  ).toEqual([]);
}

export async function ensurePaidEntitlement(email = smokeEmail) {
  const userId = await findUserIdByEmail(email);
  const admin = createAdminClient();

  const { error: entitlementError } = await admin
    .from("user_entitlements")
    .upsert(
      {
        user_id: userId,
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

export async function findUserIdByEmail(email = smokeEmail) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  expect(error, error?.message ?? "Failed to list auth users").toBeNull();

  const user = data?.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    return user.id;
  }

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  expect(createError, createError?.message ?? `Failed to create auth user for ${email}`).toBeNull();
  expect(createdUser.user, `Could not create auth user for ${email}`).toBeTruthy();

  return createdUser.user!.id;
}

export async function generateMagicCallbackUrl(email = smokeEmail) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  expect(error, error?.message ?? "Failed to generate magic link").toBeNull();
  const tokenHash = data?.properties?.hashed_token;
  expect(tokenHash, "Magic link did not include a hashed token").toBeTruthy();

  return `${appUrl}/auth/callback?token_hash=${encodeURIComponent(tokenHash ?? "")}&type=magiclink&next=%2Faccount`;
}

export async function signInWithMagicLink(page: Page, email = smokeEmail) {
  await ensurePaidEntitlement(email);
  const callbackUrl = await generateMagicCallbackUrl(email);

  await page.goto(callbackUrl, { waitUntil: "domcontentloaded" });
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
    .toContain(email);
}

export async function readCatalogState(kind: "chapter" | "lab", slug: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("content_catalog")
    .select("access_tier, is_published, preview_enabled, preview_summary")
    .eq("kind", kind)
    .eq("slug", slug)
    .maybeSingle<CatalogRowState>();

  expect(error, error?.message ?? `Failed to read content_catalog row for ${kind}:${slug}`).toBeNull();
  expect(data, `Missing content_catalog row for ${kind}:${slug}`).toBeTruthy();

  return data as CatalogRowState;
}

export async function updateCatalogState(
  kind: "chapter" | "lab",
  slug: string,
  patch: Partial<CatalogRowState>,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("content_catalog")
    .update(patch)
    .eq("kind", kind)
    .eq("slug", slug);

  expect(error, error?.message ?? `Failed to update content_catalog row for ${kind}:${slug}`).toBeNull();
}

export async function clearChapterProgress(userId: string, chapterSlug: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("chapter_progress")
    .delete()
    .eq("user_id", userId)
    .eq("chapter_slug", chapterSlug);

  expect(error, error?.message ?? `Failed to clear chapter progress for ${chapterSlug}`).toBeNull();
}

export async function readChapterProgress(userId: string, chapterSlug: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chapter_progress")
    .select("chapter_slug, completed_pages, last_page_index")
    .eq("user_id", userId)
    .eq("chapter_slug", chapterSlug)
    .maybeSingle<ChapterProgressRow>();

  expect(error, error?.message ?? `Failed to read chapter progress for ${chapterSlug}`).toBeNull();
  return data as ChapterProgressRow | null;
}

export async function hasPaidEntitlement(email = smokeEmail) {
  const userId = await findUserIdByEmail(email);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("entitlement_key", "core_paid");

  expect(error, error?.message ?? `Failed to read entitlement for ${email}`).toBeNull();
  return (data?.length ?? 0) > 0;
}

export async function revokePaidEntitlement(email = smokeEmail) {
  const userId = await findUserIdByEmail(email);
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_entitlements")
    .delete()
    .eq("user_id", userId)
    .eq("entitlement_key", "core_paid");

  expect(error, error?.message ?? `Failed to revoke entitlement for ${email}`).toBeNull();
}
