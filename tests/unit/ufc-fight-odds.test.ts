import {
  buildUfcFightOddsUrl,
  extractUfcFightId,
  parseUfcFightOddsPayload,
} from "@/lib/ufc-fight-odds";
import { mapUfcOddsToLocalFighters } from "@/server/services/ufc-odds";

describe("ufc-fight-odds", () => {
  it("builds the official URL from a FightId", () => {
    expect(buildUfcFightOddsUrl(12928)).toBe(
      "https://www.ufc.com.br/fight-odds/12928",
    );
    expect(() => buildUfcFightOddsUrl("not-an-id")).toThrow(
      "FightId da UFC inválido",
    );
  });

  it("extracts the FightId from UFC matchup and odds URLs", () => {
    expect(
      extractUfcFightId("https://www.ufc.com.br/event/example#12928"),
    ).toBe("12928");
    expect(
      extractUfcFightId("https://www.ufc.com.br/fight-odds/13059"),
    ).toBe("13059");
    expect(extractUfcFightId("https://www.ufc.com.br/event/example#legacy")).toBeNull();
  });

  it("normalizes official red and blue odds to American notation", () => {
    expect(parseUfcFightOddsPayload({ red: -160, blue: 135 }, 12928)).toEqual({
      fightId: "12928",
      red: "-160",
      blue: "+135",
      url: "https://www.ufc.com.br/fight-odds/12928",
    });
  });

  it("keeps unpublished odds empty", () => {
    expect(parseUfcFightOddsPayload({ red: null, blue: null }, 999999)).toMatchObject({
      red: null,
      blue: null,
    });
  });

  it("maps red and blue odds when a legacy fight has local fighters reversed", () => {
    const odds = parseUfcFightOddsPayload({ red: -160, blue: 135 }, 12928);

    expect(
      mapUfcOddsToLocalFighters(
        odds,
        { fighterAName: "Blue Fighter", fighterBName: "Red Fighter" },
        { redName: "Red Fighter", blueName: "Blue Fighter" },
      ),
    ).toEqual({ oddsA: "+135", oddsB: "-160" });
  });
});
