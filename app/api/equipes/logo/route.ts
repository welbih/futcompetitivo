import { canOptimizeTeamLogo } from "../../../equipes/logo-sources";

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("url") || "";
  if (!canOptimizeTeamLogo(src)) return Response.json({ detail: "Origem da logo não permitida." }, { status: 400 });
  try {
    const response = await fetch(src, { redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.body) return Response.json({ detail: "Logo indisponível." }, { status: 502 });
    const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
    if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(type)) { await response.body.cancel(); return Response.json({ detail: "Formato de imagem inválido." }, { status: 415 }); }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5 * 1024 * 1024) { await reader.cancel(); return Response.json({ detail: "Logo excede o limite de 5 MB." }, { status: 413 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Content-Type-Options": "nosniff" } });
  } catch { return Response.json({ detail: "Não foi possível carregar a logo." }, { status: 502 }); }
}
