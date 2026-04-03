import { expect, type Page, test } from "@playwright/test";

import { SOLUTION_GUIDES } from "@/data/labs/solutionGuides";
import {
  appUrl,
  assertNoBrowserErrors,
  signInWithSession,
  trackErrors,
} from "./helpers/liveAuth";

const COMMAND_ERROR_PATTERN =
  /Command not found|Command not available|Unsupported mutation command|Did you mean:/i;
const EXPECTED_WRONG_COMMAND_PATTERN = /Command not found|Command not available/i;

async function getVisibleTerminalText(page: Page) {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".xterm-rows")).find(
      (node) => window.getComputedStyle(node).visibility !== "hidden",
    );

    return rows?.innerText ?? "";
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractCommandBlock(terminalText: string, command: string) {
  const commandLinePattern = new RegExp(
    `(?:^|\\n)[^\\n]*[#$]\\s*${escapeRegExp(command)}(?:\\n|$)`,
    "g",
  );
  const matches = [...terminalText.matchAll(commandLinePattern)];
  if (matches.length === 0) {
    return terminalText.trim();
  }

  return terminalText.slice(matches[matches.length - 1].index ?? 0).trim();
}

async function focusVisibleTerminal(page: Page) {
  await page.evaluate(() => {
    const visibleTextarea = Array.from(
      document.querySelectorAll<HTMLTextAreaElement>(".xterm-helper-textarea"),
    ).find((textarea) => window.getComputedStyle(textarea).visibility !== "hidden");

    visibleTextarea?.focus();
  });
}

async function runTerminalCommand(page: Page, deviceId: string, command: string) {
  await page.evaluate((targetDeviceId) => {
    window.dispatchEvent(
      new CustomEvent("device-selected", {
        detail: { deviceId: targetDeviceId },
      }),
    );
  }, deviceId);

  await page.waitForTimeout(80);

  await page.evaluate(
    ({ targetDeviceId, nextCommand }) => {
      window.dispatchEvent(
        new CustomEvent("insert-command", {
          detail: {
            deviceId: targetDeviceId,
            command: nextCommand,
          },
        }),
      );
    },
    { targetDeviceId: deviceId, nextCommand: command },
  );

  await focusVisibleTerminal(page);
  await page.keyboard.press("Enter");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(100);
    const afterText = await getVisibleTerminalText(page);
    const commandBlock = extractCommandBlock(afterText, command);

    if (commandBlock.split("\n").length > 1) {
      return commandBlock;
    }
  }

  const afterText = await getVisibleTerminalText(page);
  return extractCommandBlock(afterText, command);
}

async function runGuideCommand(page: Page, deviceId: string, command: string) {
  const terminalText = await runTerminalCommand(page, deviceId, command);
  expect(
    terminalText,
    `Unexpected terminal error after running "${command}" on ${deviceId}`,
  ).not.toMatch(COMMAND_ERROR_PATTERN);
}

async function assertHelpAndWrongCommand(page: Page, deviceId: string) {
  const helpOutput = await runTerminalCommand(page, deviceId, "help");
  expect(
    helpOutput,
    `Expected help output on ${deviceId}`,
  ).toContain("Available commands on this device:");

  const wrongCommandOutput = await runTerminalCommand(
    page,
    deviceId,
    "fabriclab-no-such-command",
  );
  expect(
    wrongCommandOutput,
    `Expected a clear wrong-command response on ${deviceId}`,
  ).toMatch(EXPECTED_WRONG_COMMAND_PATTERN);
}

test.describe("Solution guide walkthroughs", () => {
  test("terminal supports copy, paste, tab completion, and command history", async ({
    context,
    page,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: appUrl,
    });

    const tracker = trackErrors(page);

    await signInWithSession(page);

    const response = await page.goto(`${appUrl}/lab?lab=lab0-failed-rail`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);

    const firstTerminalTab = page
      .locator('button[title$="terminal"], button[title^="Switch to "]')
      .first();
    if (await firstTerminalTab.count()) {
      await expect(firstTerminalTab).toBeVisible({ timeout: 20_000 });
      await firstTerminalTab.click();
    }

    const terminalInput = page.locator(".xterm-helper-textarea").first();
    await expect(terminalInput).toBeAttached({ timeout: 20_000 });

    await page.getByRole("button", { name: "Show Solution" }).click();
    const copyButton = page.getByRole("button", { name: "Copy command: show ufm topology" });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await page.getByRole("button", { name: /Close/i }).click();

    await page.evaluate(() => navigator.clipboard.writeText("show ufm topology"));
    await terminalInput.click();
    await page.keyboard.press("Control+V");
    await expect
      .poll(() => getVisibleTerminalText(page))
      .toContain("show ufm topology");
    await page.keyboard.press("Enter");
    await expect
      .poll(() => getVisibleTerminalText(page))
      .toContain("Mapping: Rail 3 -> leaf-rail3 swp5 -> mlx5_3 / eth3");

    await terminalInput.click();
    await page.keyboard.type("show u");
    await page.keyboard.press("Tab");
    await expect
      .poll(() => getVisibleTerminalText(page))
      .toMatch(/ufm-server\s+\$\s+show ufm topology\s*$/);

    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowUp");
    await expect
      .poll(() => getVisibleTerminalText(page))
      .toMatch(/ufm-server\s+\$\s+show ufm topology\s*$/);

    assertNoBrowserErrors(tracker);
  });

  for (const guide of Object.values(SOLUTION_GUIDES)) {
    test(`${guide.labId} solution guide finishes the lab`, async ({ page }) => {
      const tracker = trackErrors(page);

      await signInWithSession(page);

      const response = await page.goto(`${appUrl}/lab?lab=${guide.labId}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status(), `${guide.labId} should be reachable to a signed-in smoke user`).toBe(200);

      const firstTerminalTab = page
        .locator('button[title$="terminal"], button[title^="Switch to "]')
        .first();
      if (await firstTerminalTab.count()) {
        await expect(firstTerminalTab).toBeVisible({ timeout: 20_000 });
        await firstTerminalTab.click();
      }
      await expect(page.locator(".xterm-helper-textarea").first()).toBeAttached({ timeout: 20_000 });

      await expect(page.getByRole("button", { name: "Show Solution" })).toBeVisible();
      await page.getByRole("button", { name: "Show Solution" }).click();
      await expect(page.getByText("Solution Guide")).toBeVisible({ timeout: 10_000 });
      await expect(
        page.locator("code", { hasText: guide.steps[0].commands[0].command }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: /Close/i }).click();
      await expect(page.getByText("Solution Guide")).toBeHidden();

      const deviceIds = Array.from(
        new Set(
          guide.steps.flatMap((step) =>
            step.commands.map((commandItem) => commandItem.deviceId),
          ),
        ),
      );

      for (const deviceId of deviceIds) {
        await assertHelpAndWrongCommand(page, deviceId);
      }

      for (const step of guide.steps) {
        for (const commandItem of step.commands) {
          await runGuideCommand(page, commandItem.deviceId, commandItem.command);
        }
      }

      await expect(page.getByText("Lab complete", { exact: true })).toBeVisible({ timeout: 20_000 });
      assertNoBrowserErrors(tracker);
    });
  }
});
