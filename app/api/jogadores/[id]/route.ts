import { playerBody, playerRequest, validPlayerId } from "../upstream";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  return playerRequest(`/${id}`);
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  const body = await playerBody(request);
  if (!body) return Response.json({ detail: "Informe o nome do jogador. Nome e apelido devem ter até 255 caracteres." }, { status: 400 });
  return playerRequest(`/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  return playerRequest(`/${id}`, { method: "DELETE" });
}
