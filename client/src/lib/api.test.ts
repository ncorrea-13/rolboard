import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";

function stubFetch(body: string | null, status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(body, { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("parses a JSON body", async () => {
    stubFetch('{"id":1}', 200);
    expect(await apiFetch("/x")).toEqual({ id: 1 });
  });

  it("returns undefined on a 201 with an empty body", async () => {
    stubFetch("", 201);
    expect(await apiFetch("/x", { method: "POST" })).toBeUndefined();
  });

  it("returns undefined on a 204", async () => {
    stubFetch(null, 204);
    expect(await apiFetch("/x", { method: "DELETE" })).toBeUndefined();
  });

  it("throws ApiError on a failed status", async () => {
    stubFetch("nope", 400);
    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 400 });
  });
});
