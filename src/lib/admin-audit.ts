export async function logAdminAction(
  adminSupabase: any,
  {
    userId,
    action,
    details,
    suspicious = false,
  }: {
    userId?: string | null;
    action: string;
    details?: Record<string, unknown>;
    suspicious?: boolean;
  },
) {
  try {
    await adminSupabase.from("activity_logs").insert({
      user_id: userId || null,
      action,
      details: details || {},
      suspicious,
    });
  } catch {
    // Auditoria não deve quebrar o fluxo principal.
  }
}
