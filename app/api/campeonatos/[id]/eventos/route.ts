import { apiBase } from "../../../auth/session";
import type { ChampionshipContext } from "../../upstream";

export async function GET(request: Request, { params }: ChampionshipContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return Response.json({ detail: "Campeonato inválido." }, { status: 400 });
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const cleanup = () => request.signal.removeEventListener("abort", abort);
  try {
    const headers = new Headers({ Accept: "text/event-stream" });
    const lastId = request.headers.get("last-event-id");
    if (lastId) headers.set("Last-Event-ID", lastId);
    // Public stream: no session token and no short timeout used by JSON requests.
    const response = await fetch(`${apiBase()}/campeonatos/${id}/eventos`, { headers, cache: "no-store", signal: controller.signal });
    if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
      await response.body?.cancel(); cleanup();
      return Response.json({ detail: response.status === 404 ? "Campeonato não encontrado." : "Atualizações ao vivo indisponíveis." }, { status: response.ok ? 502 : response.status });
    }
    const reader = response.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(target) {
        try {
          const { done, value } = await reader.read();
          if (done) { cleanup(); target.close(); }
          else target.enqueue(value);
        } catch (error) { cleanup(); controller.abort(); target.error(error); }
      },
      async cancel() { cleanup(); controller.abort(); await reader.cancel().catch(() => {}); },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-store, no-transform", "X-Accel-Buffering": "no" } });
  } catch {
    cleanup(); controller.abort();
    return Response.json({ detail: "Não foi possível conectar às atualizações ao vivo." }, { status: 503 });
  }
}
