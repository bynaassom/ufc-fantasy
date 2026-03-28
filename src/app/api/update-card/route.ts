import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const WEIGHT_CLASS_MAP: Record<string, string> = {
  "peso pesado": "Heavyweight",
  heavyweight: "Heavyweight",
  "meio-pesado": "LightHeavyweight",
  "light heavyweight": "LightHeavyweight",
  médio: "Middleweight",
  middleweight: "Middleweight",
  "meio-médio": "Welterweight",
  welterweight: "Welterweight",
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
  NL: "Holanda",
  DE: "Alemanha",
  IT: "Itália",
  ES: "Espanha",
  CL: "Chile",
  AR: "Argentina",
  CO: "Colômbia",
};

function normalizeWeightClass(raw: string): string {
  const lower = raw
    .toLowerCase()
    .replace(/\s*(luta|feminino|masculino|fight)\s*/gi, " ")
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

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function namesMatch(a: string, b: string): boolean {
  if (normalize(a) === normalize(b)) return true;
  const pa = a.toLowerCase().split(" ").filter(Boolean);
  const pb = b.toLowerCase().split(" ").filter(Boolean);
  if (pa[pa.length - 1] !== pb[pb.length - 1]) return false;
  return pa[0]?.[0] === pb[0]?.[0];
}

async function scrapeCard(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`UFC.com HTTP ${res.status}`);
  const html = await res.text();

  const eventPath = url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
  const mainPos = html.indexOf('id="main-card"');
  const prelimPos = html.indexOf('id="prelims-card"');
  const earlyPos = html.indexOf('id="early-prelims"');

  const fights: any[] = [];
  const counts: Record<string, number> = {
    main: 0,
    preliminary: 0,
    early_preliminary: 0,
  };
  const seenFmids = new Set<string>();

  const fmidFindRegex = /data-fmid="(\d+)"/g;
  const fmidPositions: { fmid: string; pos: number }[] = [];
  let fm;
  while ((fm = fmidFindRegex.exec(html)) !== null) {
    fmidPositions.push({ fmid: fm[1], pos: fm.index });
  }

  const uniqueFmids = fmidPositions.filter((f) => {
    if (seenFmids.has(f.fmid)) return false;
    seenFmids.add(f.fmid);
    return true;
  });

  for (let i = 0; i < uniqueFmids.length; i++) {
    const { fmid, pos } = uniqueFmids[i];
    const nextPos = uniqueFmids[i + 1]?.pos ?? pos + 5000;
    const block = html.slice(pos, nextPos);

    let card_type = "preliminary";
    if (mainPos > 0 && pos > mainPos) {
      if (earlyPos > 0 && pos > earlyPos) card_type = "early_preliminary";
      else if (prelimPos > 0 && pos > prelimPos) card_type = "preliminary";
      else card_type = "main";
    }

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

    const names: string[] = [];
    for (const slug of slugs) {
      const anchorRe = new RegExp(
        `href="[^"]*${slug}[^"]*"[^>]*>([\\s\\S]*?)<\\/a>`,
        "i",
      );
      const am = block.match(anchorRe);
      if (am) {
        const text = am[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        names.push(text || slugToName(slug));
      } else {
        names.push(slugToName(slug));
      }
    }

    const weightLines = block.match(/(?:Peso|Weight)[^<\n,]{3,40}/gi) || [];
    const weight_class =
      weightLines.length > 0 && weightLines[0]
        ? normalizeWeightClass(weightLines[0])
        : "Catchweight";

    const is_title_fight =
      /title\s+fight|disputa\s+de\s+t[ií]tulo|championship\s+bout|cintur[aã]o/i.test(
        block,
      );

    const countries: string[] = [];
    const flagRe = /\/flags\/([A-Z]{2})\.PNG/gi;
    let flM;
    while ((flM = flagRe.exec(block)) !== null) {
      countries.push(FLAG_COUNTRY[flM[1].toUpperCase()] || "");
    }

    const headshots: string[] = [];
    const hsRe = /event_fight_card_upper_body[^"']*['"]\s*([^"']+)['"]/g;
    let hsM;
    while ((hsM = hsRe.exec(block)) !== null) headshots.push(hsM[1]);

    counts[card_type] = (counts[card_type] || 0) + 1;
    const fight_order = counts[card_type];
    const total_rounds =
      (card_type === "main" && fight_order === 1) || is_title_fight ? 5 : 3;

    fights.push({
      fmid,
      card_type,
      fight_order,
      weight_class,
      is_title_fight,
      total_rounds,
      ufc_matchup_url: `https://www.ufc.com.br${eventPath}#${fmid}`,
      fighter_a: {
        name: names[0],
        slug: slugs[0],
        country: countries[0] || "",
        headshot_url: headshots[0] || "",
      },
      fighter_b: {
        name: names[1],
        slug: slugs[1],
        country: countries[1] || "",
        headshot_url: headshots[1] || "",
      },
    });
  }

  return fights;
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

  const { event_id, confirm_removals } = await req.json();
  if (!event_id)
    return NextResponse.json(
      { error: "event_id obrigatório" },
      { status: 400 },
    );

  // Busca evento e URL do UFC.com
  const { data: event } = await adminSupabase
    .from("events")
    .select("id, name, slug, ufc_event_id")
    .eq("id", event_id)
    .single();

  if (!event)
    return NextResponse.json(
      { error: "Evento não encontrado" },
      { status: 404 },
    );

  // Monta URL do UFC.com a partir do slug do evento
  const ufcUrl = `https://www.ufc.com.br/event/${event.slug}`;

  // Busca card atualizado do UFC.com
  let scrapedFights: any[] = [];
  try {
    scrapedFights = await scrapeCard(ufcUrl);
  } catch (e: any) {
    return NextResponse.json(
      { error: `Falha ao buscar UFC.com: ${e.message}` },
      { status: 502 },
    );
  }

  if (!scrapedFights.length) {
    return NextResponse.json(
      { error: "Nenhuma luta encontrada na página do UFC.com" },
      { status: 404 },
    );
  }

  // Busca lutas atuais no banco
  const { data: currentFights } = await adminSupabase
    .from("fights")
    .select(
      `id, weight_class, card_type, fight_order, is_title_fight, total_rounds, result_confirmed, ufc_matchup_url,
      fighter_a:fighters!fighter_a_id(id, name),
      fighter_b:fighters!fighter_b_id(id, name)`,
    )
    .eq("event_id", event_id);

  const dbFights = currentFights || [];

  // ── Detecta diferenças ───────────────────────────────────────
  const added: any[] = [];
  const removed: any[] = [];
  const updated: any[] = [];

  // Lutas novas no UFC.com que não estão no banco
  for (const sf of scrapedFights) {
    const found = dbFights.find(
      (db) =>
        namesMatch((db.fighter_a as any).name, sf.fighter_a.name) &&
        namesMatch((db.fighter_b as any).name, sf.fighter_b.name),
    );
    if (!found) added.push(sf);
  }

  // Lutas no banco que não estão mais no UFC.com
  for (const db of dbFights) {
    if (db.result_confirmed) continue; // não remove lutas já confirmadas
    const found = scrapedFights.find(
      (sf) =>
        namesMatch((db.fighter_a as any).name, sf.fighter_a.name) &&
        namesMatch((db.fighter_b as any).name, sf.fighter_b.name),
    );
    if (!found) removed.push(db);
  }

  // Lutas com dados alterados (peso, ordem, card)
  for (const sf of scrapedFights) {
    const db = dbFights.find(
      (d) =>
        namesMatch((d.fighter_a as any).name, sf.fighter_a.name) &&
        namesMatch((d.fighter_b as any).name, sf.fighter_b.name),
    );
    if (!db) continue;
    const changes: Record<string, { from: any; to: any }> = {};
    if (db.weight_class !== sf.weight_class)
      changes.weight_class = { from: db.weight_class, to: sf.weight_class };
    if (db.card_type !== sf.card_type)
      changes.card_type = { from: db.card_type, to: sf.card_type };
    if (db.fight_order !== sf.fight_order)
      changes.fight_order = { from: db.fight_order, to: sf.fight_order };
    if (db.total_rounds !== sf.total_rounds)
      changes.total_rounds = { from: db.total_rounds, to: sf.total_rounds };
    if (Object.keys(changes).length > 0)
      updated.push({ db_id: db.id, changes, fight: sf });
  }

  // ── Se só preview (sem confirm_removals) retorna o diff ──────
  if (
    !confirm_removals &&
    (removed.length > 0 || added.length > 0 || updated.length > 0)
  ) {
    // Busca quantos picks cada luta removida tem
    const removedWithPicks = await Promise.all(
      removed.map(async (r) => {
        const { count } = await adminSupabase
          .from("picks")
          .select("id", { count: "exact", head: true })
          .eq("fight_id", r.id);
        return {
          ...r,
          picks_count: count || 0,
          fighter_a_name: (r.fighter_a as any).name,
          fighter_b_name: (r.fighter_b as any).name,
        };
      }),
    );

    return NextResponse.json({
      preview: true,
      added: added.map((f) => ({
        fighter_a: f.fighter_a.name,
        fighter_b: f.fighter_b.name,
        weight_class: f.weight_class,
        card_type: f.card_type,
      })),
      removed: removedWithPicks.map((r) => ({
        id: r.id,
        fighter_a: r.fighter_a_name,
        fighter_b: r.fighter_b_name,
        picks_count: r.picks_count,
      })),
      updated: updated.map((u) => ({
        fighter_a: (u.fight as any).fighter_a.name,
        fighter_b: (u.fight as any).fighter_b.name,
        changes: u.changes,
      })),
    });
  }

  // ── Aplica mudanças ──────────────────────────────────────────
  const log: string[] = [];

  // Adiciona lutas novas
  for (const sf of added) {
    // Upsert fighters
    for (const side of ["fighter_a", "fighter_b"]) {
      const f = sf[side];
      const { data: existing } = await adminSupabase
        .from("fighters")
        .select("id")
        .eq("name", f.name)
        .limit(1)
        .single();
      if (!existing) {
        await adminSupabase
          .from("fighters")
          .insert({
            name: f.name,
            headshot_url: f.headshot_url || "",
            country: f.country || "",
          });
      }
    }
    const { data: fa } = await adminSupabase
      .from("fighters")
      .select("id")
      .eq("name", sf.fighter_a.name)
      .single();
    const { data: fb } = await adminSupabase
      .from("fighters")
      .select("id")
      .eq("name", sf.fighter_b.name)
      .single();
    if (!fa || !fb) continue;

    await adminSupabase.from("fights").insert({
      event_id,
      fighter_a_id: fa.id,
      fighter_b_id: fb.id,
      card_type: sf.card_type,
      fight_order: sf.fight_order,
      weight_class: sf.weight_class,
      is_title_fight: sf.is_title_fight,
      total_rounds: sf.total_rounds,
      ufc_matchup_url: sf.ufc_matchup_url,
    });
    log.push(`✓ Adicionada: ${sf.fighter_a.name} vs ${sf.fighter_b.name}`);
  }

  // Remove lutas que foram confirmadas para remoção
  const { remove_ids } = await req.json().catch(() => ({ remove_ids: [] }));
  for (const id of remove_ids || []) {
    const db = dbFights.find((f) => f.id === id);
    if (!db) continue;
    await adminSupabase.from("picks").delete().eq("fight_id", id);
    await adminSupabase.from("fights").delete().eq("id", id);
    log.push(
      `✗ Removida: ${(db.fighter_a as any).name} vs ${(db.fighter_b as any).name}`,
    );
  }

  // Atualiza lutas com mudanças
  for (const u of updated) {
    const updateData: Record<string, any> = {};
    for (const [key, val] of Object.entries(u.changes)) {
      updateData[key] = (val as any).to;
    }
    updateData.ufc_matchup_url = u.fight.ufc_matchup_url;
    await adminSupabase.from("fights").update(updateData).eq("id", u.db_id);
    log.push(
      `↻ Atualizada: ${u.fight.fighter_a.name} vs ${u.fight.fighter_b.name}`,
    );
  }

  return NextResponse.json({ ok: true, log });
}
