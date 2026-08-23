import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUfcFighterStats, parseUfcFighterStats } from "@/lib/ufc-fighter-stats";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: any[]) => unknown) => fn,
}));

describe("parseUfcFighterStats", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lê cartel, vitórias e primeiro round em português", () => {
    const result = parseUfcFighterStats(`<html><title>Umar | UFC</title><h1>Umar Nurmagomedov</h1><div>20-1-0 (V-D-E)</div><div>KO/TKO 2 (10%)</div><div>FIN 7 (35%)</div><div>Vitórias no 1º round 5</div></html>`, "umar-nurmagomedov", "https://www.ufc.com.br/athlete/umar-nurmagomedov");
    expect(result).toMatchObject({ record: "20-1-0", winsByKoTko: 2, winsBySubmission: 7, firstRoundWins: 5, sourceUrl: "https://www.ufc.com.br/athlete/umar-nurmagomedov" });
  });

  it("lê First Round Wins e deixa ausências como null", () => {
    const result = parseUfcFighterStats(`<h1>Song Yadong</h1><div>23-9-1 (W-L-D)</div><div>KO/TKO 9 (40%)</div><div>First Round Wins 4</div>`, "song-yadong");
    expect(result?.firstRoundWins).toBe(4);
    expect(result?.winsBySubmission).toBeNull();
  });

  it("retorna null sem dados reconhecíveis", () => {
    expect(parseUfcFighterStats("<html>sem dados</html>", "unknown")).toBeNull();
  });

  it("interrompe as tentativas quando o orçamento total se esgota", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(2);

    await expect(fetchUfcFighterStats({
      slug: "fighter-test",
      name: "Fighter Test",
      totalTimeoutMs: 1,
    })).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
