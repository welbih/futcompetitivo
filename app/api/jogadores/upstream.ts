export async function playerRequest(path = "", init?: RequestInit) {
  try {
    const base = (process.env.FUTCOMPETITIVO_API_URL || "http://localhost:8080").replace(/\/$/, "");
    const response = await fetch(`${base}/jogadores${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (response.status === 204) return new Response(null, { status: 204 });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch {
    return Response.json({ detail: init ? "Não foi possível confirmar a operação. Atualize a listagem antes de tentar novamente." : "Não foi possível conectar à API para carregar os jogadores." }, { status: 503 });
  }
}

export async function playerBody(request: Request) {
  let data;
  try { data = await request.json(); } catch { return null; }
  if (!data || typeof data.nome !== "string" || !data.nome.trim() || data.nome.trim().length > 255 || (data.apelido != null && (typeof data.apelido !== "string" || data.apelido.trim().length > 255))) return null;
  return { nome: data.nome.trim(), apelido: data.apelido?.trim() || null };
}

export function validPlayerId(id: string) { return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)); }
