import { z } from "zod";

export const createChallengeSchema = z.object({
  challengedId: z.string().uuid(),
  eventId: z.string().uuid(),
});

export const challengeActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});
