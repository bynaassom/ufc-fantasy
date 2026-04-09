import { NextRequest } from "next/server";
import { ApiRouteError, assertSameOriginForMutation } from "@/server/api";

describe("server/api", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
      return;
    }

    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("allows same-origin mutation requests", () => {
    const request = new NextRequest("http://localhost:3000/api/me/profile", {
      method: "PATCH",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "x-forwarded-proto": "http",
      },
    });

    expect(() => assertSameOriginForMutation(request)).not.toThrow();
  });

  it("allows requests that match NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    const request = new NextRequest("https://internal.example.com/api/me/profile", {
      method: "PATCH",
      headers: {
        origin: "https://app.example.com",
        host: "internal.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => assertSameOriginForMutation(request)).not.toThrow();
  });

  it("rejects cross-origin mutation requests", () => {
    const request = new NextRequest("https://app.example.com/api/me/profile", {
      method: "PATCH",
      headers: {
        origin: "https://evil.example.com",
        host: "app.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => assertSameOriginForMutation(request)).toThrow(ApiRouteError);
    expect(() => assertSameOriginForMutation(request)).toThrow(
      "Origem da requisição não permitida.",
    );
  });
});
