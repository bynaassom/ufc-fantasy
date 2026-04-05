import { isAllowedScrapeUrl } from "@/lib/security";
import { resolveUfcFighterMedia } from "@/lib/ufc-fighter-media";

const WEIGHT_CLASS_MAP: Record<string, string> = {
  "peso pesado": "Heavyweight",
  heavyweight: "Heavyweight",
  "meio-pesado": "LightHeavyweight",
  "light heavyweight": "LightHeavyweight",
  "meio pesado": "LightHeavyweight",
  médio: "Middleweight",
  middleweight: "Middleweight",
  "meio-médio": "Welterweight",
  welterweight: "Welterweight",
  "meio médio": "Welterweight",
  leve: "Lightweight",
  lightweight: "Lightweight",
  pena: "Featherweight",
  featherweight: "Featherweight",
  galo: "Bantamweight",
  bantamweight: "Bantamweight",
  mosca: "Flyweight",
  flyweight: "Flyweight",
  palha: "Strawweight",
  strawweight: "Strawweight",
  atomweight: "Atomweight",
};

const FLAG_COUNTRY: Record<string, string> = {
  RU: "Rússia",
  EN: "Inglaterra",
  US: "Estados Unidos",
  BR: "Brasil",
  PL: "Polônia",
  GE: "Geórgia",
  AU: "Austrália",
  LT: "Lituânia",
  PT: "Portugal",
  PS: "Palestina",
  WL: "País de Gales",
  FR: "França",
  BE: "Bélgica",
  IR: "Irã",
  MX: "México",
  CA: "Canadá",
  GB: "Reino Unido",
  NZ: "Nova Zelândia",
  KZ: "Cazaquistão",
  KG: "Quirguistão",
  AZ: "Azerbaijão",
  UA: "Ucrânia",
  NG: "Nigéria",
  CN: "China",
  JP: "Japão",
  KR: "Coreia do Sul",
  SE: "Suécia",
  NO: "Noruega",
  NL: "Holanda",
  DE: "Alemanha",
  IT: "Itália",
  ES: "Espanha",
  CL: "Chile",
  AR: "Argentina",
  CO: "Colômbia",
  VE: "Venezuela",
};

export type ScrapedCardFight = {
  fmid: string;
  card_type: "main" | "preliminary";
  fight_order: number;
  weight_class: string;
  is_title_fight: boolean;
  total_rounds: number;
  ufc_matchup_url: string;
  fighter_a: { name: string; country: string; headshot_url: string };
  fighter_b: { name: string; country: string; headshot_url: string };
};

