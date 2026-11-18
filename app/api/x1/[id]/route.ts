import { validId, x1Request } from "../upstream";
import { cookies } from "next/headers";
import { sameOrigin, sessionCookie, sessionUser } from "../../auth/session";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  const user = token ? sessionUser(token) : null;
  if (!user) return Response.json({ detail: "Entre na sua conta para continuar." }, { status: 401 });
  if (!user.isAdmin) return Response.json({ detail: "Somente administradores podem apagar X1." }, { status: 403 });
  const { id } = await context.params;
  if (!validId(Number(id))) return Response.json({ detail: "Confronto inválido." }, { status: 400 });
  return x1Request(`/${id}`, { method: "DELETE" });
}
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(Number(id))) return Response.json({ detail: "Confronto inválido." }, { status: 400 });
  return x1Request(`/${id}`);
}
