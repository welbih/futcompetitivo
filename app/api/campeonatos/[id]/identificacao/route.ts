import { requireAdmin } from "../../../auth/admin";
import { championshipRequest, type ChampionshipContext } from "../../upstream";

export async function PATCH(request: Request, { params }: ChampionshipContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let raw: string, data;
  try { raw = await request.text(); data = JSON.parse(raw); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  if (!Number.isSafeInteger(data?.organizacaoId) || data.organizacaoId <= 0 || !Number.isInteger(data?.edicao) || data.edicao < 1 || data.edicao > 2147483647) return Response.json({ detail: "Informe uma organização válida e uma edição inteira entre 1 e 2147483647." }, { status: 400 });
  // Preserve numeric notation so the backend can enforce its strict JSON integer rule.
  return championshipRequest((await params).id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: raw }, "/identificacao");
}
