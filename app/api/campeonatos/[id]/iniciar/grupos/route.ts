import { requireAdmin } from "../../../../auth/admin";
import { championshipRequest, type ChampionshipContext } from "../../../upstream";

export async function POST(request: Request, { params }: ChampionshipContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  const legacy = data?.grupoA != null || data?.grupoB != null;
  const groups: unknown = data?.grupos ?? (legacy ? [data.grupoA, data.grupoB] : null);
  if (!Array.isArray(groups) || groups.length < 2 || (data?.grupos != null && legacy) || data?.quantidadeGrupos != null || groups.some(group => !Array.isArray(group) || group.length < 3 || group.some(id => !Number.isSafeInteger(id) || id <= 0))) return Response.json({ detail: "Informe pelo menos dois grupos, com no mínimo três participantes em cada, sem combinar os contratos antigo e novo." }, { status: 400 });
  const ids = groups.flat();
  if (new Set(ids).size !== ids.length || !Number.isInteger(data.quantidadeClassificados) || data.quantidadeClassificados < 4 || data.quantidadeClassificados > ids.length || groups.some(group => group.length < Math.floor(data.quantidadeClassificados / groups.length)) || (data.turnoEreturno != null && typeof data.turnoEreturno !== "boolean")) return Response.json({ detail: "Distribua os participantes sem repetições e com vagas suficientes para os classificados." }, { status: 400 });
  if ((data.formatoEliminatorio != null && !["JOGO_UNICO", "IDA_E_VOLTA", "IDA_E_VOLTA_FINAL_UNICA"].includes(data.formatoEliminatorio)) || (data.disputaTerceiroLugar != null && typeof data.disputaTerceiroLugar !== "boolean")) return Response.json({ detail: "Configuração do mata a mata inválida." }, { status: 400 });
  if (data.formaGeracaoMataMata != null && !["AUTOMATICA", "ALEATORIA"].includes(data.formaGeracaoMataMata)) return Response.json({ detail: "Forma de geração do mata a mata inválida." }, { status: 400 });
  return championshipRequest((await params).id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grupos: groups, quantidadeClassificados: data.quantidadeClassificados, turnoEreturno: data.turnoEreturno ?? false, formatoEliminatorio: data.formatoEliminatorio ?? "JOGO_UNICO", disputaTerceiroLugar: data.disputaTerceiroLugar ?? false, ...(data.formaGeracaoMataMata != null ? { formaGeracaoMataMata: data.formaGeracaoMataMata } : {}) }) }, "/iniciar/grupos");
}
