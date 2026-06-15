"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const BREADCRUMBS: Record<string, string> = {
  "/": "Dashboard",
  "/catalogo": "Catálogo",
  "/inventario": "Inventário",
  "/nao-encontrados": "Não Encontrados",
};

export function Navbar({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const segments =
    pathname === "/"
      ? ["Dashboard"]
      : ["Dashboard", BREADCRUMBS[pathname] ?? pathname];

  const sidebarW = sidebarCollapsed ? 64 : 240;

  return (
    <>
      {/* ─── Brand accent line (top of viewport, always full width) ─── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 h-0.5"
        style={{ backgroundColor: "var(--brand)" }}
      />

      {/* ─── Navbar ─── */}
      <motion.header
        animate={{ left: sidebarW }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-0.5 right-0 z-20 h-[54px] flex items-center px-4 gap-3"
        style={{
          backgroundColor: scrolled
            ? "oklch(from var(--background) l c h / 0.92)"
            : "var(--background)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(8px)" : "none",
          transition: "background-color 0.2s, backdrop-filter 0.2s, box-shadow 0.2s",
          boxShadow: scrolled ? "0 1px 12px oklch(0 0 0 / 0.06)" : "none",
        }}
      >
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm flex-1 min-w-0">
          {segments.map((seg, i) => (
            <span key={seg} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight
                  size={12}
                  strokeWidth={1.8}
                  style={{ color: "var(--text-muted)", flexShrink: 0 }}
                />
              )}
              <span
                className="truncate"
                style={{
                  color:
                    i === segments.length - 1
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  fontWeight: i === segments.length - 1 ? 500 : 400,
                  fontSize: "0.8125rem",
                }}
              >
                {seg}
              </span>
            </span>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-[var(--brand-subtle)] hover:text-[var(--brand)]"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Alternar tema"
            >
              <motion.span
                key={theme}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex"
              >
                {theme === "dark" ? (
                  <Sun size={14} strokeWidth={1.8} />
                ) : (
                  <Moon size={14} strokeWidth={1.8} />
                )}
              </motion.span>
            </button>
          )}

          {/* Avatar — chama de G (Glória) */}
          <button
            className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold select-none transition-transform hover:scale-105"
            style={{
              backgroundColor: "var(--brand)",
              color: "var(--brand-fg)",
            }}
            aria-label="Perfil"
          >
            G
          </button>
        </div>
      </motion.header>
    </>
  );
}
