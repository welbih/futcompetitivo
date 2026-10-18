export async function teamRequest(path = "", init?: RequestInit) {
  try {
    const base = (process.env.FUTCOMPETITIVO_API_URL || "http://localhost:8080").replace(/\/$/, "");
    const response = await fetch(`${base}/equipes${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (response.status === 204) return new Response(null, { status: 204 });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch {
    return Response.json({ detail: init ? "Não foi possível confirmar a operação. Atualize a listagem antes de tentar novamente." : "Não foi possível conectar à API para carregar as equipes." }, { status: 503 });
  }
}

export async function teamBody(request: Request) {
  let data;
  try { data = await request.json(); } catch { return null; }
  if (!data || typeof data.nome !== "string" || !data.nome.trim() || data.nome.trim().length > 255 || typeof data.logoUrl !== "string" || !data.logoUrl.trim() || data.logoUrl.trim().length > 255) return null;
  return { nome: data.nome.trim(), logoUrl: data.logoUrl.trim() };
}
export function validTeamId(id: string) { return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)); }

