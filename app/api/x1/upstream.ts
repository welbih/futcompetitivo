import { apiFetch } from "../auth/session";

export const validId = (id: unknown) => typeof id === "number" && Number.isSafeInteger(id) && id > 0;
export async function x1Request(path = "", init?: RequestInit) {
  try {
    const response = await apiFetch(`/x1${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (response.status === 204) return new Response(null, { status: 204 });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ detail: init ? "Não foi possível confirmar a operação. Atualize os confrontos antes de tentar novamente." : "Não foi possível carregar os confrontos. Verifique a conexão com a API." }, { status: 503 });
  }
}
export async function jsonBody(request: Request) {
  try { return await request.json(); } catch { return null; }
}
