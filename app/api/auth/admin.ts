import { cookies } from "next/headers";
import { sameOrigin, sessionCookie, sessionUser } from "./session";

export async function requireAdmin(request: Request) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  const user = token ? sessionUser(token) : null;
  if (!user) return Response.json({ detail: "Entre na sua conta para continuar." }, { status: 401 });
  if (!user.isAdmin) return Response.json({ detail: "Somente administradores podem ativar ou desativar cadastros." }, { status: 403 });
  return null;
}
