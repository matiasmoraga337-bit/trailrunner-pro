"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Calendar, Download, MapPin, Settings, Home } from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/entrenamientos", label: "Entrenamientos", icon: Activity },
  { href: "/semana", label: "Semana", icon: Calendar },
  { href: "/importar", label: "Importar", icon: Download },
  { href: "/carreras", label: "Carreras", icon: MapPin },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 sm:px-6">
        <Link href="/" className="mr-4 flex items-center gap-2 font-bold">
          <span className="text-primary">⛰</span>
          <span className="hidden sm:inline">TrailRunner</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {navItems.slice(1).map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}