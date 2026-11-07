import { jsonBody, validId, x1Request } from "../../../../upstream";
export async function PUT(request: Request, context: { params: Promise<{ id: string; partidaId: string }> }) {
  const { id, partidaId } = await context.params;
  if (!validId(Number(id)) || !validId(Number(partidaId))) return Response.json({ detail: "Confronto ou partida inválidos." }, { status: 400 });
  const data = await jsonBody(request);
  const score = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647;
  if (!data || !score(data.golsMandante) || !score(data.golsVisitante)) {
    return Response.json({ detail: "Informe gols válidos." }, { status: 400 });
  }
  const tied = data.golsMandante === data.golsVisitante;
  const hasPenalties = data.penaltisMandante != null || data.penaltisVisitante != null;
  if (tied && (!score(data.penaltisMandante) || !score(data.penaltisVisitante) || data.penaltisMandante === data.penaltisVisitante)) {
    return Response.json({ detail: "Em caso de empate, informe os dois placares de pênaltis com um vencedor." }, { status: 400 });
  }
  if (!tied && hasPenalties) {
    return Response.json({ detail: "Informe pênaltis somente em partidas empatadas." }, { status: 400 });
  }
  return x1Request(`/${id}/partidas/${partidaId}/resultado`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ golsMandante: data.golsMandante, golsVisitante: data.golsVisitante, penaltisMandante: data.penaltisMandante ?? null, penaltisVisitante: data.penaltisVisitante ?? null, golDeOuro: false }) });
}

