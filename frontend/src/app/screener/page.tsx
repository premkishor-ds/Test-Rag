"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, Save } from "lucide-react";

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

      const res = await fetch("process.env.NEXT_PUBLIC_API_URL/api/v1/screener", {
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
      const res = await fetch("process.env.NEXT_PUBLIC_API_URL/api/v1/watchlist", { // Or save filter endpoint
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Advanced Stock Screener</h1>
          <p className="text-slate-400 text-sm mt-1">Screen over 1000 stocks based on fundamental, valuation and technical criteria.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Panel */}
        <div className="lg:col-span-1 glass-panel border border-darkBorder rounded-xl p-5 space-y-6 h-fit">
          <div className="flex items-center justify-between border-b border-darkBorder pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <SlidersHorizontal className="h-5 w-5 text-cyanAccent" />
              <span>Filters</span>
            </h2>
            <button onClick={() => setFilters({
              min_market_cap: "", min_revenue_growth: "", min_profit_growth: "",
              min_roe: "", min_roce: "", max_debt_equity: "", min_cash_flow: "",
              min_promoter_holding: "", max_pe: "", min_order_book: "",
              trend_strength: "", volume_breakout: ""
            })} className="text-xs text-slate-400 hover:text-cyanAccent transition-colors">
              Reset All
            </button>
          </div>

          <div className="space-y-4 text-sm">
            {/* Market Cap */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min Market Cap (Cr)</label>
              <input type="number" name="min_market_cap" value={filters.min_market_cap} onChange={handleInputChange} placeholder="e.g. 500" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            {/* Growth Ratios */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min Revenue Growth (YoY %)</label>
              <input type="number" name="min_revenue_growth" value={filters.min_revenue_growth} onChange={handleInputChange} placeholder="e.g. 20" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min Profit Growth (YoY %)</label>
              <input type="number" name="min_profit_growth" value={filters.min_profit_growth} onChange={handleInputChange} placeholder="e.g. 15" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            {/* Efficiency Ratios */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min ROCE (%)</label>
              <input type="number" name="min_roce" value={filters.min_roce} onChange={handleInputChange} placeholder="e.g. 15" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min ROE (%)</label>
              <input type="number" name="min_roe" value={filters.min_roe} onChange={handleInputChange} placeholder="e.g. 15" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            {/* Leverage */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Max Debt to Equity</label>
              <input type="number" name="max_debt_equity" value={filters.max_debt_equity} onChange={handleInputChange} placeholder="e.g. 0.5" step="0.1" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            {/* Ownership / Shareholding */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min Promoter Holding (%)</label>
              <input type="number" name="min_promoter_holding" value={filters.min_promoter_holding} onChange={handleInputChange} placeholder="e.g. 50" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            {/* Valuation ratios */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Max PE Ratio</label>
              <input type="number" name="max_pe" value={filters.max_pe} onChange={handleInputChange} placeholder="e.g. 40" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            {/* Order Book */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min Order Book (Cr)</label>
              <input type="number" name="min_order_book" value={filters.min_order_book} onChange={handleInputChange} placeholder="e.g. 1000" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent" />
            </div>

            {/* Technical trend */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Trend Strength</label>
              <select name="trend_strength" value={filters.trend_strength} onChange={handleInputChange} className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-white focus:outline-none focus:border-cyanAccent">
                <option value="">All Trends</option>
                <option value="Bullish">Bullish</option>
                <option value="Bearish">Bearish</option>
                <option value="Neutral">Neutral</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 py-2">
              <input type="checkbox" name="volume_breakout" checked={filters.volume_breakout === true} onChange={(e) => setFilters(prev => ({ ...prev, volume_breakout: e.target.checked }))} id="vol-chk" className="rounded border-darkBorder text-cyanAccent focus:ring-cyanAccent bg-darkBg" />
              <label htmlFor="vol-chk" className="text-xs font-semibold text-slate-300 cursor-pointer">Volume Breakout</label>
            </div>

            <button onClick={runScreenerQuery} className="w-full py-2.5 rounded font-bold text-darkBg bg-cyanAccent hover:bg-cyanAccent/90 transition-all mt-4">
              Apply Filters
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Save filter options */}
          <div className="flex flex-wrap items-center justify-between p-4 rounded-xl glass-panel border border-darkBorder gap-4">
            <div className="flex items-center space-x-2">
              <input type="text" value={savedName} onChange={(e) => setSavedName(e.target.value)} placeholder="Save this filter as..." className="bg-darkBg border border-darkBorder rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyanAccent" />
              <button onClick={handleSaveFilter} className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-darkBorder hover:bg-darkBorder/80 text-white rounded text-sm transition-colors border border-slate-700">
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
            </div>
            <div className="text-xs text-slate-400">
              Found <span className="text-cyanAccent font-bold">{results.length}</span> stocks matching criteria
            </div>
          </div>

          {/* Results Table */}
          <div className="glass-panel border border-darkBorder rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-darkBorder text-xs text-slate-400 uppercase bg-darkPanel/20">
                    <th className="py-3.5 px-4">Symbol</th>
                    <th className="py-3.5 px-4">Company Name</th>
                    <th className="py-3.5 px-4">Sector</th>
                    <th className="py-3.5 px-4">PE</th>
                    <th className="py-3.5 px-4">ROCE</th>
                    <th className="py-3.5 px-4">ROE</th>
                    <th className="py-3.5 px-4">Rev Growth</th>
                    <th className="py-3.5 px-4">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">Executing screening queries...</td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">No stocks match your filter criteria. Try loosening them!</td>
                    </tr>
                  ) : (
                    results.map((r) => (
                      <tr key={r.symbol} className="border-b border-darkBorder/40 hover:bg-darkPanel/10 transition-all text-sm">
                        <td className="py-4 px-4 font-bold text-cyanAccent">{r.symbol}</td>
                        <td className="py-4 px-4 font-medium text-white">{r.name}</td>
                        <td className="py-4 px-4 text-slate-400">{r.sector}</td>
                        <td className="py-4 px-4 text-slate-300">{r.pe_ratio !== null ? r.pe_ratio : "N/A"}</td>
                        <td className="py-4 px-4 text-slate-300">{r.roce !== null ? `${r.roce}%` : "N/A"}</td>
                        <td className="py-4 px-4 text-slate-300">{r.roe !== null ? `${r.roe}%` : "N/A"}</td>
                        <td className="py-4 px-4 text-slate-300">{r.revenue_growth !== null ? `${r.revenue_growth}%` : "N/A"}</td>
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.trend_strength === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : r.trend_strength === 'Bearish' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                            {r.trend_strength}
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
