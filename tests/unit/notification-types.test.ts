import {
  notifyEventRecapReady,
  notifyLeagueRankChanged,
  notifyChatMention,
  notifyRivalryResult,
  notifyLevelUp,
} from "@/server/services/notifications";
import {
  createNotification,
  shouldNotifyUser,
} from "@/server/repositories/notifications";
import { findPublicProfileByNickname } from "@/server/repositories/profiles";
import { getAdminSupabase } from "@/server/supabase";

vi.mock("@/server/supabase");
vi.mock("@/server/repositories/notifications");
vi.mock("@/server/repositories/profiles");

const mockAdminClient = {
  from: vi.fn(() => mockAdminClient),
  select: vi.fn(() => mockAdminClient),
  insert: vi.fn(() => mockAdminClient),
  eq: vi.fn(() => mockAdminClient),
  single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
} as any;

const mockCreated: any[] = [];

beforeEach(() => {
  vi.mocked(getAdminSupabase).mockResolvedValue(mockAdminClient);
  vi.mocked(shouldNotifyUser).mockResolvedValue(true);
  vi.mocked(createNotification).mockImplementation(async (_client, payload: any) => {
    mockCreated.push(payload);
    return { id: `notif-${mockCreated.length}`, ...payload };
  });
  vi.mocked(findPublicProfileByNickname).mockImplementation(
    async (_client, nickname: string) => {
      if (nickname === "unknown") return null;
      return { id: `user-${nickname}`, nickname } as any;
    },
  );
});

afterEach(() => {
  vi.clearAllMocks();
  mockCreated.length = 0;
});

describe("notification types", () => {
  it("notifyEventRecapReady creates correct dedupe key", async () => {
    await notifyEventRecapReady("user-1", "UFC 300", "ufc-300");

    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: "user-1",
        type: "event_recap_ready",
        title: "Recap pronto!",
        dedupe_key: "user-1::ufc-300::recap_ready",
        target_path: "/recap/ufc-300",
      }),
    );
  });

  it("notifyLeagueRankChanged includes position delta", async () => {
    await notifyLeagueRankChanged(
      "user-1",
      "Liga Top",
      "UFC 300",
      "ufc-300",
      3,
      5,
    );

    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: "user-1",
        type: "league_rank_changed",
        dedupe_key: "user-1::ufc-300::rank_3",
        target_path: "/recap/ufc-300",
      }),
    );

    const call = vi.mocked(createNotification).mock.calls[0][1] as any;
    expect(call.message).toContain("subiu");
    expect(call.message).toContain("3º");
    expect(call.message).toContain("+2");
  });

  it("notifyLeagueRankChanged handles drop in position", async () => {
    await notifyLeagueRankChanged(
      "user-1",
      "Liga Top",
      "UFC 300",
      "ufc-300",
      5,
      3,
    );

    const call = vi.mocked(createNotification).mock.calls[0][1] as any;
    expect(call.message).toContain("caiu");
    expect(call.message).toContain("5º");
    expect(call.message).toContain("-2");
  });

  it("notifyChatMention resolves mentioned user by nickname", async () => {
    await notifyChatMention("fulano", "beltrano", "hello @beltrano!");

    expect(findPublicProfileByNickname).toHaveBeenCalledWith(
      expect.anything(),
      "beltrano",
    );

    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: "user-beltrano",
        type: "chat_mention",
        title: "Menção no chat",
        target_path: "/chat",
      }),
    );

    const call = vi.mocked(createNotification).mock.calls[0][1] as any;
    expect(call.message).toContain("fulano mencionou voce");
    expect(call.message).toContain("hello @beltrano!");
  });

  it("notifyChatMention does not notify for unknown nickname", async () => {
    await notifyChatMention("fulano", "unknown", "hello @unknown!");

    expect(createNotification).not.toHaveBeenCalled();
  });

  it("notifyRivalryResult includes win", async () => {
    await notifyRivalryResult("user-1", "beltrano", "UFC 300", "ufc-300", "win");

    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: "user-1",
        type: "rivalry_result",
        title: "Vitória na rivalidade!",
        dedupe_key: "user-1::ufc-300::rivalry_win",
      }),
    );

    const call = vi.mocked(createNotification).mock.calls[0][1] as any;
    expect(call.message).toContain("venceu beltrano");
  });

  it("notifyRivalryResult includes loss and draw", async () => {
    await notifyRivalryResult("user-1", "beltrano", "UFC 300", "ufc-300", "loss");
    const lossCall = vi.mocked(createNotification).mock.calls[0][1] as any;
    expect(lossCall.title).toBe("Derrota na rivalidade");
    expect(lossCall.message).toContain("beltrano venceu voce");

    await notifyRivalryResult("user-2", "fulano", "UFC 300", "ufc-300", "draw");
    const drawCall = vi.mocked(createNotification).mock.calls[1][1] as any;
    expect(drawCall.title).toBe("Rivalidade empatou");
    expect(drawCall.message).toContain("empatada");
  });

  it("notifyLevelUp sends with correct level title", async () => {
    await notifyLevelUp("user-1", 3);

    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: "user-1",
        type: "level_up",
        title: "Level Up!",
        dedupe_key: "user-1::level_3",
      }),
    );

    const call = vi.mocked(createNotification).mock.calls[0][1] as any;
    expect(call.message).toContain("nivel 3");
    expect(call.message).toContain("Strategist");
  });

  it("notifyLevelUp sends Legend for level 6+", async () => {
    await notifyLevelUp("user-1", 6);

    const call = vi.mocked(createNotification).mock.calls[0][1] as any;
    expect(call.message).toContain("nivel 6");
    expect(call.message).toContain("Legend");
    expect(call.dedupe_key).toBe("user-1::level_6");
  });
});
