import { cookies } from "next/headers";
import { apiFetch, sameOrigin, sessionCookie, sessionUser } from "../../auth/session";
import { organizationWrite } from "../upstream";

type Context = { params: Promise<{ id: string }> };

async function admin(request: Request) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !sessionUser(token)?.isAdmin) return Response.json({ detail: "Somente administradores podem editar ou remover organizações." }, { status: 403 });
  return null;
}

export async function PUT(request: Request, { params }: Context) {
  const denied = await admin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return Response.json({ detail: "Organização inválida." }, { status: 400 });
  return organizationWrite(request, id);
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = await admin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return Response.json({ detail: "Organização inválida." }, { status: 400 });
  try {
    const response = await apiFetch(`/organizacoes/${id}`, { method: "DELETE" });
    if (response.status === 204) return new Response(null, { status: 204 });
    return Response.json(await response.json(), { status: response.status });
  } catch { return Response.json({ detail: "Não foi possível confirmar a remoção. Atualize a listagem antes de tentar novamente." }, { status: 503 }); }
}
