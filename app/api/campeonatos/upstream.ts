export type ChampionshipContext = { params: Promise<{ id: string }> };

export async function championshipRequest(id: string, init?: RequestInit, action = "") {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return Response.json({ detail: "Campeonato inválido." }, { status: 400 });
  try {
    const base = (process.env.FUTCOMPETITIVO_API_URL || "http://localhost:8080").replace(/\/$/, "");
    const response = await fetch(`${base}/campeonatos/${id}${action}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ detail: init ? "Não foi possível confirmar a operação. Atualize o campeonato antes de tentar novamente." : "Não foi possível carregar o campeonato. Verifique a conexão com a API." }, { status: 503 });
  }
}
