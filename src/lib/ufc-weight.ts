export const CANONICAL_WEIGHT_CLASSES = [
  "Heavyweight",
  "LightHeavyweight",
  "Middleweight",
  "Welterweight",
  "Lightweight",
  "Featherweight",
  "Bantamweight",
  "Flyweight",
  "Strawweight",
  "Atomweight",
  "Catchweight",
] as const;

export type CanonicalWeightClass = (typeof CANONICAL_WEIGHT_CLASSES)[number];

const WEIGHT_PATTERNS: Array<{
  value: CanonicalWeightClass;
  patterns: string[];
}> = [
  {
    value: "LightHeavyweight",
    patterns: ["light heavyweight", "meio pesado", "meio-pesado"],
  },
  {
    value: "Middleweight",
    patterns: ["middleweight", "peso medio", "médio", "medio"],
  },
  {
    value: "Welterweight",
    patterns: ["welterweight", "meio medio", "meio-medio"],
  },
  {
    value: "Lightweight",
    patterns: ["lightweight", "leve"],
  },
  {
    value: "Featherweight",
    patterns: ["featherweight", "pena"],
  },
  {
    value: "Bantamweight",
    patterns: ["bantamweight", "galo"],
  },
  {
    value: "Flyweight",
    patterns: ["flyweight", "mosca"],
  },
  {
    value: "Strawweight",
    patterns: ["strawweight", "palha"],
  },
  {
    value: "Atomweight",
    patterns: ["atomweight"],
  },
  {
    value: "Heavyweight",
    patterns: ["heavyweight", "peso pesado", "pesado"],
  },
  {
    value: "Catchweight",
    patterns: ["catchweight", "peso combinado", "combinado"],
  },
];

export const WEIGHT_CLASS_PT: Record<string, string> = {
  Heavyweight: "Peso Pesado",
  LightHeavyweight: "Meio-Pesado",
  "Light Heavyweight": "Meio-Pesado",
  Middleweight: "Médio",
  Welterweight: "Meio-Médio",
  Lightweight: "Leve",
  Featherweight: "Pena",
  Bantamweight: "Galo",
  Flyweight: "Mosca",
  Strawweight: "Palha",
  Atomweight: "Átomo",
  Catchweight: "Peso Combinado",
};

function normalizeWeightText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/women'?s|feminino|masculino|bout|fight|luta/gi, " ")
    .replace(/[^a-z\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWeightClass(raw: string): CanonicalWeightClass {
  const normalized = normalizeWeightText(raw);

  for (const rule of WEIGHT_PATTERNS) {
    if (rule.patterns.some((pattern) => normalized.includes(pattern))) {
      return rule.value;
    }
  }

  return "Catchweight";
}

export function extractWeightClassFromHtmlBlock(block: string): CanonicalWeightClass {
  const text = normalizeWeightText(
    block
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " "),
  );

  for (const rule of WEIGHT_PATTERNS) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) {
      return rule.value;
    }
  }

  return "Catchweight";
}
