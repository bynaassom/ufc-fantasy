import {
  getUfcHeadshotQualityScore,
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
});
