export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("content type must be application/json");
  }
  return request.json();
}

export function clientInstanceIdFromRequest(request: Request): string | undefined {
  return request.headers.get("x-flip-client") ?? undefined;
}
