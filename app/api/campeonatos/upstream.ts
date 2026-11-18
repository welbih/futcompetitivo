import { apiFetch } from "../auth/session";

export type ChampionshipContext = { params: Promise<{ id: string }> };

export async function championshipRequest(id: string, init?: RequestInit, action = "") {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return Response.json({ detail: "Campeonato inválido." }, { status: 400 });
  try {
    const response = await apiFetch(`/campeonatos/${id}${action}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (response.status === 204) return new Response(null, { status: 204 });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ detail: init ? "Não foi possível confirmar a operação. Atualize o campeonato antes de tentar novamente." : "Não foi possível carregar o campeonato. Verifique a conexão com a API." }, { status: 503 });
  }
}
