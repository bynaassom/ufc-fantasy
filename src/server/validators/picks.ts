import { z } from "zod";

export const pendingPickSchema = z.object({
  fightId: z.string().uuid(),
  winnerId: z.string().uuid(),
  method: z.enum(["decision", "submission", "knockout"]),
  round: z.number().int().min(1).max(5),
});

export const saveEventPicksSchema = z.object({
  picks: z.array(pendingPickSchema).min(1, "Nenhum pick informado."),
});
