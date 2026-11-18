import { apiFetch, sameOrigin, sessionCookie, sessionUser } from "../auth/session";
import { cookies } from "next/headers";
import { organizationWrite } from "./upstream";

export async function GET() {
  try {
    const response = await apiFetch("/organizacoes");
    return Response.json(await response.json(), { status: response.status });
  } catch { return Response.json({ detail: "Não foi possível carregar as organizações." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !sessionUser(token)) return Response.json({ detail: "Entre na sua conta para cadastrar organizações." }, { status: 401 });
  return organizationWrite(request);
}
