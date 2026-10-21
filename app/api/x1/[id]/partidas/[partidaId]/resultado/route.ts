import { jsonBody, validId, x1Request } from "../../../../upstream";
export async function PUT(request: Request, context: { params: Promise<{ id: string; partidaId: string }> }) {
  const { id, partidaId } = await context.params;
  if (!validId(Number(id)) || !validId(Number(partidaId))) return Response.json({ detail: "Confronto ou partida inválidos." }, { status: 400 });
  const data = await jsonBody(request);
  const score = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647;
  if (!data || !score(data.golsMandante) || !score(data.golsVisitante) || (data.golsMandante === data.golsVisitante ? (data.penaltisMandante != null || data.penaltisVisitante != null) && (!score(data.penaltisMandante) || !score(data.penaltisVisitante) || data.penaltisMandante === data.penaltisVisitante) : data.penaltisMandante != null || data.penaltisVisitante != null)) return Response.json({ detail: "Informe gols válidos. Pênaltis são opcionais no empate; se informados, preencha os dois placares com um vencedor." }, { status: 400 });
  return x1Request(`/${id}/partidas/${partidaId}/resultado`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ golsMandante: data.golsMandante, golsVisitante: data.golsVisitante, penaltisMandante: data.penaltisMandante ?? null, penaltisVisitante: data.penaltisVisitante ?? null, golDeOuro: false }) });
}

