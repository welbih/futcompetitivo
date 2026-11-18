"use client";

import { useEffect, useState } from "react";

export function useAdminPermission(enabled = true) {
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
        setAdminUntil(user?.isAdmin ? user.expiresAt : 0);
        if (user?.isAdmin) timer = setTimeout(() => setAdminUntil(0), Math.min(2147483647, Math.max(0, user.expiresAt - Date.now())));
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
  }, [enabled]);

  return adminUntil > 0;
}
