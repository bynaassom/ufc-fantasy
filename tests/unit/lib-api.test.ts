import { ApiClientError, getApiErrorMessage, readApiResponse } from "@/lib/api";

describe("lib/api", () => {
  it("returns data from the standard success envelope", async () => {
    const response = new Response(
      JSON.stringify({
        ok: true,
        data: { savedCount: 2 },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );

    await expect(readApiResponse<{ savedCount: number }>(response)).resolves.toEqual({
      savedCount: 2,
    });
  });

  it("supports legacy payloads without the ok envelope", async () => {
    const response = new Response(
      JSON.stringify({
        savedCount: 1,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );

    await expect(readApiResponse<{ savedCount: number }>(response)).resolves.toEqual({
      savedCount: 1,
    });
  });

  it("throws ApiClientError for standard API failures", async () => {
    const response = new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Acesso negado.",
          details: { reason: "admin_only" },
        },
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );

    await expect(readApiResponse(response)).rejects.toMatchObject({
      name: "ApiClientError",
      status: 403,
      code: "FORBIDDEN",
      details: { reason: "admin_only" },
      message: "Acesso negado.",
    } satisfies Partial<ApiClientError>);
  });

  it("extracts the best available legacy error message", () => {
    expect(getApiErrorMessage({ error: "Falha legada" })).toBe("Falha legada");
    expect(getApiErrorMessage({ error: { message: "Falha detalhada" } })).toBe(
      "Falha detalhada",
    );
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
  });
});
