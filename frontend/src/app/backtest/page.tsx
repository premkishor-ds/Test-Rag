"use client";

import { useState } from "react";
import { TrendingUp, Percent, AlertCircle, Award, RotateCcw, BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BacktestMetrics {
  strategy_name: string;
  cagr: number;
  max_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  win_rate: number;
  benchmark_cagr: number;
  metrics_by_year: Array<{
    year: number;
    portfolio_return: number;
    benchmark_return: number;
    portfolio_value: number;
    benchmark_value: number;
  }>;
}

function BacktestChart({ data }: { data: Array<{ year: number; portfolio_value: number; benchmark_value: number }> }) {
  if (!data || data.length === 0) return null;

  const formatYAxis = (tick: number) => {
    return `₹${(tick / 100000).toFixed(1)}L`;
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E2538] rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="relative w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="benchmarkGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2538" opacity={0.2} />
              <XAxis dataKey="year" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={formatYAxis} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#0E121E", 
                  borderColor: "#1E2538", 
                  borderRadius: "12px", 
                  fontSize: "11px",
                  color: "#fff"
                }} 
                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
              <Area 
                name="Portfolio Value"
                type="monotone" 
                dataKey="portfolio_value" 
                stroke="#00E5FF" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#portfolioGlow)" 
              />
              <Area 
                name="Benchmark Index"
                type="monotone" 
                dataKey="benchmark_value" 
                stroke="#6366F1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#benchmarkGlow)" 
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function Backtester() {
  const [strategy, setStrategy] = useState("ROCE Value");
  const [years, setYears] = useState("5");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestMetrics | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_name: strategy,
          duration_years: parseInt(years)
        }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Error executing backtest simulator.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-blue-600 dark:text-[#00E5FF]">
          <BarChart3 className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Historical Simulation Node</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">Backtester Simulator</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Evaluate strategy rules historically compared to benchmark index models.</p>
      </div>

      {/* Control panel */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] flex flex-wrap items-end gap-6 shadow-sm transition-colors duration-200">
        <div className="flex-grow min-w-[200px]">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Select Strategy</label>
          <select 
            value={strategy} 
            onChange={(e) => setStrategy(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF] transition-all font-semibold shadow-sm"
          >
            <option value="ROCE Value">High ROCE & Low Debt Value</option>
            <option value="Growth Momentum">High Growth Momentum (Rev & Profit Growth &gt; 25%)</option>
            <option value="Defensive Income">Promoter Owned Large Cap Cash Flow Strategy</option>
          </select>
        </div>

        <div className="w-[140px]">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Duration</label>
          <select 
            value={years} 
            onChange={(e) => setYears(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF] transition-all font-semibold shadow-sm"
          >
            <option value="5">5 Years</option>
            <option value="10">10 Years</option>
            <option value="15">15 Years</option>
            <option value="20">20 Years</option>
          </select>
        </div>

        <button 
          onClick={handleRunBacktest} 
          disabled={loading} 
          className="px-6 py-2.5 rounded-lg font-bold text-white dark:text-[#080A10] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4] hover:opacity-95 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400 transition-all flex-shrink-0 text-sm active:scale-95 shadow-sm"
        >
          {loading ? "Simulating..." : "Run Backtest"}
        </button>
      </div>

      {results && (
        <div className="space-y-8">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] text-center shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">CAGR</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{results.cagr}%</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Benchmark: {results.benchmark_cagr}%</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] text-center shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Max Drawdown</p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">-{results.max_drawdown}%</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] text-center shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Sharpe Ratio</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{results.sharpe_ratio}</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] text-center shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Sortino Ratio</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{results.sortino_ratio}</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] text-center col-span-2 md:col-span-1 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Win Rate</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{results.win_rate}%</p>
            </div>
          </div>

          {/* Table comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Value Growth Curve */}
            <div className="lg:col-span-2 bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] rounded-xl p-6 shadow-sm dark:shadow-xl transition-colors duration-200">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-6 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-[#00E5FF]" />
                <span>Simulated Return Performance</span>
              </h3>

              <div className="mb-6">
                <BacktestChart data={results.metrics_by_year} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#1E2538] text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-[#0F1322]/50">
                      <th className="py-3.5 px-4">Year</th>
                      <th className="py-3.5 px-4">Portfolio Return</th>
                      <th className="py-3.5 px-4">Benchmark Return</th>
                      <th className="py-3.5 px-4">Portfolio Capital</th>
                      <th className="py-3.5 px-4">Benchmark Capital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E2538]/40">
                    {results.metrics_by_year.map((m) => (
                      <tr key={m.year} className="hover:bg-slate-50/30 dark:hover:bg-[#0E121E]/30 transition-colors text-sm">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{m.year}</td>
                        <td className={`py-3.5 px-4 font-bold ${m.portfolio_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.portfolio_return}%
                        </td>
                        <td className={`py-3.5 px-4 font-medium ${m.benchmark_return >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {m.benchmark_return}%
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-bold">₹{m.portfolio_value.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-500 font-medium">₹{m.benchmark_value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Backtester Strategy Details */}
            <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] rounded-xl p-6 space-y-6 shadow-sm dark:shadow-xl transition-colors duration-200">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white border-b border-slate-100 dark:border-[#1E2538] pb-3 flex items-center space-x-2">
                <Award className="h-5 w-5 text-indigo-600 dark:text-[#00F5D4]" />
                <span>Strategy Rules</span>
              </h3>

              <div className="space-y-4 text-xs leading-relaxed font-medium">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Rebalancing Schedule</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Portfolio evaluates and adjusts holding weights annually on March 31st based on fundamental scoring indicators.</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Execution Mode</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Calculates transactions fees and transaction slip metrics. Capital gain taxation is accounted for under standard Indian capital metrics rules.</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-600/5 dark:bg-[#00E5FF]/5 border border-blue-600/10 dark:border-[#00E5FF]/10 text-slate-700 dark:text-slate-300">
                  <strong>Analysis Tip:</strong> Strategies focusing on High ROCE (&gt;15%) historically outperform large cap index baskets by 4.2% annualized margins over 10+ year timeframes.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
