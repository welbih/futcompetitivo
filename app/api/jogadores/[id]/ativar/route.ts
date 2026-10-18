import { playerRequest, validPlayerId } from "../../upstream";

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  return playerRequest(`/${id}/ativar`, { method: "PUT" });
}
