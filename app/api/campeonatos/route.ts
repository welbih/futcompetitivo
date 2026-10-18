const apiUrl = () => (process.env.FUTCOMPETITIVO_API_URL || "http://localhost:8080").replace(/\/$/, "");

async function upstream(path: string, init?: RequestInit) {
  return fetch(`${apiUrl()}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
}

export async function GET() {
  try {
    const [organizations, players, teams] = await Promise.all([
      upstream("/organizacoes"), upstream("/jogadores"), upstream("/equipes"),
    ]);
    if (!organizations.ok || !players.ok || !teams.ok) {
      return Response.json({ detail: "Não foi possível carregar as organizações, os jogadores e as equipes. Tente novamente." }, { status: 502 });
    }
    return Response.json({ organizacoes: await organizations.json(), jogadores: await players.json(), equipes: await teams.json() });
  } catch {
    return Response.json({ detail: "Não foi possível conectar à API. Verifique se o serviço está em execução e tente novamente." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let data;
  try { data = await request.json(); }
  catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  const positiveId = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  const entries = data?.participantes;
  if (!data || !positiveId(data.organizacaoId) || !positiveId(data.edicao) || data.edicao > 2147483647 ||
    !Array.isArray(entries) || entries.length < 4 ||
    !entries.every((entry: unknown) => entry !== null && typeof entry === "object" &&
      "jogadorId" in entry && "equipeId" in entry && positiveId(entry.jogadorId) && positiveId(entry.equipeId)) ||
    new Set(entries.map((entry: { jogadorId: number; equipeId: number }) => entry.jogadorId)).size !== entries.length) {
    return Response.json({ detail: "Selecione uma organização, uma edição positiva e pelo menos 4 participantes com jogador e equipe, sem repetir jogadores." }, { status: 400 });
  }
  try {
    const response = await upstream("/campeonatos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizacaoId: data.organizacaoId, edicao: data.edicao, participantes: entries.map((entry: { jogadorId: number; equipeId: number }) => ({ jogadorId: entry.jogadorId, equipeId: entry.equipeId })) }),
    });
    const result = await response.json();
    return Response.json(result, { status: response.status });
  } catch {
    return Response.json({ detail: "Não foi possível confirmar a criação. Consulte a API antes de tentar novamente para evitar duplicidade." }, { status: 503 });
  }
}



