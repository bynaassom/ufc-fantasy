import {
  buildResultConsensusUpdates,
  parseEspnFightCenterResults,
  parseSherdogEventResults,
  parseTapologyEventResults,
  parseUfcOfficialEventResults,
  type ResultSourceSet,
} from "@/lib/fight-result-sources";

const fight = {
  id: "fight-1",
  result_confirmed: false,
  event: { slug: "ufc-fight-night-test" },
  fighter_a: { id: "fighter-song", name: "Song Yadong" },
  fighter_b: { id: "fighter-deiveson", name: "Deiveson Figueiredo" },
};

describe("fight-result-sources", () => {
  it("parses official UFC event result blocks", () => {
    const html = `
      <div class="c-listing-fight" data-fmid="123">
        <div class="c-listing-fight__corner c-listing-fight__corner--red">
          <div class="c-listing-fight__outcome c-listing-fight__outcome--win">Win</div>
          <span class="c-listing-fight__corner-name c-listing-fight__corner-name--red">
            Song Yadong
          </span>
        </div>
        <div class="c-listing-fight__corner c-listing-fight__corner--blue">
          <div class="c-listing-fight__outcome c-listing-fight__outcome--loss">Loss</div>
          <span class="c-listing-fight__corner-name c-listing-fight__corner-name--blue">
            Deiveson Figueiredo
          </span>
        </div>
        <div class="c-listing-fight__result">
          <div class="c-listing-fight__result-text method">Submission</div>
          <div class="c-listing-fight__result-text round">2</div>
          <div class="c-listing-fight__result-text time">4:42</div>
        </div>
      </div>
    `;

    expect(parseUfcOfficialEventResults(html)).toEqual([
      {
        winner: "Song Yadong",
        loser: "Deiveson Figueiredo",
        method: "submission",
        round: 2,
      },
    ]);
  });

  it("parses ESPN FightCenter embedded card JSON", () => {
    const html = `
      <script>
        window.__espn = {
          "cardSegs": [{
            "hdr": "Main Card",
            "mtchs": [{
              "awy": { "dspNm": "Song Yadong", "isWin": true },
              "hme": { "dspNm": "Deiveson Figueiredo", "isWin": false },
              "status": { "rd": "R2" },
              "dec": { "shrtDspNm": "Sub", "det": "Rear Naked Choke" }
            }]
          }]
        };
      </script>
    `;

    expect(parseEspnFightCenterResults(html)).toEqual([
      {
        winner: "Song Yadong",
        loser: "Deiveson Figueiredo",
        method: "submission",
        round: 2,
      },
    ]);
  });

  it("parses Sherdog event result rows", () => {
    const html = `
      <table>
        <tr itemprop="subEvent">
          <td><span class="final_result win">win</span></td>
          <td><a href="/fighter/Song-Yadong-101234"><span itemprop="name">Song Yadong</span></a></td>
          <td><a href="/fighter/Deiveson-Figueiredo-110485"><span itemprop="name">Deiveson Figueiredo</span></a></td>
          <td><span class="final_result loss">loss</span></td>
          <td class="winby"><b>Submission</b><br />Rear Naked Choke</td>
          <td>2</td>
          <td>4:42</td>
        </tr>
      </table>
    `;

    expect(parseSherdogEventResults(html)).toEqual([
      {
        winner: "Song Yadong",
        loser: "Deiveson Figueiredo",
        method: "submission",
        round: 2,
      },
    ]);
  });

  it("parses Tapology result blocks as best-effort source data", () => {
    const html = `
      <div class="fightCardBout">
        <a href="/fightcenter/fighters/song-yadong">Song Yadong</a>
        <span class="bout-result bout-result-win">win</span>
        <a href="/fightcenter/fighters/deiveson-figueiredo">Deiveson Figueiredo</a>
        <span class="bout-result bout-result-loss">loss</span>
        <div class="boutResultHolder">Submission (Rear Naked Choke), Round 2</div>
      </div>
    `;

    expect(parseTapologyEventResults(html)).toEqual([
      {
        winner: "Song Yadong",
        loser: "Deiveson Figueiredo",
        method: "submission",
        round: 2,
      },
    ]);
  });

  it("confirms a result when UFCStats and an official checker agree", () => {
    const sourceSets: ResultSourceSet[] = [
      {
        source: "ufcstats",
        label: "UFCStats",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "submission",
            round: 2,
          },
        ],
      },
      {
        source: "ufc",
        label: "UFC.com",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "submission",
            round: 2,
          },
        ],
      },
    ];

    expect(buildResultConsensusUpdates([fight], sourceSets)).toMatchObject({
      updates: [
        {
          fight_id: "fight-1",
          winner_id: "fighter-song",
          method: "submission",
          round: 2,
          sources: ["ufcstats", "ufc"],
        },
      ],
      conflicts: [],
    });
  });

  it("blocks a fight when trusted sources disagree on result details", () => {
    const sourceSets: ResultSourceSet[] = [
      {
        source: "ufcstats",
        label: "UFCStats",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "submission",
            round: 2,
          },
        ],
      },
      {
        source: "ufc",
        label: "UFC.com",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "decision",
            round: 5,
          },
        ],
      },
    ];

    const consensus = buildResultConsensusUpdates([fight], sourceSets);

    expect(consensus.updates).toEqual([]);
    expect(consensus.conflicts).toHaveLength(1);
    expect(consensus.conflicts[0].sources).toEqual(["ufcstats", "ufc"]);
  });

  it("uses fallback majority to resolve a UFCStats disagreement", () => {
    const sourceSets: ResultSourceSet[] = [
      {
        source: "ufcstats",
        label: "UFCStats",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "submission",
            round: 2,
          },
        ],
      },
      {
        source: "ufc",
        label: "UFC.com",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "decision",
            round: 5,
          },
        ],
      },
      {
        source: "espn",
        label: "ESPN FightCenter",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "decision",
            round: 5,
          },
        ],
      },
      {
        source: "sherdog",
        label: "Sherdog",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "decision",
            round: 5,
          },
        ],
      },
    ];

    expect(buildResultConsensusUpdates([fight], sourceSets)).toMatchObject({
      updates: [
        {
          fight_id: "fight-1",
          winner_id: "fighter-song",
          method: "decision",
          round: 5,
          sources: ["ufc", "espn", "sherdog"],
        },
      ],
      conflicts: [],
    });
  });

  it("lets Tapology break a tie when it agrees with a trusted fallback", () => {
    const sourceSets: ResultSourceSet[] = [
      {
        source: "ufcstats",
        label: "UFCStats",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "submission",
            round: 2,
          },
        ],
      },
      {
        source: "ufc",
        label: "UFC.com",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "decision",
            round: 5,
          },
        ],
      },
      {
        source: "tapology",
        label: "Tapology",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "decision",
            round: 5,
          },
        ],
      },
    ];

    expect(buildResultConsensusUpdates([fight], sourceSets).updates).toEqual([
      expect.objectContaining({
        fight_id: "fight-1",
        method: "decision",
        round: 5,
        sources: ["ufc", "tapology"],
      }),
    ]);
  });

  it("uses two fallback sources when UFCStats has no matching result", () => {
    const sourceSets: ResultSourceSet[] = [
      { source: "ufcstats", label: "UFCStats", results: [] },
      {
        source: "ufc",
        label: "UFC.com",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "submission",
            round: 2,
          },
        ],
      },
      {
        source: "espn",
        label: "ESPN FightCenter",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "submission",
            round: 2,
          },
        ],
      },
    ];

    expect(buildResultConsensusUpdates([fight], sourceSets).updates).toEqual([
      expect.objectContaining({
        fight_id: "fight-1",
        winner_id: "fighter-song",
        sources: ["ufc", "espn"],
      }),
    ]);
  });

  it("does not confirm from Tapology alone", () => {
    const sourceSets: ResultSourceSet[] = [
      {
        source: "tapology",
        label: "Tapology",
        results: [
          {
            winner: "Song Yadong",
            loser: "Deiveson Figueiredo",
            method: "submission",
            round: 2,
          },
        ],
      },
    ];

    expect(buildResultConsensusUpdates([fight], sourceSets)).toMatchObject({
      updates: [],
      conflicts: [],
    });
  });
});
