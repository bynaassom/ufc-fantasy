import { describe, expect, it } from "vitest";
import { selectHomeMainEventFight } from "@/lib/home-main-event";

describe("selectHomeMainEventFight", () => {
  it("seleciona somente main + order 1", () => {
    const result = selectHomeMainEventFight([
      { id: "prelim", card_type: "preliminary", fight_order: 1 },
      { id: "main-2", card_type: "main", fight_order: 2 },
      { id: "main-1", card_type: "main", fight_order: 1 },
    ]);
    expect(result?.id).toBe("main-1");
  });

  it("não promove preliminar ou main event de outra ordem", () => {
    expect(selectHomeMainEventFight([
      { id: "prelim", card_type: "preliminary", fight_order: 1 },
      { id: "main-2", card_type: "main", fight_order: 2 },
    ])).toBeNull();
  });
});
