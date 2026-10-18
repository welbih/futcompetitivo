"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import Sidebar from "./sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const isHome = usePathname() === "/";

  return <div className={!isHome && collapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
    <a href="#page-content" className={`skip-link${isHome ? " skip-link-home" : ""}`}>Pular para o conteúdo</a>
    {!isHome && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((previous) => !previous)} />}
    <div id="page-content" className={isHome ? "home-content" : "app-content"} tabIndex={-1}>{children}</div>
  </div>;
}

