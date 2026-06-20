import { z } from "zod";

export const createChallengeSchema = z.object({
  challengedId: z.string().uuid(),
  eventId: z.string().uuid(),
  template: z.enum(["beat_my_score", "more_winners", "use_my_picks"]).optional(),
});

export const challengeActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});
