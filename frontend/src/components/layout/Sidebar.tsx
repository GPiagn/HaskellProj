"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Landmark,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalogo", label: "Catálogo", icon: BookOpen },
  {
    href: "/inventario",
    label: "Inventário",
    icon: ClipboardList,
    badge: String(new Date().getFullYear()),
  },
  { href: "/nao-encontrados", label: "Não Encontrados", icon: AlertTriangle },
  { href: "/emprestados", label: "Emprestados", icon: ArrowLeftRight },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-full z-30 flex flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* ─── Logo / Marca ─── */}
      <div
        className="flex items-center h-14 px-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{
            backgroundColor: "oklch(0.37 0.12 150)",
            color: "oklch(0.97 0.02 145)",
            boxShadow: "0 0 0 1px oklch(0.45 0.13 150)",
          }}
        >
          <Landmark size={15} strokeWidth={2} />
        </motion.div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="ml-3 overflow-hidden whitespace-nowrap"
            >
              <p
                className="text-sm font-bold font-display leading-none tracking-tight"
                style={{ color: "var(--sidebar-logo-text)" }}
              >
                Biblioteca
              </p>
              <p
                className="text-[10px] mt-0.5 leading-none font-medium tracking-widest uppercase"
                style={{ color: "var(--sidebar-logo-sub)" }}
              >
                UNIFESP
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Navegação principal ─── */}
      <nav
        className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden scrollbar-thin"
        aria-label="Navegação principal"
      >
        <ul className="space-y-0.5" role="list">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <NavLink item={item} active={active} collapsed={collapsed} />
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ─── Ano do inventário (indicator) ─── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 mb-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: "oklch(0.30 0.10 150)",
              border: "1px solid oklch(0.37 0.12 150)",
            }}
          >
            <p
              className="text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--sidebar-label-text)" }}
            >
              Inventário em curso
            </p>
            <p
              className="text-lg font-bold font-display tabular-nums leading-tight"
              style={{ color: "var(--sidebar-logo-text)" }}
            >
              {new Date().getFullYear()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Recolher ─── */}
      <div
        className="flex-shrink-0 p-2"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <button
          onClick={onToggle}
          className="nav-item w-full"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <span className="flex items-center justify-center w-8 h-8 flex-shrink-0">
            {collapsed ? (
              <ChevronRight size={14} strokeWidth={2} />
            ) : (
              <ChevronLeft size={14} strokeWidth={2} />
            )}
          </span>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="ml-2 text-sm"
              >
                Recolher
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}

/* ─── NavLink item ─── */
function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const cls = `nav-item${active ? " nav-item--active" : ""}`;

  const inner = (
    <>
      {/* Icon with animated active ring */}
      <span className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
        <Icon
          size={15}
          strokeWidth={active ? 2.2 : 1.8}
          style={{ transition: "stroke-width 0.15s" }}
        />
      </span>

      {/* Label + optional badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.13 }}
            className="ml-2 flex-1 flex items-center gap-1.5"
          >
            <span className="truncate">{item.label}</span>

            {/* Year badge on inventário */}
            {item.badge && active && (
              <span
                className="ml-auto text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: "oklch(0.50 0.14 150 / 0.5)",
                  color: "var(--sidebar-item-active-text)",
                  letterSpacing: "0.04em",
                }}
              >
                {item.badge}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <Link
      href={item.href}
      className={cls}
      aria-current={active ? "page" : undefined}
    >
      {inner}
    </Link>
  );
}
