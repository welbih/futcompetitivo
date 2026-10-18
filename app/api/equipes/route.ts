import { teamBody, teamRequest } from "./upstream";

export async function GET() { return teamRequest("?situacao=AMBOS"); }

export async function POST(request: Request) {
  const body = await teamBody(request);
  if (!body) return Response.json({ detail: "Informe nome e endereço da logo da equipe, com até 255 caracteres cada." }, { status: 400 });
  return teamRequest("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}


