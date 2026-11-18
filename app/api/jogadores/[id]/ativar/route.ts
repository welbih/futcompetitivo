import { requireAdmin } from "../../../auth/admin";
import { playerRequest, validPlayerId } from "../../upstream";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  return playerRequest(`/${id}/ativar`, { method: "PUT" });
}
