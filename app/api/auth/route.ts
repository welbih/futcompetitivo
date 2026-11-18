import { cookies } from "next/headers";
import { apiBase, sameOrigin, sessionCookie, sessionOptions, sessionUser } from "./session";

export async function GET() {
  const token = (await cookies()).get(sessionCookie)?.value;
  return Response.json({ user: token ? sessionUser(token) : null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  let data;
  try { data = await request.json(); } catch { return Response.json({ detail: "Dados inválidos." }, { status: 400 }); }
  if (typeof data?.username !== "string" || !data.username.trim() || typeof data.password !== "string" || !data.password) {
    return Response.json({ detail: "Informe usuário e senha." }, { status: 400 });
  }
  const clientId = process.env.FUTCOMPETITIVO_CLIENT_ID?.trim();
  const secret = process.env.FUTCOMPETITIVO_CLIENT_SECRET;
  if (!clientId || !secret) return Response.json({ detail: "Autenticação indisponível. Configure as credenciais OAuth2 no servidor." }, { status: 503 });
  try {
    const response = await fetch(`${apiBase()}/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(secret)}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:futcompetitivo:params:oauth:grant-type:password", username: data.username.trim(), password: data.password }),
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ detail: result.error === "invalid_grant" ? "Usuário ou senha inválidos." : "Não foi possível autenticar. Verifique a configuração do serviço." }, { status: result.error === "invalid_grant" ? 401 : 502 });
    const user = typeof result.access_token === "string" ? sessionUser(result.access_token) : null;
    if (!user || result.access_token.length > 3800) throw new Error("Sessão inválida.");
    (await cookies()).set(sessionCookie, result.access_token, { ...sessionOptions, expires: new Date(user.expiresAt) });
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ detail: "Não foi possível conectar ao serviço de autenticação. Tente novamente." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ detail: "Origem inválida." }, { status: 403 });
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;
  try {
    if (token) {
      const response = await fetch(`${apiBase()}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok && response.status !== 401) throw new Error("Falha no logout.");
    }
  } catch {
    return Response.json({ detail: "Não foi possível encerrar a sessão no servidor. Tente novamente." }, { status: 503 });
  }
  store.set(sessionCookie, "", { ...sessionOptions, maxAge: 0 });
  return new Response(null, { status: 204 });
}
