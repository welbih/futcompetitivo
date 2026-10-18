import { teamRequest, validTeamId } from "../../upstream";

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validTeamId(id)) return Response.json({ detail: "Equipe inválida." }, { status: 400 });
  return teamRequest(`/${id}/ativar`, { method: "PUT" });
}
