import { requireAdmin } from "../../../auth/admin";
import { teamRequest, validTeamId } from "../../upstream";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!validTeamId(id)) return Response.json({ detail: "Equipe inválida." }, { status: 400 });
  return teamRequest(`/${id}/ativar`, { method: "PUT" });
}
