"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, TrendingUp, BarChart2, AlertCircle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stock {
  symbol: string;
  name: string;
}

export default function CompareDashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [symA, setSymA] = useState("");
  const [symB, setSymB] = useState("");
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/stocks`)
      .then((res) => res.json())
      .then((data) => {
        setStocks(data);
        if (data.length > 1) {
          setSymA(data[0].symbol);
          setSymB(data[1].symbol);
        }
      });
  }, []);

  const handleCompare = async () => {
    if (!symA || !symB) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/stocks/compare?symbol_a=${symA}&symbol_b=${symB}`);
      const data = await res.json();
      setComparison(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 dark:text-white">
      {/* Title */}
      <div className="flex items-center space-x-3">
        <ArrowLeftRight className="h-6 w-6 text-blue-600 dark:text-[#00E5FF]" />
        <h1 className="text-2xl font-black tracking-tight">Comparative Analyst Dashboard</h1>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-[#0E121E]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-2xl">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Asset A</label>
          <select value={symA} onChange={(e) => setSymA(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-sm p-2 rounded-lg font-bold">
            {stocks.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Asset B</label>
          <select value={symB} onChange={(e) => setSymB(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-sm p-2 rounded-lg font-bold">
            {stocks.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
          </select>
        </div>
        <button onClick={handleCompare} disabled={loading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg mt-5 active:scale-95 transition-all text-sm disabled:opacity-50">
          {loading ? "Comparing..." : "Compare Assets"}
        </button>
      </div>

      {/* Comparison results */}
      {comparison && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quantitative Indicators */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-extrabold mb-4 flex items-center space-x-2">
              <BarChart2 className="h-4 w-4 text-blue-500" />
              <span>Valuation & Metrics Benchmarking</span>
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-[#1E2538] text-xs font-semibold">
              {[
                { label: "Market Cap (Cr)", key: "market_cap" },
                { label: "Revenue (Cr)", key: "revenue" },
                { label: "Revenue Growth (%)", key: "revenue_growth" },
                { label: "Net Profit (Cr)", key: "net_profit" },
                { label: "Profit Growth (%)", key: "profit_growth" },
                { label: "ROCE (%)", key: "roce" },
                { label: "ROE (%)", key: "roe" },
                { label: "Debt to Equity", key: "debt_to_equity" },
                { label: "P/E Ratio", key: "pe_ratio" },
                { label: "RSI Index", key: "rsi" }
              ].map((row) => (
                <div key={row.key} className="py-2.5 flex justify-between">
                  <span className="text-slate-400 font-bold">{row.label}</span>
                  <div className="space-x-8">
                    <span><b>{symA}:</b> {comparison.stock_a[row.key] ?? "N/A"}</span>
                    <span><b>{symB}:</b> {comparison.stock_b[row.key] ?? "N/A"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Qualitative Moat / Risk Summary */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-extrabold mb-2 flex items-center space-x-2 text-indigo-500">
                <TrendingUp className="h-4 w-4" />
                <span>Sector & Industry Context</span>
              </h3>
              <p className="text-xs font-bold leading-relaxed text-slate-500">
                <b>{symA}:</b> {comparison.stock_a.sector} ({comparison.stock_a.industry})<br />
                <b>{symB}:</b> {comparison.stock_b.sector} ({comparison.stock_b.industry})
              </p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs">
              <h4 className="font-bold flex items-center space-x-1 text-amber-500 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span>Comparison Notes</span>
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Compare structural metrics like ROCE (efficiency) and Debt/Equity (solvency) relative to valuation (P/E ratio) to identify arbitrage or fundamentally mispriced assets.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
