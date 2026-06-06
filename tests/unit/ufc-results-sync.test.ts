import {
  fetchUfcStatsHtml,
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

  it("resolves UFCStats browser challenge and retries with the verification cookie", async () => {
    const url = "http://ufcstats.com/event-details/example";
    const challengeHtml = `
      <!doctype html>
      <html>
        <head><title>Loading…</title></head>
        <body>
          <p>Checking your browser…</p>
          <script>
            var nonce="testnonce",
                target=new Array(2+1).join('0');
            var n=0;
            xhr.open('POST',"/__c",true);
          </script>
        </body>
      </html>
    `;
    const eventHtml = "<table><tr><td>real event table</td></tr></table>";
    let eventFetches = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(input);

      if (requestUrl === url) {
        eventFetches += 1;
        if (eventFetches === 1) {
          return new Response(challengeHtml, {
            status: 200,
            headers: { "Set-Cookie": "_first=abc; Path=/; HttpOnly" },
          });
        }

        expect(new Headers(init?.headers).get("Cookie")).toContain("_fmc=verified");
        return new Response(eventHtml, { status: 200 });
      }

      if (requestUrl === "http://ufcstats.com/__c") {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe("nonce=testnonce&n=539");
        expect(new Headers(init?.headers).get("Cookie")).toContain("_first=abc");

        return new Response(null, {
          status: 204,
          headers: {
            "Set-Cookie": "_fmc=verified; Path=/; Max-Age=604800; HttpOnly",
          },
        });
      }

      throw new Error(`Unexpected request: ${requestUrl}`);
    });

    await expect(fetchUfcStatsHtml(url, fetchMock)).resolves.toBe(eventHtml);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
