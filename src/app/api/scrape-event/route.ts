import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const WEIGHT_CLASS_MAP: Record<string, string> = {
  heavyweight: "Heavyweight",
  "light heavyweight": "LightHeavyweight",
  middleweight: "Middleweight",
  welterweight: "Welterweight",
  lightweight: "Lightweight",
  featherweight: "Featherweight",
  bantamweight: "Bantamweight",
  flyweight: "Flyweight",
  strawweight: "Strawweight",
  atomweight: "Atomweight",
  "peso pesado": "Heavyweight",
  "meio-pesado": "LightHeavyweight",
  médio: "Middleweight",
  "meio-médio": "Welterweight",
  leve: "Lightweight",
  pena: "Featherweight",
  galo: "Bantamweight",
  mosca: "Flyweight",
  palha: "Strawweight",
};

function normalizeWeightClass(raw: string): string {
  const lower = (raw || "").toLowerCase().trim();
  for (const [key, val] of Object.entries(WEIGHT_CLASS_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw;
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
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { url } = await req.json();
  if (!url)
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

  // Fetch HTML
  let html = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao buscar a URL: ${err}` },
      { status: 400 },
    );
  }

  // Limpa HTML para reduzir tokens
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 80000);

  // Claude API
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `Você é um extrator de dados de eventos de MMA/UFC.
Analise o HTML fornecido e extraia as informações do evento em JSON.
Responda APENAS com JSON válido, sem markdown, sem explicações.

Formato exato:
{
  "event": {
    "name": "UFC Fight Night: Nome vs Nome",
    "event_date": "2026-03-21T17:00:00Z",
    "location": "Arena, Cidade, País",
    "banner_image_url": ""
  },
  "fights": [
    {
      "card_type": "main",
      "fight_order": 1,
      "weight_class": "Featherweight",
      "is_title_fight": false,
      "total_rounds": 3,
      "fighter_a": { "name": "Nome Completo", "country": "País em português", "headshot_url": "" },
      "fighter_b": { "name": "Nome Completo", "country": "País em português", "headshot_url": "" }
    }
  ]
}

Regras:
- fight_order: 1 = main event (a luta mais importante/principal), números crescentes para as lutas anteriores no card. A ordem deve refletir exatamente a ordem em que as lutas aparecem no site, de cima para baixo dentro de cada card_type
- IMPORTANTE: preserve a ordem exata das lutas como aparecem no HTML. Não reordene nem agrupe por peso
- card_type: "main", "preliminary", ou "early_preliminary"
- total_rounds: 5 para main event e title fights, 3 para demais
- weight_class valores válidos: Heavyweight, LightHeavyweight, Middleweight, Welterweight, Lightweight, Featherweight, Bantamweight, Flyweight, Strawweight
- event_date em UTC
- Se não encontrar headshot ou banner, use string vazia ""`,
      messages: [
        {
          role: "user",
          content: `Extraia os dados deste evento UFC:\n\n${cleanHtml}`,
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return NextResponse.json(
      { error: `Claude API error: ${err}` },
      { status: 500 },
    );
  }

  const claudeData = await claudeRes.json();
  const rawText =
    claudeData.content
      ?.map((b: { type: string; text?: string }) =>
        b.type === "text" ? b.text : "",
      )
      .join("") || "";

  let parsed;
  try {
    const clean = rawText.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(clean);
    parsed.fights = parsed.fights.map((f: { weight_class: string }) => ({
      ...f,
      weight_class: normalizeWeightClass(f.weight_class),
    }));
  } catch {
    return NextResponse.json(
      { error: "Falha ao parsear resposta da IA", raw: rawText },
      { status: 500 },
    );
  }

  return NextResponse.json(parsed);
}
