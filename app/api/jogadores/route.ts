import { cookies } from "next/headers";
import { sameOrigin, sessionCookie, sessionUser } from "../auth/session";
import { playerBody, playerRequest } from "./upstream";

export async function GET() { return playerRequest("?situacao=AMBOS"); }

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !sessionUser(token)) return Response.json({ detail: "Entre na sua conta para cadastrar jogadores." }, { status: 401 });
  const body = await playerBody(request);
  if (!body) return Response.json({ detail: "Informe o nome do jogador. Nome e apelido devem ter até 255 caracteres." }, { status: 400 });
  return playerRequest("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

