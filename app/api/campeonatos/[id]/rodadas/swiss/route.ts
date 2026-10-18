import { championshipRequest, type ChampionshipContext } from "../../../upstream";

export async function POST(_request: Request, { params }: ChampionshipContext) {
  return championshipRequest((await params).id, { method: "POST" }, "/rodadas/swiss");
}
