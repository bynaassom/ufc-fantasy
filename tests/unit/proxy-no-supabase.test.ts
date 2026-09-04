import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createServerClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { proxy } from "@/proxy";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe("proxy without Supabase configuration", () => {
  beforeEach(() => {
    createServerClient.mockReset();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;

    if (originalAnonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  });

  it("keeps the public landing available", async () => {
    const response = await proxy(new NextRequest("http://localhost/"));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("keeps authentication pages available", async () => {
    const response = await proxy(new NextRequest("http://localhost/login"));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("does not expose protected routes", async () => {
    const response = await proxy(new NextRequest("http://localhost/home"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fhome",
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("does not call Supabase for anonymous public routes when configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const response = await proxy(
      new NextRequest("http://localhost/companion/example-event"),
    );

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("redirects anonymous protected requests without a remote auth call", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const response = await proxy(new NextRequest("http://localhost/event/card"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fevent%2Fcard",
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("covers authenticated sections that rely on server-side session refresh", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const response = await proxy(
      new NextRequest("http://localhost/ligas/example-group"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fligas%2Fexample-group",
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("keeps session-independent pages fast even when a cookie exists", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const response = await proxy(
      new NextRequest("http://localhost/companion/example-event", {
        headers: { cookie: "sb-project-auth-token.0=session-part" },
      }),
    );

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("refreshes session-aware public routes when a cookie exists", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });
    createServerClient.mockReturnValue({ auth: { getUser } });

    const response = await proxy(
      new NextRequest("http://localhost/convite/invite-code", {
        headers: { cookie: "sb-project-auth-token.0=session-part" },
      }),
    );

    expect(response.status).toBe(200);
    expect(createServerClient).toHaveBeenCalledOnce();
    expect(getUser).toHaveBeenCalledOnce();
  });
});
