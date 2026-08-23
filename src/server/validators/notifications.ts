import { z } from "zod";

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export const fightAlertMutationSchema = z
  .object({
    scope: z.enum(["event", "fight"]),
    fightId: z.string().uuid().nullable().optional(),
    enabled: z.boolean(),
    preferences: z
      .object({
        upNext: z.boolean(),
        starting: z.boolean(),
        results: z.boolean(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "fight" && !value.fightId) {
      ctx.addIssue({
        code: "custom",
        path: ["fightId"],
        message: "fightId é obrigatório para alertas de luta.",
      });
    }
    if (value.scope === "event" && value.fightId) {
      ctx.addIssue({
        code: "custom",
        path: ["fightId"],
        message: "fightId não deve ser enviado para alertas do evento.",
      });
    }
    if (value.enabled && !value.preferences) {
      ctx.addIssue({
        code: "custom",
        path: ["preferences"],
        message: "Escolha quais alertas deseja receber.",
      });
    }
    if (
      value.enabled &&
      value.preferences &&
      !value.preferences.upNext &&
      !value.preferences.starting &&
      !value.preferences.results
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["preferences"],
        message: "Ative ao menos um tipo de alerta.",
      });
    }
  });
