import { championshipRequest } from "../../../../upstream";

type Context = { params: Promise<{ id: string; rodadaId: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id, rodadaId } = await params;
  if (!/^[1-9]\d*$/.test(rodadaId) || !Number.isSafeInteger(Number(rodadaId))) return Response.json({ detail: "Rodada inválida." }, { status: 400 });
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  const score = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647;
  const results = data?.resultados;
  if (!Array.isArray(results) || !results.length || !results.every((entry) => entry && Number.isSafeInteger(entry.partidaId) && entry.partidaId > 0 && score(entry.resultado?.golsMandante) && score(entry.resultado?.golsVisitante)) || new Set(results.map((entry) => entry.partidaId)).size !== results.length) {
    return Response.json({ detail: "Informe partidas sem repetição e placares inteiros a partir de zero." }, { status: 400 });
  }
  return championshipRequest(id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resultados: results.map((entry) => ({ partidaId: entry.partidaId, resultado: { golsMandante: entry.resultado.golsMandante, golsVisitante: entry.resultado.golsVisitante } })) }) }, `/rodadas/${rodadaId}/resultados`);
}
