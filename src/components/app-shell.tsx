"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Activity,
  CalendarClock,
  Cpu,
  FileCode2,
  LayoutDashboard,
  Menu,
  Moon,
  PackageCheck,
  Receipt,
  Sun,
} from "lucide-react";
import { SiSwagger } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/inventory", label: "Equipment Inventory", icon: Cpu },
  { href: "/loans", label: "Borrow & Return", icon: PackageCheck },
  { href: "/reservations", label: "Lab Reservations", icon: CalendarClock },
  { href: "/audit", label: "Fines & Audit Log", icon: Receipt },
  { href: "/api-docs", label: "API Docs (Swagger)", icon: FileCode2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
    }
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">LabVault</span>
          <span className="font-mono text-[11px] text-muted-foreground">
             Hardware Lab
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-2">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono">OpenAPI 3.0</span>
          </div>
          <Link
            href="/api-docs"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <SiSwagger className="h-3.5 w-3.5" />
            <span>Spec</span>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border md:block">
        <div className="sticky top-0 h-screen">{SidebarContent}</div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                {SidebarContent}
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Hardware &amp; Component Lending System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground sm:inline-block">
              Hardware Lab · Active
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle Caffeine theme mode"
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
