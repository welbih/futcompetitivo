import { championshipRequest } from "../../../../upstream";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; partidaId: string }> }) {
  const { id, partidaId } = await params;
  if (!/^[1-9]\d*$/.test(partidaId) || !Number.isSafeInteger(Number(partidaId))) return Response.json({ detail: "Partida inválida." }, { status: 400 });
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  const validScore = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647;
  if (!validScore(data?.golsMandante) || !validScore(data?.golsVisitante)) return Response.json({ detail: "Informe os dois placares com números inteiros a partir de zero." }, { status: 400 });
  const hasPenalties = data.penaltisMandante != null || data.penaltisVisitante != null;
  if (hasPenalties && (data.golsMandante !== data.golsVisitante || !validScore(data.penaltisMandante) || !validScore(data.penaltisVisitante) || data.penaltisMandante === data.penaltisVisitante)) return Response.json({ detail: "Informe pênaltis válidos com um vencedor, somente em partidas empatadas." }, { status: 400 });
  return championshipRequest(id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ golsMandante: data.golsMandante, golsVisitante: data.golsVisitante, ...(hasPenalties ? { penaltisMandante: data.penaltisMandante, penaltisVisitante: data.penaltisVisitante } : {}) }) }, `/partidas/${partidaId}/resultado`);
}
