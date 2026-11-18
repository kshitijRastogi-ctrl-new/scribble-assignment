import { expect, test } from "@playwright/test";

test.describe("Lobby", () => {
  test("start page offers to create or join a room", async ({ page }) => {
    await test.step("Open the start page", async () => {
      await page.goto("/");
    });
    await test.step("See the game and both ways in", async () => {
      await expect(page.getByRole("heading", { name: "Scribble Game" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Create Room" })).toBeVisible();
    });
    await expect(page.getByRole("link", { name: "Join Room" })).toBeVisible();
  });

  test("creating a room opens its lobby with a room code", async ({ page }) => {
    await test.step("Open Create Room", async () => {
      await page.goto("/");
      await page.getByRole("link", { name: "Create Room" }).click();
    });
    await test.step("Create a room as a new player", async () => {
      await page.getByPlaceholder("Sketch captain").fill(`C${Date.now()}`);
      await page.getByRole("button", { name: "Create and Continue" }).click();
    });
    await test.step("Land in the lobby", async () => {
      await expect(page.getByRole("heading", { name: "Lobby" })).toBeVisible();
    });
    await expect(page.getByText("Room Code", { exact: true })).toBeVisible();
  });
});
