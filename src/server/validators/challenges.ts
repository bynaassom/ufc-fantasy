import { z } from "zod";

export const createChallengeSchema = z.object({
  challengedId: z.string().uuid(),
  eventId: z.string().uuid(),
  templateType: z.enum(["classic", "perfect_picks"]).default("classic"),
});

export const challengeActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});
