"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, Save, Filter, RefreshCw, Layers } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ScreenerFilters {
  min_market_cap: string;
  min_revenue_growth: string;
  min_profit_growth: string;
  min_roe: string;
  min_roce: string;
  max_debt_equity: string;
  min_cash_flow: string;
  min_promoter_holding: string;
  max_pe: string;
  min_order_book: string;
  trend_strength: string;
  volume_breakout: boolean | "";
}

interface StockResult {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  revenue_growth: number | null;
  profit_growth: number | null;
  roe: number | null;
  roce: number | null;
  debt_equity: number | null;
  pe_ratio: number | null;
  rsi: number | null;
  trend_strength: string;
}

export default function StockScreener() {
  const [filters, setFilters] = useState<ScreenerFilters>({
    min_market_cap: "",
    min_revenue_growth: "",
    min_profit_growth: "",
    min_roe: "",
    min_roce: "",
    max_debt_equity: "",
    min_cash_flow: "",
    min_promoter_holding: "",
    max_pe: "",
    min_order_book: "",
    trend_strength: "",
    volume_breakout: "",
  });

  const [results, setResults] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedName, setSavedName] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const runScreenerQuery = async () => {
    setLoading(true);
    try {
      const payload: Record<string, any> = {};
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== "" && val !== null) {
          if (key === "volume_breakout") {
            payload[key] = val;
          } else if (key === "trend_strength") {
            payload[key] = val;
          } else {
            payload[key] = parseFloat(val);
          }
        }
      });

      const res = await fetch(`${API_URL}/api/v1/screener`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Error executing screener query:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFilter = async () => {
    if (!savedName) return alert("Please enter a name for the filter");
    try {
      const res = await fetch(`${API_URL}/api/v1/watchlist`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: savedName }),
      });
      if (res.ok) {
        alert("Filter saved successfully!");
        setSavedName("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    runScreenerQuery();
  }, []);

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <div className="flex items-center space-x-2 text-blue-600 dark:text-[#00E5FF]">
          <Filter className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Stock Intelligence Screener</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">Advanced Screener</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Filter stocks on financial ratios, qualitative features, and market trends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Screener Filters panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-xl p-5 space-y-6 h-fit shadow-sm dark:shadow-xl transition-colors duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E2538] pb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />
              <span>Filters config</span>
            </h2>
            <button 
              onClick={() => setFilters({
                min_market_cap: "", min_revenue_growth: "", min_profit_growth: "",
                min_roe: "", min_roce: "", max_debt_equity: "", min_cash_flow: "",
                min_promoter_holding: "", max_pe: "", min_order_book: "",
                trend_strength: "", volume_breakout: ""
              })} 
              className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 dark:hover:text-[#00E5FF] transition-colors"
            >
              Reset All
            </button>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            {/* Market Cap */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-black">
                <span>Min Market Cap</span>
                <span className="text-blue-600 dark:text-[#00E5FF]">{filters.min_market_cap ? `${filters.min_market_cap} Cr` : "All"}</span>
              </div>
              <input 
                type="range" 
                name="min_market_cap" 
                min="0"
                max="50000"
                step="500"
                value={filters.min_market_cap || "0"} 
                onChange={(e) => setFilters(prev => ({ ...prev, min_market_cap: e.target.value === "0" ? "" : e.target.value }))} 
                className="w-full accent-blue-600 dark:accent-[#00E5FF] bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-lg cursor-pointer appearance-none" 
              />
            </div>

            {/* Growth Ratios */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-black">
                <span>Min Rev Growth</span>
                <span className="text-blue-600 dark:text-[#00E5FF]">{filters.min_revenue_growth ? `${filters.min_revenue_growth}%` : "All"}</span>
              </div>
              <input 
                type="range" 
                name="min_revenue_growth" 
                min="-20"
                max="100"
                step="5"
                value={filters.min_revenue_growth || "0"} 
                onChange={(e) => setFilters(prev => ({ ...prev, min_revenue_growth: e.target.value === "0" ? "" : e.target.value }))} 
                className="w-full accent-blue-600 dark:accent-[#00E5FF] bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-lg cursor-pointer appearance-none" 
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-black">
                <span>Min Profit Growth</span>
                <span className="text-blue-600 dark:text-[#00E5FF]">{filters.min_profit_growth ? `${filters.min_profit_growth}%` : "All"}</span>
              </div>
              <input 
                type="range" 
                name="min_profit_growth" 
                min="-20"
                max="150"
                step="5"
                value={filters.min_profit_growth || "0"} 
                onChange={(e) => setFilters(prev => ({ ...prev, min_profit_growth: e.target.value === "0" ? "" : e.target.value }))} 
                className="w-full accent-blue-600 dark:accent-[#00E5FF] bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-lg cursor-pointer appearance-none" 
              />
            </div>

            {/* Efficiency Ratios */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-black">
                <span>Min ROCE</span>
                <span className="text-blue-600 dark:text-[#00E5FF]">{filters.min_roce ? `${filters.min_roce}%` : "All"}</span>
              </div>
              <input 
                type="range" 
                name="min_roce" 
                min="0"
                max="60"
                step="2"
                value={filters.min_roce || "0"} 
                onChange={(e) => setFilters(prev => ({ ...prev, min_roce: e.target.value === "0" ? "" : e.target.value }))} 
                className="w-full accent-blue-600 dark:accent-[#00E5FF] bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-lg cursor-pointer appearance-none" 
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-black">
                <span>Min ROE</span>
                <span className="text-blue-600 dark:text-[#00E5FF]">{filters.min_roe ? `${filters.min_roe}%` : "All"}</span>
              </div>
              <input 
                type="range" 
                name="min_roe" 
                min="0"
                max="60"
                step="2"
                value={filters.min_roe || "0"} 
                onChange={(e) => setFilters(prev => ({ ...prev, min_roe: e.target.value === "0" ? "" : e.target.value }))} 
                className="w-full accent-blue-600 dark:accent-[#00E5FF] bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-lg cursor-pointer appearance-none" 
              />
            </div>

            {/* Leverage */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-black">
                <span>Max Debt to Equity</span>
                <span className="text-blue-600 dark:text-[#00E5FF]">{filters.max_debt_equity ? `${filters.max_debt_equity}x` : "All"}</span>
              </div>
              <input 
                type="range" 
                name="max_debt_equity" 
                min="0"
                max="4"
                step="0.1"
                value={filters.max_debt_equity || "4"} 
                onChange={(e) => setFilters(prev => ({ ...prev, max_debt_equity: e.target.value === "4" ? "" : e.target.value }))} 
                className="w-full accent-blue-600 dark:accent-[#00E5FF] bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-lg cursor-pointer appearance-none" 
              />
            </div>

            {/* Shareholding */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-black">
                <span>Min Promoter Share</span>
                <span className="text-blue-600 dark:text-[#00E5FF]">{filters.min_promoter_holding ? `${filters.min_promoter_holding}%` : "All"}</span>
              </div>
              <input 
                type="range" 
                name="min_promoter_holding" 
                min="0"
                max="100"
                step="5"
                value={filters.min_promoter_holding || "0"} 
                onChange={(e) => setFilters(prev => ({ ...prev, min_promoter_holding: e.target.value === "0" ? "" : e.target.value }))} 
                className="w-full accent-blue-600 dark:accent-[#00E5FF] bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-lg cursor-pointer appearance-none" 
              />
            </div>

            {/* PE Ratio */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-black">
                <span>Max PE Ratio</span>
                <span className="text-blue-600 dark:text-[#00E5FF]">{filters.max_pe ? `${filters.max_pe}x` : "All"}</span>
              </div>
              <input 
                type="range" 
                name="max_pe" 
                min="0"
                max="120"
                step="5"
                value={filters.max_pe || "120"} 
                onChange={(e) => setFilters(prev => ({ ...prev, max_pe: e.target.value === "120" ? "" : e.target.value }))} 
                className="w-full accent-blue-600 dark:accent-[#00E5FF] bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-lg cursor-pointer appearance-none" 
              />
            </div>

            {/* Technical trend */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide text-[10px]">Trend Profile</label>
              <select 
                name="trend_strength" 
                value={filters.trend_strength} 
                onChange={handleInputChange} 
                className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] dark:hover:border-[#2D3753] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF] transition-colors font-medium shadow-sm"
              >
                <option value="">All Trends</option>
                <option value="Bullish">Bullish</option>
                <option value="Bearish">Bearish</option>
                <option value="Neutral">Neutral</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 py-1 select-none">
              <input 
                type="checkbox" 
                name="volume_breakout" 
                checked={filters.volume_breakout === true} 
                onChange={(e) => setFilters(prev => ({ ...prev, volume_breakout: e.target.checked }))} 
                id="vol-chk" 
                className="rounded border-slate-200 text-blue-600 focus:ring-blue-600 dark:border-[#1E2538] dark:text-[#00E5FF] dark:focus:ring-[#00E5FF] bg-slate-50 dark:bg-[#0B0F19]" 
              />
              <label htmlFor="vol-chk" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-semibold">Volume Breakout</label>
            </div>

            <button 
              onClick={runScreenerQuery} 
              className="w-full py-3 rounded-lg font-bold text-white dark:text-[#080A10] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4] hover:opacity-95 transition-all mt-4 text-sm active:scale-95 shadow-md shadow-blue-600/10 dark:shadow-[#00E5FF]/10"
            >
              Apply Filter Settings
            </button>
          </div>
        </div>

        {/* Right Side: Results panel */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Action bar (Save filters & count info) */}
          <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] gap-4 shadow-sm dark:shadow-md transition-colors duration-200">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <input 
                type="text" 
                value={savedName} 
                onChange={(e) => setSavedName(e.target.value)} 
                placeholder="Save filter layout..." 
                className="bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] focus:border-blue-600 dark:focus:border-[#00E5FF] rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none transition-colors" 
              />
              <button 
                onClick={handleSaveFilter} 
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 dark:bg-[#1E2538] hover:bg-slate-200 dark:hover:bg-[#2A334B] text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-[#2B354C] active:scale-95 shadow-sm"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Layout</span>
              </button>
            </div>
            
            <div className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">
              Matched stocks: <span className="text-blue-600 dark:text-[#00E5FF] text-sm font-black">{results.length}</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] rounded-xl overflow-hidden shadow-sm dark:shadow-xl transition-colors duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1E2538] text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-[#0F1322]/50">
                    <th className="py-3.5 px-5">Symbol</th>
                    <th className="py-3.5 px-5">Company Name</th>
                    <th className="py-3.5 px-5">Sector</th>
                    <th className="py-3.5 px-5">P/E</th>
                    <th className="py-3.5 px-5">ROCE</th>
                    <th className="py-3.5 px-5">ROE</th>
                    <th className="py-3.5 px-5">Rev Growth</th>
                    <th className="py-3.5 px-5 text-right font-bold">Trend Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E2538]/40">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm font-medium text-slate-400 dark:text-slate-500">Querying and filtering active database stocks...</td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm font-medium text-slate-400 dark:text-slate-500">
                        No stocks matched the specified filter metrics. Loosen inputs.
                      </td>
                    </tr>
                  ) : (
                    results.map((r) => (
                      <tr key={r.symbol} className="hover:bg-slate-50/30 dark:hover:bg-[#0E121E]/30 transition-colors text-sm">
                        <td className="py-4 px-5 font-black text-blue-600 dark:text-[#00E5FF] tracking-wide">{r.symbol}</td>
                        <td className="py-4 px-5 font-semibold text-slate-800 dark:text-slate-200">{r.name || "N/A"}</td>
                        <td className="py-4 px-5 text-slate-600 dark:text-slate-400 font-medium">{r.sector || "—"}</td>
                        <td className="py-4 px-5 text-slate-700 dark:text-slate-300 font-bold">{r.pe_ratio !== null ? r.pe_ratio : "—"}</td>
                        <td className="py-4 px-5 text-slate-700 dark:text-slate-300 font-bold">{r.roce !== null ? `${r.roce}%` : "—"}</td>
                        <td className="py-4 px-5 text-slate-700 dark:text-slate-300 font-bold">{r.roe !== null ? `${r.roe}%` : "—"}</td>
                        <td className="py-4 px-5 text-emerald-600 dark:text-[#00F5D4] font-bold">{r.revenue_growth !== null ? `${r.revenue_growth}%` : "—"}</td>
                        <td className="py-4 px-5 text-right">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${r.trend_strength === 'Bullish' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : r.trend_strength === 'Bearish' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'}`}>
                            {r.trend_strength || "Neutral"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
