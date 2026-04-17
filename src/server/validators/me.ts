import { z } from "zod";
import { COMPETITIVE_DIVISIONS } from "@/lib/ufc-weight";

export const updateMyProfileSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(3, "Nickname deve ter entre 3 e 20 caracteres.")
    .max(20, "Nickname deve ter entre 3 e 20 caracteres.")
    .regex(/^[a-zA-Z0-9_]+$/, "Nickname: apenas letras, números e _.")
    .optional(),
  division: z.enum(COMPETITIVE_DIVISIONS).optional(),
}).refine(
  (value) => value.nickname !== undefined || value.division !== undefined,
  {
    message: "Informe um nickname ou categoria.",
  },
);
