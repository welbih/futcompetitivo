import { cookies } from "next/headers";
import { sameOrigin, sessionCookie, sessionUser } from "../auth/session";
import { teamBody, teamRequest } from "./upstream";

export async function GET() { return teamRequest("?situacao=AMBOS"); }

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !sessionUser(token)) return Response.json({ detail: "Entre na sua conta para cadastrar equipes." }, { status: 401 });
  const body = await teamBody(request);
  if (!body) return Response.json({ detail: "Informe nome e endereço da logo da equipe, com até 255 caracteres cada." }, { status: 400 });
  return teamRequest("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}


