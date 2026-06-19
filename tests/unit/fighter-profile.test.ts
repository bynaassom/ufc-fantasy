import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockNot = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleSupabase: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          or: vi.fn(() => ({
            not: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

describe("fighter profile", () => {
  it("findFighterBySlug returns null for unknown slug", async () => {
    const { findFighterBySlug } = await import(
      "@/server/repositories/fighter-profile"
    );
    const client: any = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: null, error: null }),
            ),
          })),
        })),
      })),
    };
    const result = await findFighterBySlug(client, "no-one");
    expect(result).toBeNull();
  });

  it("getFighterProfileData throws for unknown slug", async () => {
    const { getFighterProfileData } = await import(
      "@/server/services/fighter-profile"
    );
    await expect(getFighterProfileData("no-one")).rejects.toThrow(
      "Lutador não encontrado",
    );
  });
});
