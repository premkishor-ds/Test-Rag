"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, TrendingUp, BarChart2, AlertCircle, PieChart, Info } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart as RePieChart, Cell, Pie } from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stock {
  symbol: string;
  name: string;
}

const COLORS = ["#00E5FF", "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function CompareDashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [symA, setSymA] = useState("");
  const [symB, setSymB] = useState("");
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // MPT optimization state
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [mptResult, setMptResult] = useState<any>(null);
  const [mptLoading, setMptLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/stocks`)
      .then((res) => res.json())
      .then((data) => {
        setStocks(data);
        if (data.length > 1) {
          setSymA(data[0].symbol);
          setSymB(data[1].symbol);
          setSelectedStocks([data[0].symbol, data[1].symbol]);
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

  const handleOptimize = async () => {
    if (selectedStocks.length < 2) return;
    setMptLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/portfolio/optimize?symbols=${selectedStocks.join(",")}`);
      const data = await res.json();
      setMptResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMptLoading(false);
    }
  };

  const toggleSelectStock = (symbol: string) => {
    if (selectedStocks.includes(symbol)) {
      setSelectedStocks(selectedStocks.filter((s) => s !== symbol));
    } else {
      setSelectedStocks([...selectedStocks, symbol]);
    }
  };

  const chartData = comparison ? [
    {
      name: "Rev Growth",
      [symA]: parseFloat(comparison.stock_a.revenue_growth) || 0,
      [symB]: parseFloat(comparison.stock_b.revenue_growth) || 0,
    },
    {
      name: "Profit Growth",
      [symA]: parseFloat(comparison.stock_a.profit_growth) || 0,
      [symB]: parseFloat(comparison.stock_b.profit_growth) || 0,
    },
    {
      name: "ROCE",
      [symA]: parseFloat(comparison.stock_a.roce) || 0,
      [symB]: parseFloat(comparison.stock_b.roce) || 0,
    },
    {
      name: "ROE",
      [symA]: parseFloat(comparison.stock_a.roe) || 0,
      [symB]: parseFloat(comparison.stock_b.roe) || 0,
    }
  ] : [];

  const valData = comparison ? [
    {
      name: "PE Ratio",
      [symA]: parseFloat(comparison.stock_a.pe_ratio) || 0,
      [symB]: parseFloat(comparison.stock_b.pe_ratio) || 0,
    },
    {
      name: "D/E Ratio x10",
      [symA]: (parseFloat(comparison.stock_a.debt_to_equity) || 0) * 10,
      [symB]: (parseFloat(comparison.stock_b.debt_to_equity) || 0) * 10,
    }
  ] : [];

  const pieData = mptResult && mptResult.optimal_weights
    ? Object.entries(mptResult.optimal_weights)
        .map(([name, value]) => ({ name, value: (value as number) * 100 }))
        .filter((item) => item.value > 0)
    : [];

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
        <button onClick={handleCompare} disabled={loading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg mt-5 active:scale-95 transition-all text-sm disabled:opacity-50 shadow-md">
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

          {/* Qualitative Moat / Risk Summary & Interactive Charts */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl shadow-sm space-y-6 flex flex-col justify-between">
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

            {/* Financial Performance Grouped Bar Chart */}
            <div className="h-48 w-full mt-4">
              <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2">Performance Benchmark (%)</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2538" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0E121E", borderColor: "#1E2538", borderRadius: "8px", fontSize: "10px" }} />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey={symA} fill="#00E5FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={symB} fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Valuation & Solvency Grouped Bar Chart */}
            <div className="h-48 w-full mt-4">
              <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2">Valuation & Leverage Comparison</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2538" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0E121E", borderColor: "#1E2538", borderRadius: "8px", fontSize: "10px" }} />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey={symA} fill="#00E5FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={symB} fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modern Portfolio Theory Optimizer Panel */}
      <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center space-x-2">
          <PieChart className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-bold tracking-tight">Modern Portfolio Theory (MPT) Optimizer</h2>
        </div>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
          Select multiple assets to run a Monte Carlo simulation. Locate the Maximum Sharpe Ratio weighting based on historical returns and covariance structures.
        </p>

        {/* Checkbox selections */}
        <div className="flex flex-wrap gap-2">
          {stocks.map((s) => {
            const isSelected = selectedStocks.includes(s.symbol);
            return (
              <button
                key={s.symbol}
                onClick={() => toggleSelectStock(s.symbol)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all duration-250 ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 dark:text-emerald-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-[#0E121E] dark:border-[#1E2538] dark:text-slate-400"
                }`}
              >
                {s.symbol}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-slate-400 font-bold">Selected: {selectedStocks.length} assets (minimum 2)</span>
          <button
            onClick={handleOptimize}
            disabled={selectedStocks.length < 2 || mptLoading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg disabled:opacity-50 active:scale-95 transition-all shadow-md"
          >
            {mptLoading ? "Simulating Allocations..." : "Optimize Allocation weights"}
          </button>
        </div>

        {mptResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 dark:border-[#1E2538] pt-6 mt-4">
            {/* Optimization Stats */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wide flex items-center space-x-1">
                <Info className="h-4 w-4" />
                <span>Maximum Sharpe Allocation Stats</span>
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-[#0B0F19] p-4 rounded-xl border border-slate-100 dark:border-[#1E2538]">
                  <div className="text-[10px] text-slate-400 font-bold">Expected Return</div>
                  <div className="text-lg font-black text-emerald-500">{mptResult.expected_return}%</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#0B0F19] p-4 rounded-xl border border-slate-100 dark:border-[#1E2538]">
                  <div className="text-[10px] text-slate-400 font-bold">Expected Volatility</div>
                  <div className="text-lg font-black text-orange-500">{mptResult.expected_volatility}%</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#0B0F19] p-4 rounded-xl border border-slate-100 dark:border-[#1E2538]">
                  <div className="text-[10px] text-slate-400 font-bold">Sharpe Ratio</div>
                  <div className="text-lg font-black text-[#00E5FF]">{mptResult.sharpe_ratio}</div>
                </div>
              </div>

              {/* Allocation list */}
              <div className="space-y-2 text-xs font-bold mt-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Target Portfolio Weights</div>
                {Object.entries(mptResult.optimal_weights)
                  .filter(([_, weight]) => (weight as number) > 0)
                  .map(([sym, weight], i) => (
                    <div key={sym} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-[#1E2538]/30">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                        <span>{sym}</span>
                      </div>
                      <span>{((weight as number) * 100).toFixed(2)}%</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Allocation pie chart */}
            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${parseFloat(value as string).toFixed(2)}%`} contentStyle={{ backgroundColor: "#0E121E", borderColor: "#1E2538", borderRadius: "8px", fontSize: "10px" }} />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
