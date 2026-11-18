import { requireAdmin } from "../../auth/admin";
import { cookies } from "next/headers";
import { sameOrigin, sessionCookie, sessionUser } from "../../auth/session";
import { playerBody, playerRequest, validPlayerId } from "../upstream";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  return playerRequest(`/${id}`);
}

export async function PUT(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !sessionUser(token)) return Response.json({ detail: "Entre na sua conta para editar jogadores." }, { status: 401 });
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  const body = await playerBody(request);
  if (!body) return Response.json({ detail: "Informe o nome do jogador. Nome e apelido devem ter até 255 caracteres." }, { status: 400 });
  return playerRequest(`/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!validPlayerId(id)) return Response.json({ detail: "Jogador inválido." }, { status: 400 });
  return playerRequest(`/${id}`, { method: "DELETE" });
}
