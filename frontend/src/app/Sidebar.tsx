"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  MessageSquare, BarChart2, ArrowLeftRight, Globe, AlertTriangle, 
  Sparkles, Briefcase, Lock, ChevronLeft, ChevronRight 
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Check login state
    const checkLogin = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      setIsAdminLoggedIn(token === "admin-mock-token");
    };

    checkLogin();
    window.addEventListener("storage", checkLogin);
    const interval = setInterval(checkLogin, 500);

    // Load collapse state
    const savedCollapse = localStorage.getItem("sidebar_collapsed");
    setIsCollapsed(savedCollapse === "true");

    return () => {
      window.removeEventListener("storage", checkLogin);
      clearInterval(interval);
    };
  }, []);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem("sidebar_collapsed", String(nextVal));
  };

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
    <div 
      className={`bg-slate-100 dark:bg-[#1E1E1E] text-slate-800 dark:text-[#E0E0E0] border-r border-slate-200 dark:border-[#2D2D2D] flex flex-col h-screen flex-shrink-0 select-none transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand logo */}
      <div className={`flex items-center border-b border-slate-200 dark:border-[#2D2D2D] py-5 ${
        isCollapsed ? "justify-center px-0" : "justify-between px-6"
      }`}>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-[#00E5FF] animate-pulse flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-black text-sm tracking-widest text-slate-900 dark:text-white uppercase transition-all duration-300">
              Equity.AI
            </span>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              title={isCollapsed ? link.name : ""}
              className={`flex items-center rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                isCollapsed ? "justify-center p-3" : "space-x-3 px-4 py-3"
              } ${
                isActive
                  ? "bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-[#00E5FF] border border-blue-600/20 dark:border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.05)]"
                  : "hover:bg-slate-200/50 dark:hover:bg-[#2D2D2D]/50 hover:text-slate-955 dark:hover:text-white border border-transparent"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? "text-blue-600 dark:text-[#00E5FF]" : "text-slate-500 dark:text-slate-400"}`} />
              {!isCollapsed && <span>{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer Trigger */}
      <div className="border-t border-slate-200 dark:border-[#2D2D2D] p-3 flex flex-col items-center gap-2">
        <button
          onClick={toggleCollapse}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#2D2D2D] rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4.5 w-4.5" />
          ) : (
            <div className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider">
              <ChevronLeft className="h-4.5 w-4.5" />
              <span>Minimize Menu</span>
            </div>
          )}
        </button>
        
        {!isCollapsed && (
          <div className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-wider">
            Engine v1.2
          </div>
        )}
      </div>
    </div>
  );
}
