import { championshipRequest, type ChampionshipContext } from "../../upstream";

export async function POST(request: Request, { params }: ChampionshipContext) {
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  const positive = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;
  if (!data || !["LIGA", "LIGA_PARCIAL", "SWISS", "ELIMINATORIO", "MISTA", "GRUPOS"].includes(data.formato) ||
    (["MISTA", "GRUPOS"].includes(data.formato) && (!positive(data.quantidadeClassificados) || data.quantidadeClassificados < 4 || typeof data.turnoEreturno !== "boolean")) ||
    (data.formato === "ELIMINATORIO" && data.turnoEreturno != null && data.turnoEreturno !== false) ||
    (data.formato === "LIGA" && typeof data.turnoEreturno !== "boolean") ||
    (data.formato === "LIGA_PARCIAL" && (!positive(data.jogosPorParticipante) || data.jogosPorParticipante < 3)) ||
    (data.formato === "SWISS" && !positive(data.totalRodadas))) {
    return Response.json({ detail: "Escolha um formato válido. Na liga parcial, informe no mínimo 3 jogos por participante." }, { status: 400 });
  }
  const body = ["MISTA", "GRUPOS"].includes(data.formato) ? { formato: data.formato, turnoEreturno: data.turnoEreturno, quantidadeClassificados: data.quantidadeClassificados } : data.formato === "ELIMINATORIO" ? { formato: data.formato, turnoEreturno: false } : data.formato === "LIGA" ? { formato: data.formato, turnoEreturno: data.turnoEreturno } : data.formato === "SWISS" ? { formato: data.formato, totalRodadas: data.totalRodadas } : { formato: data.formato, jogosPorParticipante: data.jogosPorParticipante };
  return championshipRequest((await params).id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, "/iniciar");
}

