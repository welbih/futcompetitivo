import { championshipRequest, type ChampionshipContext } from "../../upstream";

export async function POST(request: Request, { params }: ChampionshipContext) {
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  if (data?.formato === "SWISS") return Response.json({ detail: "O formato Suíço está temporariamente desativado." }, { status: 400 });
  const positive = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;
  if (!data || !["LIGA", "LIGA_PARCIAL", "SWISS", "ELIMINATORIO", "MISTA", "MISTA_PARCIAL", "GRUPOS"].includes(data.formato) ||
    (["MISTA", "MISTA_PARCIAL", "GRUPOS"].includes(data.formato) && (!positive(data.quantidadeClassificados) || data.quantidadeClassificados < 4 || (data.formato !== "MISTA_PARCIAL" && typeof data.turnoEreturno !== "boolean"))) ||
    (data.formato === "ELIMINATORIO" && data.turnoEreturno != null && data.turnoEreturno !== false) ||
    (data.formato === "LIGA" && typeof data.turnoEreturno !== "boolean") ||
    (data.formato === "LIGA_PARCIAL" && (!positive(data.jogosPorParticipante) || data.jogosPorParticipante < 3)) ||
    (data.formato === "SWISS" && !positive(data.totalRodadas))) {
    return Response.json({ detail: "Escolha um formato válido. Na liga parcial, informe no mínimo 3 jogos por participante." }, { status: 400 });
  }
  if ((data.formatoEliminatorio != null && (!["GRUPOS", "MISTA", "MISTA_PARCIAL", "ELIMINATORIO"].includes(data.formato) || !["JOGO_UNICO", "IDA_E_VOLTA", "IDA_E_VOLTA_FINAL_UNICA"].includes(data.formatoEliminatorio))) || (data.disputaTerceiroLugar != null && typeof data.disputaTerceiroLugar !== "boolean")) return Response.json({ detail: "Configuração do mata a mata inválida." }, { status: 400 });
  if (data.formaGeracaoMataMata != null && (!["ELIMINATORIO", "MISTA", "MISTA_PARCIAL", "GRUPOS"].includes(data.formato) || !["AUTOMATICA", "ALEATORIA"].includes(data.formaGeracaoMataMata))) return Response.json({ detail: "Forma de geração do mata a mata inválida." }, { status: 400 });
  if (data.quantidadeGrupos != null && (data.formato !== "GRUPOS" || !Number.isSafeInteger(data.quantidadeGrupos) || data.quantidadeGrupos < 2)) return Response.json({ detail: "Quantidade de grupos inválida." }, { status: 400 });
  if (data.formato === "MISTA_PARCIAL" && (!positive(data.jogosPorParticipante) || data.jogosPorParticipante < 3 || (data.turnoEreturno != null && data.turnoEreturno !== false) || data.totalRodadas != null)) return Response.json({ detail: "Configuração da liga parcial inválida." }, { status: 400 });
  const body = data.formato === "MISTA_PARCIAL" ? { formato: data.formato, jogosPorParticipante: data.jogosPorParticipante, quantidadeClassificados: data.quantidadeClassificados } : ["MISTA", "MISTA_PARCIAL", "GRUPOS"].includes(data.formato) ? { formato: data.formato, turnoEreturno: data.turnoEreturno, quantidadeClassificados: data.quantidadeClassificados } : data.formato === "ELIMINATORIO" ? { formato: data.formato, turnoEreturno: false } : data.formato === "LIGA" ? { formato: data.formato, turnoEreturno: data.turnoEreturno } : data.formato === "SWISS" ? { formato: data.formato, totalRodadas: data.totalRodadas } : { formato: data.formato, jogosPorParticipante: data.jogosPorParticipante };
  return championshipRequest((await params).id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...(data.formato === "GRUPOS" && data.quantidadeGrupos != null ? { quantidadeGrupos: data.quantidadeGrupos } : {}), ...(["GRUPOS", "MISTA", "MISTA_PARCIAL", "ELIMINATORIO"].includes(data.formato) ? { formatoEliminatorio: data.formatoEliminatorio ?? "JOGO_UNICO", disputaTerceiroLugar: data.disputaTerceiroLugar ?? false, ...(data.formaGeracaoMataMata != null ? { formaGeracaoMataMata: data.formaGeracaoMataMata } : {}) } : {}) }) }, "/iniciar");
}

