import { test, expect, type Page } from "@playwright/test";

const email = process.env.E2E_AUTH_EMAIL;
const password = process.env.E2E_AUTH_PASSWORD;

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/senha/i).fill(password!);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/home$/);
}

async function measureRail(page: Page, railIndex = 0) {
  return page.locator(".event-rail").nth(railIndex).evaluate((rail) => {
    const bounds = rail.getBoundingClientRect();
    const cards = Array.from(rail.children).map((child) => {
      const rect = (child as HTMLElement).getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });
    return {
      left: bounds.left,
      right: bounds.right,
      width: bounds.width,
      scrollWidth: (rail as HTMLElement).scrollWidth,
      clientWidth: (rail as HTMLElement).clientWidth,
      cards,
    };
  });
}

test.describe("home Fight Night", () => {
  test.skip(
    !email || !password,
    "Defina E2E_AUTH_EMAIL e E2E_AUTH_PASSWORD para validar a home autenticada.",
  );

  for (const viewport of VIEWPORTS) {
    test(`mantém a composição sem overflow em ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await login(page);

      await expect(page.getByRole("heading", { name: /olá,/i })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

      const hero = page.locator('main a[href^="/event/"]').first();
      if (await hero.count()) {
        await expect(hero).toBeVisible();
      }

      const cta = page.getByText(/^(fazer picks|continuar picks|revisar picks|ver card|acompanhar ao vivo)/i).first();
      if (await cta.count()) {
        await expect(cta).toBeVisible();
      }
    });
  }

  test("hero, rail e CTA respeitam a prioridade acima da dobra em 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const hero = page.locator('main a[href^="/event/"]').first();
    if (!(await hero.count())) return;

    await expect(hero).toBeVisible();
    const heroBox = await hero.boundingBox();
    expect(heroBox).not.toBeNull();
    expect((heroBox?.y ?? Number.POSITIVE_INFINITY) + (heroBox?.height ?? 0)).toBeLessThanOrEqual(844);

    const cta = page.getByText(/^(fazer picks|continuar picks|revisar picks|ver card|acompanhar ao vivo)/i).first();
    if (await cta.count()) {
      await expect(cta).toBeVisible();
      const ctaBox = await cta.boundingBox();
      expect(ctaBox).not.toBeNull();
      expect((ctaBox?.y ?? Number.POSITIVE_INFINITY) + (ctaBox?.height ?? 0)).toBeLessThanOrEqual(844);
    }

    const railCount = await page.locator(".event-rail").count();
    if (railCount > 0) {
      const rail = await measureRail(page);
      expect(rail.scrollWidth).toBeGreaterThanOrEqual(rail.clientWidth);
    }
  });

  test("o trilho mobile expõe o próximo card quando há pelo menos dois eventos", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page);

    const rails = page.locator(".event-rail");
    if (!(await rails.count())) return;
    const rail = await measureRail(page);
    const visibleCards = rail.cards.filter((card) => card.right > rail.left && card.left < rail.right);
    if (rail.cards.length < 2 || rail.scrollWidth <= rail.clientWidth) return;

    const nextCard = rail.cards.slice(1).find((card) => card.left >= rail.left + 1);
    expect(nextCard).toBeDefined();
    const visibleWidth = Math.max(0, Math.min(nextCard!.right, rail.right) - Math.max(nextCard!.left, rail.left));
    expect(visibleWidth / nextCard!.width).toBeGreaterThanOrEqual(0.12);
    expect(visibleCards.length).toBeGreaterThanOrEqual(1);
  });

  test("o trilho desktop mostra três cards quando há dados suficientes", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await login(page);

    const rails = page.locator(".event-rail");
    if (!(await rails.count())) return;
    const rail = await measureRail(page);
    if (rail.cards.length < 3) return;

    const visibleCards = rail.cards.filter((card) => card.left >= rail.left - 1 && card.right <= rail.right + 1);
    expect(visibleCards.length).toBeGreaterThanOrEqual(3);
  });

  test("o comparativo desaparece sem main event e mantém o link de confronto quando publicado", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await login(page);

    const comparison = page.getByRole("heading", { name: /luta principal/i });
    const confrontation = page.getByRole("link", { name: /ver confronto/i });
    if (await comparison.count()) {
      await expect(comparison).toBeVisible();
      await expect(confrontation).toHaveAttribute("href", /#fight-/);
    } else {
      await expect(confrontation).toHaveCount(0);
    }
  });

  test("a troca de tema preserva a home quando o controle estiver disponível", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);

    const toggle = page.getByRole("button", { name: /ativar modo (claro|escuro)/i });
    if (!(await toggle.count())) return;

    const before = await page.locator("html").getAttribute("class");
    await toggle.click();
    const after = await page.locator("html").getAttribute("class");
    expect(after).not.toBe(before);
    await expect(page.getByRole("heading", { name: /olá,/i })).toBeVisible();
  });

  test("reduced motion desativa animações da home", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const reveal = page.locator(".home-reveal").first();
    if (!(await reveal.count())) return;
    await expect.poll(() => reveal.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  });

  test("Desafiar abre confirmação sem enviar no primeiro clique", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const challengeButton = page.getByRole("button", { name: /^desafiar$/i });
    if (!(await challengeButton.count())) return;

    let challengeRequests = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/challenges")) challengeRequests += 1;
    });
    await challengeButton.click();
    await expect(page.getByRole("heading", { name: /enviar desafio/i })).toBeVisible();
    expect(challengeRequests).toBe(0);

    const cancel = page.getByRole("button", { name: /cancelar/i });
    if (await cancel.count()) await cancel.click();
  });

  test("o hero atual é link direto para o evento quando há evento publicado", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const eventLink = page.locator('a[href^="/event/"]').first();
    if (await eventLink.count()) {
      await expect(eventLink).toBeVisible();
      await expect(eventLink).toHaveAttribute("href", /\/event\//);
    }
  });

  test("Ver todos abre o calendário de eventos", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const directLink = page.locator('a[href="/event?view=all"]');
    if (!(await directLink.count())) return;

    await directLink.first().click();
    await expect(page).toHaveURL(/\/event\?view=all$/);
    await expect(page.getByRole("heading", { name: "Eventos", exact: true })).toBeVisible();
  });
});
