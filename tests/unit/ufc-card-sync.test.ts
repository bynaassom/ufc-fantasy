import {
  extractExcludedFightPairKeysFromNewsResults,
  diffScrapedCardAgainstExistingFights,
  parseUfcCardListArticleHtml,
  parseUfcEventCardHtml,
  parseUfcSearchNewsResults,
  type ScrapedCardFight,
} from "@/lib/ufc-card-sync";

describe("ufc-card-sync", () => {
  it("parses fight-card blocks and ignores ticker duplicates", () => {
    const html = `
      <div id="main-card"></div>
      <div class="c-listing-fight" data-fmid="12673">
        <div class="c-listing-fight__class-text">Peso Meio-Médio Luta</div>
        <div class="c-listing-fight__names-row">
          <div class="c-listing-fight__corner-name c-listing-fight__corner-name--red">
            <a href="https://www.ufc.com.br/athlete/gilbert-burns">
              <span class="c-listing-fight__corner-given-name">Gilbert</span>
              <span class="c-listing-fight__corner-family-name">Burns</span>
            </a>
          </div>
          <div class="c-listing-fight__corner-name c-listing-fight__corner-name--blue">
            <a href="https://www.ufc.com.br/athlete/mike-malott">
              <span class="c-listing-fight__corner-given-name">Mike</span>
              <span class="c-listing-fight__corner-family-name">Malott</span>
            </a>
          </div>
        </div>
        <div class="c-listing-fight__country-text">Brasil</div>
        <div class="c-listing-fight__country-text">Canadá</div>
      </div>

      <div id="prelims-card"></div>
      <div class="c-listing-fight" data-fmid="12772">
        <a href="https://www.ufc.com.br/athlete/dennis-buzukja"><img src="red.png" /></a>
        <a href="https://www.ufc.com.br/athlete/marcio-barbosa"><img src="blue.png" /></a>
        <div class="details-content__name details-content__name--red">
          <span>Dennis</span>
          <span>Buzukja</span>
        </div>
        <div class="details-content__class">Peso-pena Luta</div>
        <div class="details-content__name details-content__name--blue">
          <span>Márcio</span>
          <span>Barbosa</span>
        </div>
        <div class="c-listing-fight__country-text">Estados Unidos</div>
        <div class="c-listing-fight__country-text">Brasil</div>
      </div>

      <div class="c-listing-ticker-fightcard" data-fmid="12673">
        ticker duplicate
      </div>
    `;

    const fights = parseUfcEventCardHtml(
      html,
      "https://www.ufc.com.br/event/ufc-fight-night-april-18-2026",
    );

    expect(fights).toHaveLength(2);
    expect(fights[0]).toMatchObject({
      fmid: "12673",
      card_type: "main",
      fight_order: 1,
      total_rounds: 5,
      weight_class: "Welterweight",
      fighter_a: { name: "Gilbert Burns", country: "Brasil" },
      fighter_b: { name: "Mike Malott", country: "Canadá" },
    });
    expect(fights[1]).toMatchObject({
      fmid: "12772",
      card_type: "preliminary",
      fight_order: 1,
      total_rounds: 3,
      weight_class: "Featherweight",
      fighter_a: { name: "Dennis Buzukja", country: "Estados Unidos" },
      fighter_b: { name: "Márcio Barbosa", country: "Brasil" },
    });
  });

  it("matches reversed fighters and accented names when diffing cards", () => {
    const scrapedFight: ScrapedCardFight = {
      fmid: "12772",
      card_type: "preliminary",
      fight_order: 1,
      weight_class: "Featherweight",
      is_title_fight: false,
      total_rounds: 3,
      ufc_matchup_url: "https://www.ufc.com.br/event/ufc-fight-night-april-18-2026#12772",
      fighter_a: {
        name: "Dennis Buzukja",
        country: "Estados Unidos",
        headshot_url: "",
      },
      fighter_b: {
        name: "Márcio Barbosa",
        country: "Brasil",
        headshot_url: "",
      },
    };

    const diff = diffScrapedCardAgainstExistingFights(
      [
        {
          id: "fight-1",
          weight_class: "Featherweight",
          card_type: "preliminary",
          fight_order: 2,
          is_title_fight: false,
          total_rounds: 3,
          ufc_matchup_url: "https://www.ufc.com.br/event/old-slug#legacy",
          result_confirmed: false,
          fighter_a: { name: "Marcio Barbosa" },
          fighter_b: { name: "Dennis Buzukja" },
        },
      ],
      [scrapedFight],
    );

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0]?.db_id).toBe("fight-1");
    expect(diff.updated[0]?.changes).toMatchObject({
      fight_order: { from: 2, to: 1 },
      ufc_matchup_url: {
        from: "https://www.ufc.com.br/event/old-slug#legacy",
        to: "https://www.ufc.com.br/event/ufc-fight-night-april-18-2026#12772",
      },
    });
  });

  it("parses official news results and excludes transferred fights from article fallbacks", () => {
    const searchHtml = `
      <a class="c-card--grid-card-trending" href="/news/atualizacoes-ufc-winnipeg-2026">
        <h3>Atualizações sobre o UFC Winnipeg: Burns x Malott</h3>
        <div class="field field--name-teaser"><p>Duelo entre Allan "Puro Osso" Nascimento e Mitch Raposo foi transferido para o UFC Vegas 119.</p></div>
      </a>
      <a class="c-card--grid-card-trending" href="/news/card-completo-resultados-ufc-winnipeg-2026">
        <h3>Resultados | UFC Winnipeg: Burns x Malott</h3>
        <div class="field field--name-teaser"><p>Confira abaixo os resultados do card.</p></div>
      </a>
    `;

    const results = parseUfcSearchNewsResults(searchHtml);
    expect(results).toEqual([
      {
        title: "Atualizações sobre o UFC Winnipeg: Burns x Malott",
        teaser:
          'Duelo entre Allan "Puro Osso" Nascimento e Mitch Raposo foi transferido para o UFC Vegas 119.',
        url: "https://www.ufc.com.br/news/atualizacoes-ufc-winnipeg-2026",
      },
      {
        title: "Resultados | UFC Winnipeg: Burns x Malott",
        teaser: "Confira abaixo os resultados do card.",
        url: "https://www.ufc.com.br/news/card-completo-resultados-ufc-winnipeg-2026",
      },
    ]);

    const excluded = extractExcludedFightPairKeysFromNewsResults(results);
    const articleHtml = `
      <h3>Card Principal</h3>
      <ul>
        <li><a href="https://www.ufc.com.br/athlete/gilbert-burns">Gilbert Burns</a> x <a href="https://www.ufc.com.br/athlete/mike-malott">Mike Malott</a></li>
      </ul>
      <h3>Card Preliminar</h3>
      <ul>
        <li><a href="https://www.ufc.com.br/athlete/mitch-raposo">Mitch Raposo</a> x <a href="https://www.ufc.com.br/athlete/allan-nascimento">Allan Nascimento</a></li>
        <li><a href="https://www.ufc.com.br/athlete/john-castaneda">John Castañeda</a> x <a href="https://www.ufc.com.br/athlete/mark-vologdin">Mark Vologdin</a></li>
      </ul>
    `;

    const fights = parseUfcCardListArticleHtml(
      articleHtml,
      "https://www.ufc.com.br/news/card-completo-resultados-ufc-winnipeg-2026",
      excluded,
    );

    expect(fights.map((fight) => `${fight.fighter_a.name} vs ${fight.fighter_b.name}`)).toEqual([
      "Gilbert Burns vs Mike Malott",
      "John Castañeda vs Mark Vologdin",
    ]);
    expect(fights[1]).toMatchObject({
      card_type: "preliminary",
      fight_order: 2,
      weight_class: "Catchweight",
    });
  });
});
