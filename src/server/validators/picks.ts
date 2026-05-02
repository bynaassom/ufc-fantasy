import { z } from "zod";
import { postgresUuidSchema } from "@/server/validators/ids";

export const pendingPickSchema = z.object({
  fightId: postgresUuidSchema,
  winnerId: postgresUuidSchema,
  method: z.enum(["decision", "submission", "knockout"]),
  round: z.number().int().min(1).max(5),
});

export const saveEventPicksSchema = z.object({
  picks: z.array(pendingPickSchema).min(1, "Nenhum pick informado."),
});
