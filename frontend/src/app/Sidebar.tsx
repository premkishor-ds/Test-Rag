"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { MessageSquare, BarChart2, ArrowLeftRight, Globe, AlertTriangle, Sparkles, Briefcase, Lock } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogin = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      setIsAdminLoggedIn(token === "admin-mock-token");
    };

    checkLogin();

    // Listen for custom storage events or manual storage updates
    window.addEventListener("storage", checkLogin);
    const interval = setInterval(checkLogin, 500);

    return () => {
      window.removeEventListener("storage", checkLogin);
      clearInterval(interval);
    };
  }, []);

  const links = [
    { name: "RAG Chat", href: "/chat", icon: MessageSquare },
    { name: "Analysis Node", href: "/analysis", icon: BarChart2 },
    { name: "Compare Node", href: "/compare", icon: ArrowLeftRight },
    { name: "Global Search", href: "/search", icon: Globe },
    { name: "Alert Settings", href: "/alerts", icon: AlertTriangle },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "Admin Panel", href: "/admin", icon: Lock },
  ];

  if (pathname === "/admin" && !isAdminLoggedIn) {
    return null;
  }

  return (
    <div className="w-64 bg-[#090D1A] text-slate-300 border-r border-[#151D36] flex flex-col h-screen flex-shrink-0 select-none">
      {/* Brand logo */}
      <div className="flex items-center space-x-2 px-6 py-5 border-b border-[#151D36]">
        <Sparkles className="h-5 w-5 text-[#00E5FF] animate-pulse" />
        <span className="font-black text-sm tracking-widest text-white uppercase">Equity.AI Command</span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-2.5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                isActive
                  ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                  : "hover:bg-slate-800/40 hover:text-white border border-transparent"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? "text-[#00E5FF]" : "text-slate-400"}`} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer footer */}
      <div className="p-4 border-t border-[#151D36] text-[10px] text-center text-slate-500 font-bold uppercase tracking-wider">
        Local Stack Engine v1.2
      </div>
    </div>
  );
}
