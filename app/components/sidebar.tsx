"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Campeonato", href: "/campeonatos", icon: "cup" },
  { label: "X1", href: "/x1", icon: "duel" },
  { label: "Jogador", href: "/jogadores", icon: "player" },
  { label: "Equipe", href: "/equipes", icon: "team" },
];

function MenuIcon({ type }: { type: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "duel" ? <><path d="m4 3 17 17m-1-17L3 20M3 3l1 5 4-4-5-1Zm18 0-1 5-4-4 5-1ZM2 17l5 5m10 0 5-5" /></> : type === "player" ? <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></> : type === "team" ? <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></> : <><path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8m-6-2h4" /></>}
  </svg>;
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  return <aside className="sidebar">
    <Link href="/" className="sidebar-brand" aria-label="Futebol Competitivo — início">FC<span>FUTEBOL<br />COMPETITIVO</span></Link>
    <button type="button" className="sidebar-toggle" onClick={onToggle} aria-expanded={!collapsed} aria-controls="sidebar-navigation" aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} title={collapsed ? "Expandir menu" : "Recolher menu"}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16v16H4zM9 4v16" /><path d={collapsed ? "m13 9 3 3-3 3" : "m16 9-3 3 3 3"} /></svg><span>Recolher menu</span>
    </button>
    <p className="sidebar-caption">SUA ARENA</p>
    <nav id="sidebar-navigation" aria-label="Menu lateral"><ul>{items.map((item) => {
      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return <li key={item.href}><Link href={item.href} className={`sidebar-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} aria-label={item.label} title={collapsed ? item.label : undefined}><MenuIcon type={item.icon} /><span>{item.label}</span></Link></li>;
    })}</ul></nav>
    <span className="sidebar-footer"><i /> FUTEBOL VIRTUAL.<br />RIVALIDADE REAL.</span>
  </aside>;
}
