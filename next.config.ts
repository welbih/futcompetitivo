import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default function configure(phase: string): NextConfig {
  const apiUrl = process.env.FUTCOMPETITIVO_API_URL?.trim();
  if (phase === PHASE_PRODUCTION_SERVER && !apiUrl) {
    throw new Error("Configure FUTCOMPETITIVO_API_URL no ambiente de produção ou em .env.production antes de iniciar o servidor.");
  }
  if (apiUrl) {
    let parsed: URL;
    try { parsed = new URL(apiUrl); }
    catch { throw new Error("FUTCOMPETITIVO_API_URL deve ser uma URL HTTP ou HTTPS válida."); }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("FUTCOMPETITIVO_API_URL deve usar HTTP ou HTTPS, sem credenciais, parâmetros ou fragmentos.");
    }
    process.env.FUTCOMPETITIVO_API_URL = apiUrl.replace(/\/+$/, "");
  }
  return {
    ...nextConfig,
    experimental: { agentFeedback: phase === PHASE_DEVELOPMENT_SERVER },
  };
}

