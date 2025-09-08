import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  parseJsonBody,
  validateWith,
  ok,
  fail,
  withJsonValidation,
} from "./http";
import { z } from "zod";

describe("shared/api/http", () => {
  it("parseJsonBody: 無効JSONは400 with INVALID_JSON", async () => {
    const req = new NextRequest("http://localhost/api/x", {
      method: "POST",
      body: "{oops",
      headers: { "content-type": "application/json" },
    });
    const res = await parseJsonBody(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe("INVALID_JSON");
  });

  it("validateWith: Zodエラーは400 with VALIDATION_ERROR", async () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = validateWith(schema, { name: "" });
    const res = result.unwrapOrResponse();
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("ok/fail: 統一レスポンス形状で返す", async () => {
    const s = ok({ a: 1 }, 201);
    const sb = await s.json();
    expect(s.status).toBe(201);
    expect(sb.a).toBe(1);

    const f = fail({ code: "X", message: "m" }, 418);
    const fb = await f.json();
    expect(f.status).toBe(418);
    expect(fb.code).toBe("X");
  });

  it("withJsonValidation: 正常系でスキーマ済データをハンドラへ渡す", async () => {
    const schema = z.object({ title: z.string(), n: z.number().int() });
    const handler = vi.fn(
      async (_req: NextRequest, body: z.infer<typeof schema>) =>
        ok({ echo: body.title }),
    );
    const route = withJsonValidation(schema, handler);
    const req = new NextRequest("http://localhost/api/x", {
      method: "POST",
      body: JSON.stringify({ title: "ok", n: 1 }),
      headers: { "content-type": "application/json" },
    });
    const res = await route(req);
    const b = await res.json();
    expect(res.status).toBe(200);
    expect(b.echo).toBe("ok");
    expect(handler).toHaveBeenCalled();
  });

  it("withJsonValidation: JSON不正/バリデーション不正を400で返す", async () => {
    const schema = z.object({ name: z.string().min(1) });
    const handler = vi.fn();
    const typedHandler = handler as unknown as (
      req: NextRequest,
      body: { name: string },
    ) => Promise<import("next/server").NextResponse>;
    const route = withJsonValidation(schema, typedHandler);

    // invalid json
    const badJson = new NextRequest("http://localhost/api/x", {
      method: "POST",
      body: "{bad",
      headers: { "content-type": "application/json" },
    });
    const r1 = await route(badJson);
    expect(r1.status).toBe(400);
    const j1 = await r1.json();
    expect(j1.code).toBe("INVALID_JSON");

    // validation error
    const badBody = new NextRequest("http://localhost/api/x", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
      headers: { "content-type": "application/json" },
    });
    const r2 = await route(badBody);
    expect(r2.status).toBe(400);
    const j2 = await r2.json();
    expect(j2.code).toBe("VALIDATION_ERROR");
    expect(handler).not.toHaveBeenCalled();
  });
});
