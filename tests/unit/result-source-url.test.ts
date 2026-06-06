import { isAllowedScrapeUrl } from "@/lib/security";
import { blockedResultSource } from "@/lib/result-source-url";

describe("result source URLs", () => {
  it("allows ESPN FightCenter links from the Brazilian domain", () => {
    expect(
      isAllowedScrapeUrl("https://www.espn.com.br/mma/fightcenter/_/id/123"),
    ).toBe(true);
  });

  it("turns disallowed source URLs into diagnostics instead of request failures", () => {
    expect(
      blockedResultSource(
        "espn",
        "ESPN FightCenter",
        "http://www.espn.com/mma/fightcenter/_/id/123",
      ),
    ).toEqual({
      source: "espn",
      label: "ESPN FightCenter",
      url: "http://www.espn.com/mma/fightcenter/_/id/123",
      results: [],
      error: "host ou protocolo não permitido",
    });
  });
});
