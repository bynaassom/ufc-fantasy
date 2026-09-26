import { NextRequest } from "next/server";
import { GET } from "@/app/api/fighter-portrait/route";

describe("GET /api/fighter-portrait", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolves a portrait without requiring a stored slug", async () => {
    const original = "https://ufc.com/images/2026-09/ROUTE_TEST_FIGHTER_L.png";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <meta property="og:image" content="https://ufc.com/images/2026-09/ROUTE_TEST_FIGHTER.png" />
        <img class="hero-profile__image" src="https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-09/ROUTE_TEST_FIGHTER_L.png" />
      `,
    }));

    const response = await GET(new NextRequest("https://local.test/api/fighter-portrait?name=Route%20Test%20Fighter"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      imageUrl: original,
      fallbackUrl: "https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-09/ROUTE_TEST_FIGHTER_L.png",
    });
  });

  it("rejects traversal slugs before making an upstream request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("https://local.test/api/fighter-portrait?name=Test%20Fighter&slug=..%2Fadmin"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
