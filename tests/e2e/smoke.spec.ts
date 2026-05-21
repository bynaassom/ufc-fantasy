import { test, expect } from "@playwright/test";

const authEmail = process.env.E2E_AUTH_EMAIL;
const authPassword = process.env.E2E_AUTH_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
}

test("landing page loads and exposes auth entrypoints", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: /entrar/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /registrar/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /premiações/i })).toBeVisible();
  await expect(page.getByText(/luva autografada/i)).toBeVisible();
  await expect(page.getByText(/vídeo do moicano/i)).toBeVisible();
});

test.describe("authenticated smoke", () => {
  test.skip(
    !authEmail || !authPassword,
    "Defina E2E_AUTH_EMAIL e E2E_AUTH_PASSWORD para rodar o smoke autenticado.",
  );

  test("user can log in and reach protected areas", async ({ page }) => {
    await login(page, authEmail!, authPassword!);

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText(/bem-vindo de volta/i)).toBeVisible();

    await page.goto("/ranking");
    await expect(page.getByText(/ranking/i)).toBeVisible();

    await page.goto("/historico");
    await expect(page.getByText(/histórico/i)).toBeVisible();

    await page.goto("/profile");
    await expect(page.getByText(/nickname|senha/i)).toBeVisible();
  });
});

test.describe("admin smoke", () => {
  test.skip(
    !adminEmail || !adminPassword,
    "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para rodar o smoke admin.",
  );

  test("admin can open the dashboard", async ({ page }) => {
    await login(page, adminEmail!, adminPassword!);
    await page.goto("/admin");

    await expect(page.getByText(/painel admin/i)).toBeVisible();
  });
});
