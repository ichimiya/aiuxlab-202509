import { NextRequest, NextResponse } from "next/server";
import { z, ZodSchema } from "zod";

type ErrorBody = { code: string; message: string };

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data as unknown as Record<string, unknown>, {
    status,
  });
}

export function fail(body: ErrorBody, status = 400) {
  return NextResponse.json(body, { status });
}

export async function parseJsonBody(req: NextRequest) {
  try {
    const json = await req.json();
    return ok(json, 200);
  } catch {
    return fail({ code: "INVALID_JSON", message: "無効なJSONです" }, 400);
  }
}

export function validateWith<T extends ZodSchema>(schema: T, data: unknown) {
  const parsed = (schema as ZodSchema).safeParse(data);
  return {
    success: parsed.success,
    data: parsed.success ? (parsed.data as z.infer<T>) : undefined,
    unwrapOrResponse() {
      if (parsed.success) {
        return ok(parsed.data, 200);
      }
      const first = parsed.error.issues[0];
      return fail(
        {
          code: "VALIDATION_ERROR",
          message: first?.message || "Validation error",
        },
        400,
      );
    },
  } as const;
}

export function withJsonValidation<T extends ZodSchema>(
  schema: T,
  handler: (
    req: NextRequest,
    body: z.infer<T>,
  ) => Promise<NextResponse> | NextResponse,
) {
  return async function route(req: NextRequest) {
    const parsed = await parseJsonBody(req);
    if (parsed.status !== 200) return parsed;
    const data = await parsed.json();
    const v = validateWith(schema, data);
    if (!v.success) return v.unwrapOrResponse();
    return handler(req, v.data as z.infer<T>);
  };
}
