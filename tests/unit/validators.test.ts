import { adminFightResultSchema, adminFightReorderSchema } from "@/server/validators/admin";
import { updateMyProfileSchema } from "@/server/validators/me";
import { saveEventPicksSchema } from "@/server/validators/picks";

describe("validators", () => {
  it("accepts valid nickname updates", () => {
    const result = updateMyProfileSchema.safeParse({ nickname: "renato_ufc" });

    expect(result.success).toBe(true);
  });

  it("accepts valid division updates", () => {
    const result = updateMyProfileSchema.safeParse({ division: "Lightweight" });

    expect(result.success).toBe(true);
  });

  it("rejects nicknames with unsupported characters", () => {
    const result = updateMyProfileSchema.safeParse({ nickname: "renato ufc" });

    expect(result.success).toBe(false);
  });

  it("rejects invalid divisions", () => {
    const result = updateMyProfileSchema.safeParse({ division: "Superweight" });

    expect(result.success).toBe(false);
  });

  it("rejects profile updates without fields", () => {
    const result = updateMyProfileSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts a valid picks batch payload", () => {
    const result = saveEventPicksSchema.safeParse({
      picks: [
        {
          fightId: "11111111-1111-4111-8111-111111111111",
          winnerId: "22222222-2222-4222-8222-222222222222",
          method: "submission",
          round: 2,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts database UUID values without an RFC version nibble in picks", () => {
    const result = saveEventPicksSchema.safeParse({
      picks: [
        {
          fightId: "908aa55f-9ff5-45dc-8bbb-ea0403f8074e",
          winnerId: "a1000009-e014-0000-0000-000000000001",
          method: "decision",
          round: 3,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty picks batch", () => {
    const result = saveEventPicksSchema.safeParse({ picks: [] });

    expect(result.success).toBe(false);
  });

  it("rejects fight reorders without ids", () => {
    const result = adminFightReorderSchema.safeParse({ fightIds: [] });

    expect(result.success).toBe(false);
  });

  it("accepts a valid manual result payload", () => {
    const result = adminFightResultSchema.safeParse({
      winner_side: "a",
      method: "knockout",
      round: 1,
    });

    expect(result.success).toBe(true);
  });
});
