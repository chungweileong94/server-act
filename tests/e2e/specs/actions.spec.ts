import { expect, test } from "@playwright/test";

test.describe("regular actions", () => {
  test("submits a name and displays the action result", async ({ page }) => {
    await page.goto("/action");
    await page.getByLabel("Please tell us your name").fill("Ada");

    await page.getByRole("button", { name: "Say hello to the server" }).click();

    await expect(
      page.getByRole("button", { name: "Loading..." }),
    ).toBeDisabled();
    await expect(page.getByText("Hello, Ada!", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Say hello to the server" }),
    ).toBeEnabled();
  });

  test("returns the empty-name result", async ({ page }) => {
    await page.goto("/action");

    await page.getByRole("button", { name: "Say hello to the server" }).click();

    await expect(
      page.getByText("You need to tell me your name!", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("state actions", () => {
  test("submits a valid name", async ({ page }) => {
    await page.goto("/state-action");
    await page.getByLabel("Please tell us your name").fill("Ada");

    await page.getByRole("button", { name: "Say hello to the server" }).click();

    await expect(page.getByText("Hello, Ada!", { exact: true })).toBeVisible();
  });

  test("reports a missing name and keeps the raw input", async ({ page }) => {
    await page.goto("/state-action");

    await page.getByRole("button", { name: "Say hello to the server" }).click();

    await expect(
      page.getByText("You haven't told me your name", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Please tell us your name")).toHaveValue("");
  });

  test("reports an overlong name and keeps the raw input", async ({ page }) => {
    const longName = "A".repeat(21);
    await page.goto("/state-action");
    await page.getByLabel("Please tell us your name").fill(longName);

    await page.getByRole("button", { name: "Say hello to the server" }).click();

    await expect(
      page.getByText("Any shorter name? You name is too long 😬", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Please tell us your name")).toHaveValue(
      longName,
    );
  });

  test("allows invalid input to be corrected", async ({ page }) => {
    const name = page.getByLabel("Please tell us your name");
    await page.goto("/state-action");

    await page.getByRole("button", { name: "Say hello to the server" }).click();
    await expect(
      page.getByText("You haven't told me your name", { exact: true }),
    ).toBeVisible();

    await name.fill("Ada");
    await page.getByRole("button", { name: "Say hello to the server" }).click();

    await expect(page.getByText("Hello, Ada!", { exact: true })).toBeVisible();
    await expect(
      page.getByText("You haven't told me your name", { exact: true }),
    ).toBeHidden();
  });
});

test.describe("state actions with transformed input", () => {
  test("submits first and last names", async ({ page }) => {
    await page.goto("/state-action-override");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Lovelace");

    await page.getByRole("button", { name: "Say hello" }).click();

    await expect(
      page.getByText("Hello, Ada Lovelace!", { exact: true }),
    ).toBeVisible();
  });

  test("reports both missing fields and keeps their raw input", async ({
    page,
  }) => {
    await page.goto("/state-action-override");

    await page.getByRole("button", { name: "Say hello" }).click();

    await expect(
      page.getByText("First name is required", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Last name is required", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveValue("");
    await expect(page.getByLabel("Last name")).toHaveValue("");
  });

  test("reports only the missing field and retains both raw values", async ({
    page,
  }) => {
    await page.goto("/state-action-override");
    await page.getByLabel("First name").fill("Ada");

    await page.getByRole("button", { name: "Say hello" }).click();

    await expect(
      page.getByText("Last name is required", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("First name is required", { exact: true }),
    ).toBeHidden();
    await expect(page.getByLabel("First name")).toHaveValue("Ada");
    await expect(page.getByLabel("Last name")).toHaveValue("");
  });
});
