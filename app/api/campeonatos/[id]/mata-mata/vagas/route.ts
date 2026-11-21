import { requireAdmin } from "../../../../auth/admin";
import { championshipRequest, type ChampionshipContext } from "../../../upstream";

export async function GET(request: Request, { params }: ChampionshipContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return championshipRequest((await params).id, undefined, "/mata-mata/vagas");
}
