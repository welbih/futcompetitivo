import { requireAdmin } from "../../../../../auth/admin";
import { championshipRequest, type ChampionshipContext } from "../../../../upstream";
import { validManualTies } from "../../../../../../campeonatos/manual-ties";

export async function POST(request: Request, { params }: ChampionshipContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  if (!validManualTies(data?.confrontosPrimeiraRodada) || (data.formatoEliminatorio != null && !["JOGO_UNICO", "IDA_E_VOLTA", "IDA_E_VOLTA_FINAL_UNICA"].includes(data.formatoEliminatorio)) || (data.disputaTerceiroLugar != null && typeof data.disputaTerceiroLugar !== "boolean")) return Response.json({ detail: "Informe a primeira rodada completa, sem participantes repetidos ou confrontos vazios." }, { status: 400 });
  if (data.formaGeracaoMataMata != null && !["AUTOMATICA", "ALEATORIA"].includes(data.formaGeracaoMataMata)) return Response.json({ detail: "Forma de geração do mata a mata inválida." }, { status: 400 });
  return championshipRequest((await params).id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confrontosPrimeiraRodada: data.confrontosPrimeiraRodada.map((tie: { mandanteId: number | null; visitanteId: number | null }) => ({ mandanteId: tie.mandanteId, visitanteId: tie.visitanteId })), formatoEliminatorio: data.formatoEliminatorio ?? "JOGO_UNICO", disputaTerceiroLugar: data.disputaTerceiroLugar ?? false, ...(data.formaGeracaoMataMata != null ? { formaGeracaoMataMata: data.formaGeracaoMataMata } : {}) }) }, "/iniciar/eliminatorio/manual");
}
