"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AlertRule {
  id: number;
  stock_symbol: string;
  indicator: string;
  operator: string;
  threshold_value: number;
  is_active: boolean;
}

interface Stock {
  symbol: string;
  name: string;
}

export default function AlertsConfig() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [symbol, setSymbol] = useState("");
  const [indicator, setIndicator] = useState("RSI");
  const [operator, setOperator] = useState(">");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStocks();
    fetchRules();
  }, []);

  const fetchStocks = () => {
    fetch(`${API_URL}/api/v1/stocks`)
      .then((res) => res.json())
      .then((data) => {
        setStocks(data);
        if (data.length > 0) setSymbol(data[0].symbol);
      });
  };

  const fetchRules = () => {
    fetch(`${API_URL}/api/v1/alerts/rules`)
      .then((res) => res.json())
      .then((data) => setRules(data));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/alerts/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_symbol: symbol,
          indicator,
          operator,
          threshold_value: parseFloat(value),
        }),
      });
      if (res.ok) {
        setValue("");
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/alerts/rules/${id}`, { method: "DELETE" });
      if (res.ok) fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 dark:text-white">
      {/* Title */}
      <div className="flex items-center space-x-3">
        <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-[#00E5FF]" />
        <h1 className="text-2xl font-black tracking-tight">Market Alert Settings</h1>
      </div>

      {/* Creator Form */}
      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-[#0E121E]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-2xl">
        <div>
          <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Asset</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-2.5 rounded-lg text-sm font-bold">
            {stocks.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Indicator</label>
          <select value={indicator} onChange={(e) => setIndicator(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-2.5 rounded-lg text-sm font-bold">
            <option value="RSI">RSI Indicator</option>
            <option value="Sentiment">Negative News Count</option>
            <option value="Price">Close Price (Rs)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Operator</label>
          <select value={operator} onChange={(e) => setOperator(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-2.5 rounded-lg text-sm font-bold">
            <option value=">">&gt; Greater than</option>
            <option value="<">&lt; Less than</option>
            <option value="==">== Equal to</option>
          </select>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-grow">
            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Value</label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 70"
              className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-2.5 rounded-lg text-sm font-bold focus:outline-none"
            />
          </div>
          <button type="submit" disabled={loading} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm flex items-center gap-1.5 active:scale-95 transition-all">
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* Rules List */}
      <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E2538] bg-slate-50/50 dark:bg-[#1E2538]/20">
          <h3 className="text-sm font-extrabold">Active Alert Rules</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-[#1E2538] text-xs font-semibold">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold">No active alert rules. Create one above.</div>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-blue-600 dark:text-[#00E5FF] mr-2.5">{r.stock_symbol}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">
                    Trigger when {r.indicator} {r.operator} {r.threshold_value}
                  </span>
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Notification Webhook & Channels configuration */}
      <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Notification Alert Routing</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure automated routing webhook destinations for active indicator alerts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E2538] bg-slate-50/50 dark:bg-[#0B0F19]/40 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Slack Hook</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold border border-emerald-500/20">Online</span>
            </div>
            <input 
              type="text" 
              placeholder="https://hooks.slack.com/services/..." 
              defaultValue="https://hooks.slack.com/services/T00/B00/X123"
              className="w-full bg-white dark:bg-[#0E121E] border border-slate-200 dark:border-[#1E2538] rounded-lg p-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300 focus:outline-none"
            />
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E2538] bg-slate-50/50 dark:bg-[#0B0F19]/40 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Discord Webhook</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold border border-emerald-500/20">Online</span>
            </div>
            <input 
              type="text" 
              placeholder="https://discord.com/api/webhooks/..." 
              defaultValue="https://discord.com/api/webhooks/999/888/abcdef"
              className="w-full bg-white dark:bg-[#0E121E] border border-slate-200 dark:border-[#1E2538] rounded-lg p-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300 focus:outline-none"
            />
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E2538] bg-slate-50/50 dark:bg-[#0B0F19]/40 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Email Dispatch</span>
              <span className="text-[9px] bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded font-bold border border-slate-500/20">Inactive</span>
            </div>
            <input 
              type="email" 
              placeholder="alerts@yourportfolio.com" 
              className="w-full bg-white dark:bg-[#0E121E] border border-slate-200 dark:border-[#1E2538] rounded-lg p-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
