"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { motion, AnimatePresence } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? 64 : 240;
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <Navbar sidebarCollapsed={collapsed} />

      <motion.div
        animate={{ marginLeft: sidebarW }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="pt-14 min-h-screen content-dotgrid"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="p-6 max-w-7xl mx-auto"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
