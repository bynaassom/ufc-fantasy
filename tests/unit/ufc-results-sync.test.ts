import {
  mapMethod,
  namesMatch,
  parseUfcStatsEventResults,
} from "@/lib/ufc-results-sync";

describe("ufc-results-sync", () => {
  it("matches names with accents, apostrophes, and suffixes", () => {
    expect(namesMatch("José Ochoa", "Jose Ochoa")).toBe(true);
    expect(namesMatch("Lone'er Kavanagh", "Loneer Kavanagh")).toBe(true);
    expect(namesMatch("Michael Aswell Jr.", "Michael Aswell Jr")).toBe(true);
  });

  it("maps common UFCStats method labels", () => {
    expect(mapMethod("U-DEC")).toBe("decision");
    expect(mapMethod("Submission Guillotine Choke")).toBe("submission");
    expect(mapMethod("KO/TKO Punches")).toBe("knockout");
  });

  it("parses results rows using the method and round columns instead of KD stats", () => {
    const html = `
      <table>
        <tbody>
          <tr>
            <td>win</td>
            <td>
              <a href="http://ufcstats.com/fighter-details/a">Sean Strickland</a>
              <a href="http://ufcstats.com/fighter-details/b">Anthony Hernandez</a>
            </td>
            <td>1 0</td>
            <td>110 55</td>
            <td>0 0</td>
            <td>0 0</td>
            <td>Middleweight</td>
            <td>KO/TKO Punches</td>
            <td>3</td>
            <td>2:23</td>
          </tr>
          <tr>
            <td></td>
            <td>
              <a href="http://ufcstats.com/fighter-details/c">Jiri Prochazka</a>
              <a href="http://ufcstats.com/fighter-details/d">Carlos Ulberg</a>
            </td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>Light Heavyweight</td>
            <td>View Matchup</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    expect(parseUfcStatsEventResults(html)).toEqual([
      {
        winner: "Sean Strickland",
        loser: "Anthony Hernandez",
        method: "knockout",
        round: 3,
      },
    ]);
  });

  it("falls back to markdown-like rows when html parsing is unavailable", () => {
    const markdown =
      "| win | [Lone'er Kavanagh](fighter-a)  Brandon Moreno | 0 0 | 97 79 | 0 0 | 0 0 | Flyweight | U-DEC | 5 | 5:00 |";

    expect(parseUfcStatsEventResults(markdown)).toEqual([
      {
        winner: "Lone'er Kavanagh",
        loser: "Brandon Moreno",
        method: "decision",
        round: 5,
      },
    ]);
  });
});
