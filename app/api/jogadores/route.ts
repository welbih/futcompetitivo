import { playerBody, playerRequest } from "./upstream";

export async function GET() { return playerRequest("?situacao=AMBOS"); }

export async function POST(request: Request) {
  const body = await playerBody(request);
  if (!body) return Response.json({ detail: "Informe o nome do jogador. Nome e apelido devem ter até 255 caracteres." }, { status: 400 });
  return playerRequest("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

