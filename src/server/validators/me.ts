import { z } from "zod";

export const updateMyProfileSchema = z.object({
  nickname: z
    .string()
    .min(3, "Nickname deve ter entre 3 e 20 caracteres.")
    .max(20, "Nickname deve ter entre 3 e 20 caracteres.")
    .regex(/^[a-zA-Z0-9_]+$/, "Nickname: apenas letras, números e _."),
});
