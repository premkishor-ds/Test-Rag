"use client";

import { useState, useEffect } from "react";
import { Bell, AlertTriangle, CheckCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Notification {
  id: number;
  stock_symbol: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications?limit=10`);
      if (res.ok) setNotifications(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/${id}/read`, { method: "POST" });
      if (res.ok) fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative select-none z-50">
      {/* Icon Trigger */}
      <button onClick={() => setOpen(!open)} className="relative p-2 text-slate-400 hover:text-white rounded-lg transition-colors focus:outline-none">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4.5 w-4.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-3.5 w-80 bg-white border border-slate-200 dark:bg-[#0E121E] dark:border-[#1E2538] rounded-2xl shadow-xl overflow-hidden text-xs">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1E2538] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-[#1E2538]/20 flex justify-between items-center">
            <span>Risk Updates</span>
            {unreadCount > 0 && <span className="text-[10px] text-red-500 font-black">{unreadCount} Warning</span>}
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-[#1E2538] max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-bold">No notifications triggered yet.</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-3.5 hover:bg-slate-50 dark:hover:bg-[#0B0F19]/40 transition-colors flex gap-2.5 items-start ${!n.is_read ? 'bg-blue-50/20 dark:bg-[#00E5FF]/5' : ''}`}>
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-blue-600 dark:text-[#00E5FF]">{n.stock_symbol}</span>
                      <span className="text-[9px] text-slate-400">{n.created_at.slice(11, 16)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-2 whitespace-pre-wrap">{n.message}</p>
                    {!n.is_read && (
                      <button onClick={() => markAsRead(n.id)} className="flex items-center space-x-1 text-slate-400 hover:text-emerald-500 font-bold text-[9px] uppercase tracking-wider">
                        <CheckCircle className="h-3 w-3" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
