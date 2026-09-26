import {
  getUfcHeadshotQualityScore,
  getCachedUfcFighterPortrait,
  isLikelyMismatchedUfcHeadshot,
  isLowQualityHeadshotUrl,
  resolveUfcFighterMedia,
  selectPreferredHeadshotUrl,
} from "@/lib/ufc-fighter-media";

describe("ufc-fighter-media", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prioritizes the original UFC headshot over resized card and body images", () => {
    const cardThumbnail =
      "https://ufc.com/images/styles/event_fight_card_upper_body_of_standing_athlete/s3/2025-03/SPANN_RYAN_R.png";
    const fullBody =
      "https://ufc.com/images/styles/athlete_bio_full_body/s3/2025-07/SPANN_RYAN_L.png";
    const original = "https://ufc.com/images/2026-09/SPANN_RYAN_09-05.png";

    expect(isLowQualityHeadshotUrl(cardThumbnail)).toBe(true);
    expect(getUfcHeadshotQualityScore(original)).toBeGreaterThan(
      getUfcHeadshotQualityScore(fullBody),
    );
    expect(selectPreferredHeadshotUrl(cardThumbnail, fullBody, original)).toBe(
      original,
    );
  });

  it("recognizes when an official UFC image belongs to another athlete", () => {
    expect(
      isLikelyMismatchedUfcHeadshot(
        "https://ufc.com/images/2026-09/MONTENEGRO_SOFIA_R.png",
        "Delphine Benouaich",
      ),
    ).toBe(true);
    expect(
      isLikelyMismatchedUfcHeadshot(
        "https://ufc.com/images/2026-09/BENOUAICH_DELPHINE_L.png",
        "Delphine Benouaich",
      ),
    ).toBe(false);
  });

  it("extracts the unstyled original from the official athlete page", async () => {
    const original = "https://ufc.com/images/2026-09/SPANN_RYAN_09-05.png";
    const fullBody =
      "https://ufc.com/images/styles/athlete_bio_full_body/s3/2025-07/SPANN_RYAN_L_07-19.png?itok=test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <meta property="og:image" content="${original}" />
          <img class="hero-profile__image" src="${fullBody}" />
        `,
      }),
    );

    await expect(resolveUfcFighterMedia("Ryan Spann", 1_000)).resolves.toMatchObject({
      slug: "ryan-spann",
      headshot_url: original,
    });
  });

  it("gets a separate portrait only from the athlete hero image", async () => {
    const hero = "https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-09/ROSAS_JR_RAUL_L_09-26.png?itok=abc";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <meta property="og:image" content="https://ufc.com/images/2026-09/ROSAS_JR_RAUL_09-26.png" />
        <img class="opponent-card" src="https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-09/WRONG_OPPONENT_L.png" />
        <img class="hero-profile__image" src="${hero}" />
        <img class="banner" src="https://ufc.com/images/2026-09/EVENT_BANNER.png" />
      `,
    }));

    await expect(resolveUfcFighterMedia("Raul Rosas Jr", 1_000, "raul-rosas-jr")).resolves.toMatchObject({
      // Headshot behavior remains driven by og:image.
      headshot_url: "https://ufc.com/images/2026-09/ROSAS_JR_RAUL_09-26.png",
      portrait_url: "https://ufc.com/images/2026-09/ROSAS_JR_RAUL_L_09-26.png",
      portrait_fallback_url: hero,
    });
  });

  it("does not promote opponent, banner, or silhouette imagery to portraits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <meta property="og:image" content="https://ufc.com/images/2026-09/RAUL_ROSAS.png" />
        <img class="opponent-card" src="https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-09/OTHER_FIGHTER.png" />
        <img class="event-banner" src="https://ufc.com/images/2026-09/EVENT.png" />
        <img class="hero-profile__image" src="https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-09/silhouette-placeholder.png" />
      `,
    }));

    await expect(resolveUfcFighterMedia("Raul Rosas", 1_000, "raul-rosas")).resolves.toMatchObject({
      portrait_url: null,
      portrait_fallback_url: null,
    });
  });

  it("continues from the Brazilian page to the international page for a portrait", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input: string) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith("https://www.ufc.com.br/")) {
        return {
          ok: true,
          text: async () => `<meta property="og:image" content="https://ufc.com/images/2026-09/TEST_FIGHTER.png" />`,
        };
      }
      return {
        ok: true,
        text: async () => `
          <meta property="og:image" content="https://ufc.com/images/2026-09/TEST_FIGHTER.png" />
          <img class="hero-profile__image" src="https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-09/TEST_FIGHTER_L.png" />
        `,
      };
    }));

    const result = await resolveUfcFighterMedia("Test Fighter", 1_000, "test-fighter", true);
    expect(calls).toHaveLength(2);
    expect(result?.portrait_url).toBe("https://ufc.com/images/2026-09/TEST_FIGHTER_L.png");
    expect(result?.ufc_url).toBe("https://www.ufc.com/athlete/test-fighter");
  });

  it("caps concurrent portrait lookups and lets saturated requests retry", async () => {
    const deferred: Array<(value: { ok: boolean }) => void> = [];
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount <= 32) return new Promise((resolve) => deferred.push(resolve));
      return Promise.resolve({ ok: false });
    }));

    const pending = Array.from({ length: 32 }, (_, index) =>
      getCachedUfcFighterPortrait(`Capacity Test ${index}`),
    );
    await expect(getCachedUfcFighterPortrait("Capacity Test Extra")).rejects.toMatchObject({
      name: "UfcPortraitLookupSaturatedError",
    });
    deferred.forEach((resolve) => resolve({ ok: false }));
    await expect(Promise.all(pending)).resolves.toHaveLength(32);
  });
});
