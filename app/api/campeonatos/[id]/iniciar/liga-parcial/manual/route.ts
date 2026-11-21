import { requireAdmin } from "../../../../../auth/admin";
import { championshipRequest, type ChampionshipContext } from "../../../../upstream";
import { validPartialSchedule } from "../../../../../../campeonatos/partial-schedule";

export async function POST(request: Request, { params }: ChampionshipContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  const config = data?.configuracao;
  if (!config || !["LIGA_PARCIAL", "MISTA_PARCIAL"].includes(config.formato) || !validPartialSchedule(data.rodadas, config.jogosPorParticipante) || (config.turnoEreturno != null && config.turnoEreturno !== false) || config.totalRodadas != null) return Response.json({ detail: "Informe uma agenda completa e válida, com a mesma quantidade de jogos para todos e sem adversários repetidos." }, { status: 400 });
  const mixed = config.formato === "MISTA_PARCIAL";
  const count = new Set(data.rodadas.flatMap((round: { partidas: { mandanteId: number; visitanteId: number }[] }) => round.partidas.flatMap(match => [match.mandanteId, match.visitanteId]))).size;
  if ((mixed && (!Number.isSafeInteger(config.quantidadeClassificados) || config.quantidadeClassificados < 4 || config.quantidadeClassificados > count)) || (!mixed && [config.quantidadeClassificados, config.formatoEliminatorio, config.formaGeracaoMataMata, config.disputaTerceiroLugar].some(value => value != null)) || (config.formatoEliminatorio != null && !["JOGO_UNICO", "IDA_E_VOLTA", "IDA_E_VOLTA_FINAL_UNICA"].includes(config.formatoEliminatorio)) || (config.formaGeracaoMataMata != null && !["AUTOMATICA", "ALEATORIA"].includes(config.formaGeracaoMataMata)) || (config.disputaTerceiroLugar != null && typeof config.disputaTerceiroLugar !== "boolean")) return Response.json({ detail: "Configuração da liga parcial inválida." }, { status: 400 });
  return championshipRequest((await params).id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ configuracao: { formato: config.formato, jogosPorParticipante: config.jogosPorParticipante, ...(mixed ? { quantidadeClassificados: config.quantidadeClassificados, formatoEliminatorio: config.formatoEliminatorio, formaGeracaoMataMata: config.formaGeracaoMataMata, disputaTerceiroLugar: config.disputaTerceiroLugar } : {}) }, rodadas: data.rodadas }) }, "/iniciar/liga-parcial/manual");
}
