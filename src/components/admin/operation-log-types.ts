export type OperationLogCategory =
  | "results"
  | "events"
  | "card"
  | "odds"
  | "system";

export type OperationLogStatus =
  | "success"
  | "warning"
  | "error"
  | "running"
  | "info";

export type OperationLogTrigger = "admin" | "cron" | "system";

export type OperationLogSource = {
  label: string;
  url: string | null;
  resultsCount: number | null;
  error: string | null;
};

export type OperationLog = {
  id: string;
  category: OperationLogCategory;
  status: OperationLogStatus;
  trigger: OperationLogTrigger;
  title: string;
  summary: string;
  eventId: string | null;
  eventName: string | null;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  sources: OperationLogSource[];
  details: Record<string, unknown>;
  error: string | null;
};

export type OperationLogsResponse = {
  logs: OperationLog[];
  generatedAt: string;
};
