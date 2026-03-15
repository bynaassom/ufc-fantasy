import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// ─── Mapa de categorias de peso PT → enum ────────────────────
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
  DK: "Dinamarca",
  NL: "Holanda",
  DE: "Alemanha",
  IT: "Itália",
  ES: "Espanha",
};

function normalizeWeightClass(raw: string): string {
  const lower = raw
    .toLowerCase()
    .replace(/\s*(luta|feminino|masculino|fight)\s*/gi, "")
    .trim();
  for (const [key, val] of Object.entries(WEIGHT_CLASS_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "Catchweight";
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { url } = await req.json();
  if (!url)
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

  // ── Fetch HTML ───────────────────────────────────────────────
  let html = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao buscar URL: ${err}` },
      { status: 400 },
    );
  }

  const eventPath = url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");

  // ── Evento: nome, data, local, banner ────────────────────────
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = titleMatch?.[1]?.trim() || "";
  const eventName =
    rawTitle.replace(/\s*[|\-]\s*UFC.*$/i, "").trim() || rawTitle;

  const dateMatch = html.match(
    /(\d{2})\.(\d{2})\.(\d{2})\s*\/\s*(\d{1,2}):(\d{2})\s*(EDT|EST)?/i,
  );
  let event_date = "";
  if (dateMatch) {
    const [, day, month, year, hour, min, tz] = dateMatch;
    const offset = tz?.toUpperCase() === "EST" ? 5 : 4; // EDT=UTC-4, EST=UTC-5
    const utcHour = parseInt(hour) + offset;
    event_date = `20${year}-${month}-${day}T${String(utcHour).padStart(2, "0")}:${min}:00Z`;
  }

  const locationMatch = html.match(
    /(?:O2 Arena|APEX|Arena|Center|Centre|Stadium|Garden|Coliseum)[^<,\n]*/i,
  );
  const location = locationMatch
    ? locationMatch[0].replace(/<[^>]+>/g, "").trim()
    : "";

  const bannerMatch = html.match(
    /styles\/background_image[^"]*(?:src=)?["']([^"']+)["']/i,
  );
  const banner_image_url = bannerMatch ? bannerMatch[1] : "";

  // ── Lutas: extrai via data-fmid ──────────────────────────────
  interface ScrapedFight {
    card_type: string;
    fight_order: number;
    weight_class: string;
    is_title_fight: boolean;
    total_rounds: number;
    ufc_matchup_url: string;
    fighter_a: { name: string; country: string; headshot_url: string };
    fighter_b: { name: string; country: string; headshot_url: string };
  }

  const fights: ScrapedFight[] = [];
  const mainCounts: Record<string, number> = {
    main: 0,
    preliminary: 0,
    early_preliminary: 0,
  };

  // Posições das seções no HTML para determinar card_type
  const mainPos = Math.max(
    html.indexOf('id="main-card"'),
    html.toLowerCase().indexOf("card principal"),
  );
  const prelimPos = Math.max(
    html.indexOf('id="prelims-card"'),
    html.toLowerCase().indexOf('"prelims-card"'),
  );
  const earlyPos = Math.max(html.indexOf('id="early-prelims"'), -1);

  // Extrai cada bloco de luta por data-fmid
  const fightBlockRegex =
    /(<[^>]+data-fmid="(\d+)"[^>]*>)([\s\S]*?)(?=<[^>]+data-fmid="\d+"|$)/g;
  let m;

  while ((m = fightBlockRegex.exec(html)) !== null) {
    const [, , fmid, block] = m;
    const pos = m.index;

    // Determina card_type pela posição
    let card_type = "preliminary";
    if (mainPos > 0 && earlyPos > 0 && pos > earlyPos) {
      card_type = "early_preliminary";
    } else if (
      mainPos > 0 &&
      prelimPos > 0 &&
      pos < prelimPos &&
      pos > mainPos
    ) {
      card_type = "main";
    } else if (mainPos > 0 && prelimPos < 0 && pos > mainPos) {
      card_type = "main";
    }

    // Extrai atletas
    const athletes: { name: string; headshot: string }[] = [];
    const seen = new Set<string>();
    const aRegex = /href="[^"]*\/athlete\/([^"?#]+)"[^>]*>[\s\S]*?<\/a>/g;
    let aMatch;
    while ((aMatch = aRegex.exec(block)) !== null) {
      const slug = aMatch[1].trim();
      if (seen.has(slug)) continue;
      seen.add(slug);
      // Extrai nome do anchor text
      const inner = aMatch[0]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const name = inner || slugToName(slug);
      // Extrai headshot do bloco próximo
      const headshotMatch = block.match(
        /event_fight_card_upper_body[^"]*"([^"]+)"/,
      );
      athletes.push({ name, headshot: headshotMatch?.[1] || "" });
    }

    if (athletes.length < 2) continue;
    // Pula duplicatas (o UFC às vezes repete o bloco)
    if (
      fights.some(
        (f) =>
          f.fighter_a.name === athletes[0].name &&
          f.fighter_b.name === athletes[1].name,
      )
    )
      continue;

    // Extrai peso
    const weightMatch = block.match(/(?:Peso|Weight)[^<\n,]*/i);
    const weight_class = weightMatch
      ? normalizeWeightClass(weightMatch[0])
      : "Catchweight";

    // Extrai países via bandeiras
    const countries: string[] = [];
    const flagRe = /\/flags\/([A-Z]{2})\.PNG/gi;
    let flagM;
    while ((flagM = flagRe.exec(block)) !== null) {
      const code = flagM[1].toUpperCase();
      countries.push(FLAG_COUNTRY[code] || "");
    }

    // Extrai headshots individuais
    const headshotRe = /event_fight_card_upper_body[^"]*"([^"]+)"/g;
    const headshots: string[] = [];
    let hsM;
    while ((hsM = headshotRe.exec(block)) !== null) {
      headshots.push(hsM[1]);
    }

    const is_title_fight = /title|título|championship/i.test(block);
    mainCounts[card_type] = (mainCounts[card_type] || 0) + 1;
    const fight_order = mainCounts[card_type];
    const total_rounds =
      is_title_fight || (card_type === "main" && fight_order === 1) ? 5 : 3;

    fights.push({
      card_type,
      fight_order,
      weight_class,
      is_title_fight,
      total_rounds,
      ufc_matchup_url: `https://www.ufc.com.br${eventPath}#${fmid}`,
      fighter_a: {
        name: athletes[0].name,
        country: countries[0] || "",
        headshot_url: headshots[0] || "",
      },
      fighter_b: {
        name: athletes[1].name,
        country: countries[1] || "",
        headshot_url: headshots[1] || "",
      },
    });
  }

  return NextResponse.json({
    event: { name: eventName, event_date, location, banner_image_url },
    fights,
  });
}
