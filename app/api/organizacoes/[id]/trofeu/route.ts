import { apiFetch } from "../../../auth/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return new Response(null, { status: 400 });
  try {
    const response = await apiFetch(`/organizacoes/${id}/trofeu`);
    if (!response.ok) return new Response(null, { status: response.status });
    const type = response.headers.get("content-type")?.split(";")[0];
    if (type !== "image/png" && type !== "image/svg+xml") return new Response(null, { status: 502 });
    return new Response(await response.arrayBuffer(), { headers: {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch { return new Response(null, { status: 503 }); }
}
