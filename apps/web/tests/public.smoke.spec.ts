import { expect, test, type Page } from "@playwright/test";

const allowedConsolePatterns = [
  /Download the React DevTools/i,
  /Failed to load resource:.*favicon/i,
];

function trackErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" && !allowedConsolePatterns.some((pattern) => pattern.test(message.text()))) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  return { consoleErrors, pageErrors };
}

function expectNoBrowserErrors(tracker: { consoleErrors: string[]; pageErrors: string[] }) {
  expect(tracker.consoleErrors, `browser console errors: ${tracker.consoleErrors.join("\n")}`).toEqual([]);
  expect(tracker.pageErrors, `browser page errors: ${tracker.pageErrors.join("\n")}`).toEqual([]);
}

test.describe("public local-mode smoke", () => {
  test("homepage, curriculum, chapter, lab catalog, simulator, login state, and API session render", async ({ page, request }) => {
    const tracker = trackErrors(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Learn the fabric that keeps AI clusters alive/i })).toBeVisible();
    await expect(page.getByText(/\d+ chapters\. \d+ scenario labs\./i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Browse the curriculum/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /View the repo/i })).toBeVisible();

    await page.goto("/curriculum", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /HPC networking from hardware to routed AI fabrics/i }),
    ).toBeVisible();
    await expect(page.getByText(/Part 1 - Foundations/i)).toBeVisible();
    await expect(page.getByText(/Part 4 - Scale and Architecture/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /The Hardware Story/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Diagnose fabric congestion/i })).toBeVisible();

    await page.goto("/learn/ch0-hardware-foundations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /The Hardware Story/i })).toBeVisible();
    await expect(page.getByText(/Part \d+ of \d+/i).first()).toBeVisible();

    await page.goto("/lab", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Pick a FabricLab scenario before entering the simulator/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();
    await expect(page.getByText(/labs in the catalog/i)).toBeVisible();

    await page.goto("/lab?lab=lab2-congestion", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Diagnose fabric congestion/i })).toBeVisible();
    await expect(page.locator(".xterm").first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Sign in$/i })).toBeVisible();
    await expect(page.getByText(/No OAuth providers are configured yet/i)).toBeVisible();

    const session = await request.get("/api/auth/session");
    expect(session.ok()).toBeTruthy();
    const sessionBody = await session.json();
    expect(sessionBody).toEqual({ user: null, authenticated: false });

    const imageResponse = await request.get(
      "/_next/image?url=%2Fimages%2Fch0-hardware-foundations%2Fnvidia-bluefield-3-official.jpg&w=1080&q=75",
    );
    expect(imageResponse.ok()).toBeTruthy();
    expect(imageResponse.headers()["content-type"]).toMatch(/^image\//);

    expectNoBrowserErrors(tracker);
  });
});
