import { cookies } from "next/headers";

export const sessionCookie = "fc-session";
export const sessionOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
export const apiBase = () => (process.env.FUTCOMPETITIVO_API_URL || "http://localhost:8080").replace(/\/$/, "");

// Claims are used only for display. The backend validates the token on API calls.
export function sessionUser(token: string) {
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now() || typeof claims.nome !== "string" || !claims.nome.trim()) return null;
    return { firstName: claims.nome.trim().split(/\s+/)[0], expiresAt: claims.exp * 1000, isAdmin: Array.isArray(claims.authorities) && claims.authorities.includes("ROLE_ADMIN") };
  } catch { return null; }
}

export async function apiFetch(path: string, init?: RequestInit) {
  const token = (await cookies()).get(sessionCookie)?.value;
  const headers = new Headers(init?.headers);
  if (token && sessionUser(token)) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${apiBase()}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
