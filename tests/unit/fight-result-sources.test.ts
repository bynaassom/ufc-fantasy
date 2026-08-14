import {
  buildResultConsensusUpdates,
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

const result = {
  winner: "Song Yadong",
  loser: "Deiveson Figueiredo",
  method: "submission" as const,
  round: 2,
};

describe("fight-result-sources", () => {
  it("parses the UFC.com HTML fallback when the JSON API is unavailable", () => {
    const html = `
      <div class="c-listing-fight" data-fmid="123">
        <div class="c-listing-fight__corner c-listing-fight__corner--red">
          <div class="c-listing-fight__outcome c-listing-fight__outcome--win">Win</div>
          <span class="c-listing-fight__corner-name c-listing-fight__corner-name--red">Song Yadong</span>
        </div>
        <div class="c-listing-fight__corner c-listing-fight__corner--blue">
          <div class="c-listing-fight__outcome c-listing-fight__outcome--loss">Loss</div>
          <span class="c-listing-fight__corner-name c-listing-fight__corner-name--blue">Deiveson Figueiredo</span>
        </div>
        <div class="c-listing-fight__result">
          <div class="c-listing-fight__result-text method">Submission</div>
          <div class="c-listing-fight__result-text round">2</div>
        </div>
      </div>
    `;

    expect(parseUfcOfficialEventResults(html)).toEqual([result]);
  });

  it("confirms a result when UFCStats and UFC agree", () => {
    const sourceSets: ResultSourceSet[] = [
      { source: "ufcstats", label: "UFCStats", results: [result] },
      { source: "ufc", label: "UFC API oficial", results: [result] },
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

  it("blocks automatic import when UFCStats and UFC disagree", () => {
    const sourceSets: ResultSourceSet[] = [
      { source: "ufcstats", label: "UFCStats", results: [result] },
      {
        source: "ufc",
        label: "UFC API oficial",
        results: [{ ...result, method: "decision", round: 5 }],
      },
    ];

    const consensus = buildResultConsensusUpdates([fight], sourceSets);
    expect(consensus.updates).toEqual([]);
    expect(consensus.conflicts).toHaveLength(1);
    expect(consensus.conflicts[0].sources).toEqual(["ufcstats", "ufc"]);
  });

  it("accepts one official source while the other has not published the fight", () => {
    const sourceSets: ResultSourceSet[] = [
      { source: "ufcstats", label: "UFCStats", results: [] },
      { source: "ufc", label: "UFC API oficial", results: [result] },
    ];

    expect(buildResultConsensusUpdates([fight], sourceSets).updates).toEqual([
      expect.objectContaining({ fight_id: "fight-1", sources: ["ufc"] }),
    ]);
  });
});
