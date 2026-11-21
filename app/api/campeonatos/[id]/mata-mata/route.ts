import { requireAdmin } from "../../../auth/admin";
import { championshipRequest, type ChampionshipContext } from "../../upstream";
import { validManualTies } from "../../../../campeonatos/manual-ties";

export async function POST(request: Request, { params }: ChampionshipContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  const choices = data?.substituicoes ?? [];
  if (!Array.isArray(choices) || choices.some(item => !Number.isSafeInteger(item?.desistenteId) || item.desistenteId <= 0 || !Number.isSafeInteger(item?.substitutoId) || item.substitutoId <= 0) || new Set(choices.map(item => item.desistenteId)).size !== choices.length || new Set(choices.map(item => item.substitutoId)).size !== choices.length) return Response.json({ detail: "Informe uma escolha válida e sem repetições para cada vaga." }, { status: 400 });
  if (data?.confrontosPrimeiraRodada != null && !validManualTies(data.confrontosPrimeiraRodada)) return Response.json({ detail: "Confrontos manuais inválidos ou incompletos." }, { status: 400 });
  return championshipRequest((await params).id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ substituicoes: choices.map(item => ({ desistenteId: item.desistenteId, substitutoId: item.substitutoId })), ...(data?.confrontosPrimeiraRodada != null ? { confrontosPrimeiraRodada: data.confrontosPrimeiraRodada.map((tie: { mandanteId: number | null; visitanteId: number | null }) => ({ mandanteId: tie.mandanteId, visitanteId: tie.visitanteId })) } : {}) }) }, "/mata-mata");
}
