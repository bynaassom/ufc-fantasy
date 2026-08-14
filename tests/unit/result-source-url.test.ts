import { isAllowedScrapeUrl } from "@/lib/security";
import { blockedResultSource } from "@/lib/result-source-url";

describe("result source URLs", () => {
  it("allows configured UFCStats links", () => {
    expect(
      isAllowedScrapeUrl("http://ufcstats.com/event-details/123"),
    ).toBe(true);
  });

  it("turns disallowed source URLs into diagnostics instead of request failures", () => {
    expect(
      blockedResultSource(
        "ufc",
        "UFC.com",
        "http://www.ufc.com/event/test",
      ),
    ).toEqual({
      source: "ufc",
      label: "UFC.com",
      url: "http://www.ufc.com/event/test",
      results: [],
      error: "host ou protocolo não permitido",
    });
  });
});
