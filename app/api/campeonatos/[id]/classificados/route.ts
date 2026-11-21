import { championshipRequest, type ChampionshipContext } from "../../upstream";

export async function GET(request: Request, { params }: ChampionshipContext) {
  const quantity = new URL(request.url).searchParams.get("quantidade") || "2";
  if (!/^[1-9]\d*$/.test(quantity) || !Number.isSafeInteger(Number(quantity))) return Response.json({ detail: "Quantidade inválida." }, { status: 400 });
  return championshipRequest((await params).id, undefined, `/classificados?quantidade=${quantity}`);
}
