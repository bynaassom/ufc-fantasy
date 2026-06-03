import {
  buildVerifiedCardPlan,
  getDueCardVerificationWindow,
  parseSherdogEventCardHtml,
  pickSherdogEventUrl,
  type VerificationFight,
} from "@/lib/card-verification";

const currentFight: VerificationFight = {
  id: "fight-1",
  fighter_a: { name: "Belal Muhammad" },
  fighter_b: { name: "Gabriel Bonfim" },
  card_type: "main",
  fight_order: 1,
  weight_class: "Welterweight",
  is_title_fight: false,
  total_rounds: 3,
  ufc_matchup_url: null,
};

const ufcFight = {
  fmid: "ufc-1",
  fighter_a: { name: "Belal Muhammad", country: "", headshot_url: "" },
  fighter_b: { name: "Gabriel Bonfim", country: "", headshot_url: "" },
  card_type: "main" as const,
  fight_order: 1,
  weight_class: "Welterweight",
  is_title_fight: false,
  total_rounds: 5,
  ufc_matchup_url: "https://www.ufc.com.br/event/test#ufc-1",
};

describe("card-verification", () => {
  it("selects only the most recent due verification window", () => {
    expect(
      getDueCardVerificationWindow({
        picksLockAt: "2026-06-07T20:30:00.000Z",
        now: new Date("2026-06-07T10:30:00.000Z"),
        completedScheduledFors: [],
      }),
    ).toMatchObject({
      window: "t18",
      scheduledFor: "2026-06-07T02:30:00.000Z",
    });
  });

  it("does not repeat a completed window or run after picks close", () => {
    const scheduledFor = "2026-06-04T20:30:00.000Z";

    expect(
      getDueCardVerificationWindow({
        picksLockAt: "2026-06-07T20:30:00.000Z",
        now: new Date("2026-06-05T00:00:00.000Z"),
        completedScheduledFors: [scheduledFor],
      }),
    ).toBeNull();

    expect(
      getDueCardVerificationWindow({
        picksLockAt: "2026-06-07T20:30:00.000Z",
        now: new Date("2026-06-07T20:30:00.000Z"),
        completedScheduledFors: [],
      }),
    ).toBeNull();
  });

  it("does not backfill T-72 after T-18 has already completed", () => {
    expect(
      getDueCardVerificationWindow({
        picksLockAt: "2026-06-07T20:30:00.000Z",
        now: new Date("2026-06-07T10:30:00.000Z"),
        completedScheduledFors: ["2026-06-07T02:30:00.000Z"],
      }),
    ).toBeNull();
  });

  it("finds the closest Sherdog event from the upcoming page", () => {
    const html = `
      <a href="/events/UFC-Fight-Night-278-Muhammad-vs-Bonfim-112060">
        UFC Fight Night 278 - Muhammad vs. Bonfim
      </a>
      <a href="/events/UFC-White-House-Freedom-250-Topuria-vs-Gaethje-111990">
        UFC White House - Freedom 250: Topuria vs. Gaethje
      </a>
    `;

    expect(pickSherdogEventUrl(html, "UFC Fight Night: Muhammad vs Bonfim")).toBe(
      "https://www.sherdog.com/events/UFC-Fight-Night-278-Muhammad-vs-Bonfim-112060",
    );
  });

  it("parses Sherdog main event and undercard fight pairs", () => {
    const html = `
      <div class="fight" itemprop="subEvent">
        <b>MAIN EVENT</b>
        <div class="fighter left_side"><span itemprop="name">Belal Muhammad</span></div>
        <div class="fighter right_side"><span itemprop="name">Gabriel Bonfim</span></div>
        <span class="weight_class">Welterweight</span>
      </div>
      <table class="new_table event">
        <tr itemprop="subEvent">
          <td><span itemprop="name">Bruno Silva</span></td>
          <td><span itemprop="name">Marc-Andre Barriault</span></td>
          <td class="weight_class">Middleweight</td>
        </tr>
      </table>
    `;

    expect(parseSherdogEventCardHtml(html)).toEqual([
      {
        fighter_a_name: "Belal Muhammad",
        fighter_b_name: "Gabriel Bonfim",
        is_main_event: true,
        weight_class: "Welterweight",
      },
      {
        fighter_a_name: "Bruno Silva",
        fighter_b_name: "Marc-Andre Barriault",
        is_main_event: false,
        weight_class: "Middleweight",
      },
    ]);
  });

  it("confirms five rounds when UFC and Sherdog agree it is the main event", () => {
    const plan = buildVerifiedCardPlan({
      window: "t72",
      currentFights: [currentFight],
      ufcFights: [ufcFight],
      sherdogFights: [
        {
          fighter_a_name: "Belal Muhammad",
          fighter_b_name: "Gabriel Bonfim",
          is_main_event: true,
          weight_class: "Welterweight",
        },
      ],
    });

    expect(plan.updated).toEqual([
      {
        fight_id: "fight-1",
        fight_name: "Belal Muhammad vs Gabriel Bonfim",
        changes: {
          total_rounds: { from: 3, to: 5 },
          ufc_matchup_url: {
            from: null,
            to: "https://www.ufc.com.br/event/test#ufc-1",
          },
        },
      },
    ]);
    expect(plan.alerts).toEqual([]);
  });

  it("keeps uncertain round and title changes as alerts", () => {
    const plan = buildVerifiedCardPlan({
      window: "t72",
      currentFights: [{ ...currentFight, is_title_fight: true, total_rounds: 5 }],
      ufcFights: [{ ...ufcFight, card_type: "preliminary", fight_order: 2, total_rounds: 3 }],
      sherdogFights: [],
    });

    expect(plan.updated).toEqual([]);
    expect(plan.alerts).toEqual(
      expect.arrayContaining([
        expect.stringContaining("rounds"),
        expect.stringContaining("cinturão"),
      ]),
    );
  });

  it("only removes a missing fight at T-18 when both sources agree", () => {
    expect(
      buildVerifiedCardPlan({
        window: "t72",
        currentFights: [currentFight],
        ufcFights: [],
        sherdogFights: [],
      }).removed,
    ).toEqual([]);

    expect(
      buildVerifiedCardPlan({
        window: "t18",
        currentFights: [currentFight],
        ufcFights: [],
        sherdogFights: [],
      }).removed,
    ).toEqual([
      {
        fight_id: "fight-1",
        fight_name: "Belal Muhammad vs Gabriel Bonfim",
      },
    ]);
  });

  it("does not apply changes when the tie-breaker source is unavailable", () => {
    const plan = buildVerifiedCardPlan({
      window: "t18",
      currentFights: [currentFight],
      ufcFights: [],
      sherdogFights: [],
      sherdogAvailable: false,
    });

    expect(plan.added).toEqual([]);
    expect(plan.updated).toEqual([]);
    expect(plan.removed).toEqual([]);
    expect(plan.alerts).toEqual([
      "Sherdog indisponível; nenhuma alteração automática aplicada",
    ]);
  });
});
