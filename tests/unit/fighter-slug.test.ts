import { describe, it, expect } from "vitest";
import { generateFighterSlug } from "@/lib/fighter-slug";

describe("generateFighterSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(generateFighterSlug("Alex Pereira")).toBe("alex-pereira");
  });

  it("removes accents", () => {
    expect(generateFighterSlug("Jose Aldo")).toBe("jose-aldo");
  });

  it("strips special characters", () => {
    expect(generateFighterSlug("Conor 'Notorious' McGregor")).toBe("conor-notorious-mcgregor");
  });

  it("handles single name", () => {
    expect(generateFighterSlug("Poatan")).toBe("poatan");
  });

  it("collapses multiple spaces into single hyphens", () => {
    expect(generateFighterSlug("Jon   Jones")).toBe("jon-jones");
  });
});
