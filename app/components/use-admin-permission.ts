"use client";

import { useEffect, useState } from "react";

function useSessionPermission(enabled: boolean, adminOnly: boolean) {
  const [adminUntil, setAdminUntil] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function syncPermissions() {
      try {
        const response = await fetch("/api/auth", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const { user } = await response.json();
        if (controller.signal.aborted) return;
        clearTimeout(timer);
        const allowed = user && (!adminOnly || user.isAdmin);
        setAdminUntil(allowed ? user.expiresAt : 0);
        if (allowed) timer = setTimeout(() => setAdminUntil(0), Math.min(2147483647, Math.max(0, user.expiresAt - Date.now())));
      } catch { if (!controller.signal.aborted) setAdminUntil(0); }
    }
    void syncPermissions();
    window.addEventListener("arena-auth-change", syncPermissions);
    window.addEventListener("focus", syncPermissions);
    return () => {
      controller.abort(); clearTimeout(timer);
      window.removeEventListener("arena-auth-change", syncPermissions);
      window.removeEventListener("focus", syncPermissions);
    };
  }, [enabled, adminOnly]);

  return adminUntil > 0;
}

export function useAdminPermission(enabled = true) {
  return useSessionPermission(enabled, true);
}

export function useAuthenticatedPermission() {
  return useSessionPermission(true, false);
}
