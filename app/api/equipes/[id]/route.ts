import { teamBody, teamRequest, validTeamId } from "../upstream";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!validTeamId(id)) return Response.json({ detail: "Equipe inválida." }, { status: 400 });
  return teamRequest(`/${id}`);
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  if (!validTeamId(id)) return Response.json({ detail: "Equipe inválida." }, { status: 400 });
  const body = await teamBody(request);
  if (!body) return Response.json({ detail: "Informe nome e endereço da logo da equipe, com até 255 caracteres cada." }, { status: 400 });
  return teamRequest(`/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!validTeamId(id)) return Response.json({ detail: "Equipe inválida." }, { status: 400 });
  return teamRequest(`/${id}`, { method: "DELETE" });
}

