import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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

function normalizeWeightClass(raw: string): string {
  const lower = raw
    .toLowerCase()
    .replace(/\s*(luta|feminino|masculino|fight|peso\s*)/gi, " ")
    .replace(/\s+/g, " ")
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

// Extrai texto limpo de um trecho HTML
function extractText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

  // ── Evento ───────────────────────────────────────────────────
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = titleMatch?.[1]?.trim() || "";
  const eventName =
    rawTitle.replace(/\s*[|\-]\s*UFC.*$/i, "").trim() || rawTitle;

  // Data: padrão "28.03.26 / 20:00 EDT" — pega o horário do main card
  // Pode aparecer múltiplas vezes (prelims e main), pega o último (main card)
  const dateMatches = Array.from(
    html.matchAll(
      /(\d{2})\.(\d{2})\.(\d{2})\s*\/\s*(\d{1,2}):(\d{2})\s*(EDT|EST|UTC)?/gi,
    ),
  );
  let event_date = "";
  let picks_lock_at = "";

  if (dateMatches.length > 0) {
    // Pega o último horário encontrado = main card
    const last = dateMatches[dateMatches.length - 1];
    const [, day, month, year, hour, min, tz] = last;
    const offset = tz?.toUpperCase() === "EST" ? 5 : 4; // EDT=UTC-4, EST=UTC-5
    let utcHour = parseInt(hour) + offset;
    let utcDay = parseInt(day);
    let utcMonth = parseInt(month);
    let utcYear = 2000 + parseInt(year);

    // Normaliza overflow de hora (ex: hora 24 → dia seguinte hora 0)
    if (utcHour >= 24) {
      utcHour -= 24;
      utcDay += 1;
      // Normalização simples de dia/mês
      const d = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay));
      utcYear = d.getUTCFullYear();
      utcMonth = d.getUTCMonth() + 1;
      utcDay = d.getUTCDate();
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    event_date = `${utcYear}-${pad(utcMonth)}-${pad(utcDay)}T${pad(utcHour)}:${min}:00Z`;

    // picks_lock_at = 30 minutos antes do início do main card
    const lockDate = new Date(`${event_date}`);
    lockDate.setMinutes(lockDate.getMinutes() - 30);
    picks_lock_at = lockDate.toISOString();
  }

  const locationMatch = html.match(
    /(?:O2 Arena|APEX|Arena|Center|Centre|Stadium|Garden|Coliseum|Climate Pledge)[^<,\n]*/i,
  );
  const location = locationMatch ? extractText(locationMatch[0]) : "";

  const bannerMatch = html.match(
    /styles\/background_image[^"']*['"]\s*([^"']+)['"]/i,
  );
  const banner_image_url = bannerMatch ? bannerMatch[1] : "";

  // ── Posições das seções ──────────────────────────────────────
  const mainPos = html.indexOf('id="main-card"');
  const prelimPos = html.indexOf('id="prelims-card"');
  const earlyPos = html.indexOf('id="early-prelims"');

  // ── Extrai lutas via data-fmid ───────────────────────────────
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
  const counts: Record<string, number> = {
    main: 0,
    preliminary: 0,
    early_preliminary: 0,
  };

  // Divide HTML em blocos por data-fmid
  const fmidPositions: { fmid: string; pos: number }[] = [];
  const fmidFindRegex = /data-fmid="(\d+)"/g;
  let fm;
  while ((fm = fmidFindRegex.exec(html)) !== null) {
    fmidPositions.push({ fmid: fm[1], pos: fm.index });
  }
  // Remove duplicatas (mesmo fmid pode aparecer múltiplas vezes)
  const seenFmids = new Set<string>();
  const uniqueFmids = fmidPositions.filter((f) => {
    if (seenFmids.has(f.fmid)) return false;
    seenFmids.add(f.fmid);
    return true;
  });

  for (let i = 0; i < uniqueFmids.length; i++) {
    const { fmid, pos } = uniqueFmids[i];
    const nextPos = uniqueFmids[i + 1]?.pos ?? pos + 5000;
    const block = html.slice(pos, nextPos);

    // card_type por posição
    let card_type = "preliminary";
    if (mainPos > 0 && pos > mainPos) {
      if (earlyPos > 0 && pos > earlyPos) card_type = "early_preliminary";
      else if (prelimPos > 0 && pos > prelimPos) card_type = "preliminary";
      else card_type = "main";
    }

    // Extrai slugs dos atletas — pega os 2 primeiros únicos
    const slugs: string[] = [];
    const seenSlugs = new Set<string>();
    const slugRegex = /\/athlete\/([a-z0-9-]+)/g;
    let sm;
    while ((sm = slugRegex.exec(block)) !== null) {
      const s = sm[1];
      if (!seenSlugs.has(s)) {
        seenSlugs.add(s);
        slugs.push(s);
      }
      if (slugs.length === 2) break;
    }
    if (slugs.length < 2) continue;

    // Extrai nomes via padrão de anchor: <a href="...athlete/slug...">NOME</a>
    // O nome fica APÓS o > e ANTES do </a>, sem tags internas
    const names: string[] = [];
    for (const slug of slugs) {
      // Procura <a href="...slug...">...NOME...</a> e extrai o texto
      const anchorRe = new RegExp(
        `href="[^"]*${slug}[^"]*"[^>]*>([\\s\\S]*?)<\\/a>`,
        "i",
      );
      const anchorMatch = block.match(anchorRe);
      if (anchorMatch) {
        const text = extractText(anchorMatch[1]);
        names.push(text || slugToName(slug));
      } else {
        names.push(slugToName(slug));
      }
    }

    // Extrai categoria de peso — linha com "Peso" ou "Weight"
    const weightLines = block.match(/(?:Peso|Weight)[^<\n,]{3,40}/gi) || [];
    const weight_class =
      weightLines.length > 0 && weightLines[0]
        ? normalizeWeightClass(weightLines[0])
        : "Catchweight";

    // Title fight: só se tiver expressão explícita de disputa de título
    const is_title_fight =
      /title\s+fight|disputa\s+de\s+t[ií]tulo|championship\s+bout|disputa\s+de\s+cintur[aã]o|cintur[aã]o/i.test(
        block,
      );

    // Países via bandeiras
    const countries: string[] = [];
    const flagRe = /\/flags\/([A-Z]{2})\.PNG/gi;
    let flM;
    while ((flM = flagRe.exec(block)) !== null) {
      countries.push(FLAG_COUNTRY[flM[1].toUpperCase()] || "");
    }

    // Headshots
    const headshots: string[] = [];
    const hsRe = /event_fight_card_upper_body[^"']*['"]\s*([^"']+)['"]/g;
    let hsM;
    while ((hsM = hsRe.exec(block)) !== null) {
      headshots.push(hsM[1]);
    }

    counts[card_type] = (counts[card_type] || 0) + 1;
    const fight_order = counts[card_type];
    // 5 rounds só para: main event (main card fight_order 1) ou title fights
    const total_rounds =
      (card_type === "main" && fight_order === 1) || is_title_fight ? 5 : 3;

    fights.push({
      card_type,
      fight_order,
      weight_class,
      is_title_fight,
      total_rounds,
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

  return NextResponse.json({
    event: {
      name: eventName,
      event_date,
      picks_lock_at,
      location,
      banner_image_url,
    },
    fights,
  });
}