function normalizeWeightClass(raw: string): string {
  const lower = raw
    .toLowerCase()
    .replace(/\s*(luta|feminino|masculino|fight|peso\s*)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [key, value] of Object.entries(WEIGHT_CLASS_MAP)) {
    if (lower.includes(key)) return value;
  }

  return "Catchweight";
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

export function namesMatch(a: string, b: string): boolean {
  if (normalizeName(a) === normalizeName(b)) return true;
  const partsA = a.toLowerCase().split(" ").filter(Boolean);
  const partsB = b.toLowerCase().split(" ").filter(Boolean);
  if (partsA[partsA.length - 1] !== partsB[partsB.length - 1]) return false;
  return partsA[0]?.[0] === partsB[0]?.[0];
}

function fightPairMatches(dbFight: any, scrapedFight: ScrapedCardFight) {
  const fighterA = (dbFight.fighter_a as any)?.name || "";
  const fighterB = (dbFight.fighter_b as any)?.name || "";

  return (
    (namesMatch(fighterA, scrapedFight.fighter_a.name) &&
      namesMatch(fighterB, scrapedFight.fighter_b.name)) ||
    (namesMatch(fighterA, scrapedFight.fighter_b.name) &&
      namesMatch(fighterB, scrapedFight.fighter_a.name))
  );
}

export async function scrapeUfcEventCard(url: string): Promise<ScrapedCardFight[]> {
  if (!isAllowedScrapeUrl(url)) {
    throw new Error("Host não permitido para scraping");
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`UFC.com HTTP ${response.status}`);
  }

  const html = await response.text();
  const eventPath = url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
  const mainPos = html.indexOf('id="main-card"');
  const prelimPos = html.indexOf('id="prelims-card"');
  const earlyPos = html.indexOf('id="early-prelims"');

  const fights: ScrapedCardFight[] = [];
  const counts: Record<"main" | "preliminary", number> = {
    main: 0,
    preliminary: 0,
  };

  const seenFmids = new Set<string>();
  const fmidFindRegex = /data-fmid="(\d+)"/g;
  const fmidPositions: { fmid: string; pos: number }[] = [];

  let fmidMatch;
  while ((fmidMatch = fmidFindRegex.exec(html)) !== null) {
    fmidPositions.push({ fmid: fmidMatch[1], pos: fmidMatch.index });
  }

  const uniqueFmids = fmidPositions.filter((item) => {
    if (seenFmids.has(item.fmid)) return false;
    seenFmids.add(item.fmid);
    return true;
  });

  for (let index = 0; index < uniqueFmids.length; index += 1) {
    const { fmid, pos } = uniqueFmids[index];
    const nextPos = uniqueFmids[index + 1]?.pos ?? pos + 5000;
    const block = html.slice(pos, nextPos);

    let cardType: "main" | "preliminary" = "preliminary";
    if (mainPos > 0 && pos > mainPos) {
      if (
        (earlyPos > 0 && pos > earlyPos) ||
        (prelimPos > 0 && pos > prelimPos)
      ) {
        cardType = "preliminary";
      } else {
        cardType = "main";
      }
    }

    const slugs: string[] = [];
    const seenSlugs = new Set<string>();
    const slugRegex = /\/athlete\/([a-z0-9-]+)/g;

    let slugMatch;
    while ((slugMatch = slugRegex.exec(block)) !== null) {
      const slug = slugMatch[1];
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        slugs.push(slug);
      }
      if (slugs.length === 2) break;
    }

    if (slugs.length < 2) continue;

    const names: string[] = [];
    for (const slug of slugs) {
      const anchorRegex = new RegExp(
        `href="[^"]*${slug}[^"]*"[^>]*>([\\s\\S]*?)<\\/a>`,
        "i",
      );
      const match = block.match(anchorRegex);
      if (match) {
        const text = match[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        names.push(text || slugToName(slug));
      } else {
        names.push(slugToName(slug));
      }
    }

    const weightLines = block.match(/(?:Peso|Weight)[^<\n,]{3,40}/gi) || [];
    const weightClass =
      weightLines.length > 0 && weightLines[0]
        ? normalizeWeightClass(weightLines[0])
        : "Catchweight";

    const isTitleFight =
      /title\s+fight|disputa\s+de\s+t[ií]tulo|championship\s+bout|cintur[aã]o/i.test(
        block,
      );

    const countries: string[] = [];
    const flagRegex = /\/flags\/([A-Z]{2})\.PNG/gi;
    let flagMatch;
    while ((flagMatch = flagRegex.exec(block)) !== null) {
      countries.push(FLAG_COUNTRY[flagMatch[1].toUpperCase()] || "");
    }

    const headshots: string[] = [];
    const headshotRegex = /event_fight_card_upper_body[^"']*['"]\s*([^"']+)['"]/g;
    let headshotMatch;
    while ((headshotMatch = headshotRegex.exec(block)) !== null) {
      headshots.push(headshotMatch[1]);
    }

    counts[cardType] += 1;
    const fightOrder = counts[cardType];
    const totalRounds =
      (cardType === "main" && fightOrder === 1) || isTitleFight ? 5 : 3;

    fights.push({
      fmid,
      card_type: cardType,
      fight_order: fightOrder,
      weight_class: weightClass,
      is_title_fight: isTitleFight,
      total_rounds: totalRounds,
      ufc_matchup_url: `https://www.ufc.com.br${eventPath}#${fmid}`,
      fighter_a: {
        name: names[0],
        country: countries[0] || "",
        headshot_url: headshots[0] || "",
      },
      fighter_b: {
        name: names[1],
        country: countries[1] || "",
        headshot_url: headshots[1] || "",
      },
    });
  }

  return fights;
}

async function ensureFighter(adminSupabase: any, fighter: ScrapedCardFight["fighter_a"]) {
  let candidate = { ...fighter };
  if (!candidate.headshot_url || !candidate.country) {
    const resolved = await resolveUfcFighterMedia(candidate.name);
    if (resolved) {
      candidate = {
        ...candidate,
        headshot_url: candidate.headshot_url || resolved.headshot_url,
        country: candidate.country || resolved.country,
      };
    }
  }

  const { data: existing, error: existingError } = await adminSupabase
    .from("fighters")
    .select("id, headshot_url, country")
    .eq("name", candidate.name)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const update: Record<string, unknown> = {};
    if (!existing.headshot_url && candidate.headshot_url) {
      update.headshot_url = candidate.headshot_url;
    }
    if (!existing.country && candidate.country) {
      update.country = candidate.country;
    }

    if (Object.keys(update).length > 0) {
      const { error: updateError } = await adminSupabase
        .from("fighters")
        .update(update)
        .eq("id", existing.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return existing.id as string;
  }

  const { data: created, error: createError } = await adminSupabase
    .from("fighters")
    .insert({
      name: candidate.name,
      headshot_url: candidate.headshot_url || "",
      country: candidate.country || "",
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || `Falha ao criar fighter ${candidate.name}`);
  }

  return created.id as string;
}

export async function syncScrapedCardForEvent(
  adminSupabase: any,
  eventId: string,
  eventUrl: string,
) {
  const scrapedFights = await scrapeUfcEventCard(eventUrl);

  const { data: currentFights, error: currentFightsError } = await adminSupabase
    .from("fights")
    .select(
      `id, weight_class, card_type, fight_order, is_title_fight, total_rounds, ufc_matchup_url,
      fighter_a:fighters!fighter_a_id(id, name),
      fighter_b:fighters!fighter_b_id(id, name)`,
    )
    .eq("event_id", eventId);

  if (currentFightsError) {
    throw new Error(currentFightsError.message);
  }

  const dbFights = currentFights || [];
  const added: string[] = [];
  const updated: string[] = [];
  let unchangedCount = 0;

  for (const scrapedFight of scrapedFights) {
    const existingFight = dbFights.find((dbFight: any) =>
      fightPairMatches(dbFight, scrapedFight),
    );

    if (!existingFight) {
      const fighterAId = await ensureFighter(adminSupabase, scrapedFight.fighter_a);
      const fighterBId = await ensureFighter(adminSupabase, scrapedFight.fighter_b);

      const { error: insertError } = await adminSupabase.from("fights").insert({
        event_id: eventId,
        fighter_a_id: fighterAId,
        fighter_b_id: fighterBId,
        card_type: scrapedFight.card_type,
        fight_order: scrapedFight.fight_order,
        weight_class: scrapedFight.weight_class,
        is_title_fight: scrapedFight.is_title_fight,
        total_rounds: scrapedFight.total_rounds,
        ufc_matchup_url: scrapedFight.ufc_matchup_url,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      added.push(`${scrapedFight.fighter_a.name} vs ${scrapedFight.fighter_b.name}`);
      continue;
    }

    const updateData: Record<string, unknown> = {};
    if (existingFight.weight_class !== scrapedFight.weight_class) {
      updateData.weight_class = scrapedFight.weight_class;
    }
    if (existingFight.card_type !== scrapedFight.card_type) {
      updateData.card_type = scrapedFight.card_type;
    }
    if (existingFight.fight_order !== scrapedFight.fight_order) {
      updateData.fight_order = scrapedFight.fight_order;
    }
    if (existingFight.is_title_fight !== scrapedFight.is_title_fight) {
      updateData.is_title_fight = scrapedFight.is_title_fight;
    }
    if (existingFight.total_rounds !== scrapedFight.total_rounds) {
      updateData.total_rounds = scrapedFight.total_rounds;
    }
    if ((existingFight.ufc_matchup_url || "") !== scrapedFight.ufc_matchup_url) {
      updateData.ufc_matchup_url = scrapedFight.ufc_matchup_url;
    }

    if (Object.keys(updateData).length === 0) {
      unchangedCount += 1;
      continue;
    }

    const { error: updateError } = await adminSupabase
      .from("fights")
      .update(updateData)
      .eq("id", existingFight.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    updated.push(`${scrapedFight.fighter_a.name} vs ${scrapedFight.fighter_b.name}`);
  }

  return {
    scraped_count: scrapedFights.length,
    added_count: added.length,
    updated_count: updated.length,
    unchanged_count: unchangedCount,
    added,
    updated,
  };
}
