"use client";

import { useState } from "react";
import { TrendingUp, Percent, AlertCircle, Award, RotateCcw } from "lucide-react";

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

export default function Backtester() {
  const [strategy, setStrategy] = useState("ROCE Value");
  const [years, setYears] = useState("5");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestMetrics | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/backtest", {
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
      <div>
        <h1 className="text-3xl font-extrabold text-white">Backtesting Simulation Engine</h1>
        <p className="text-slate-400 text-sm mt-1">Evaluate historical strategy performance over 5, 10, 15, or 20 years compared to Nifty 50.</p>
      </div>

      {/* Control panel */}
      <div className="p-6 rounded-xl glass-panel border border-darkBorder flex flex-wrap items-end gap-6">
        <div className="flex-grow min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-400 mb-2">Select Strategy</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyanAccent">
            <option value="ROCE Value">High ROCE & Low Debt Value</option>
            <option value="Growth Momentum">High Growth Momentum (Rev & Profit Growth &gt; 25%)</option>
            <option value="Defensive Income">Promoter Owned Large Cap Cash Flow Strategy</option>
          </select>
        </div>

        <div className="w-[120px]">
          <label className="block text-xs font-semibold text-slate-400 mb-2">Duration</label>
          <select value={years} onChange={(e) => setYears(e.target.value)} className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyanAccent">
            <option value="5">5 Years</option>
            <option value="10">10 Years</option>
            <option value="15">15 Years</option>
            <option value="20">20 Years</option>
          </select>
        </div>

        <button onClick={handleRunBacktest} disabled={loading} className="px-6 py-2.5 rounded font-bold text-darkBg bg-cyanAccent hover:bg-cyanAccent/90 disabled:bg-slate-700 disabled:text-slate-400 transition-all flex-shrink-0">
          {loading ? "Simulating..." : "Run Backtest"}
        </button>
      </div>

      {results && (
        <div className="space-y-8">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-5 rounded-xl glass-panel border border-darkBorder text-center">
              <p className="text-xs text-slate-500 font-medium">CAGR</p>
              <p className="text-2xl font-bold text-white mt-1">{results.cagr}%</p>
              <p className="text-[10px] text-slate-400 mt-1">Benchmark: {results.benchmark_cagr}%</p>
            </div>

            <div className="p-5 rounded-xl glass-panel border border-darkBorder text-center">
              <p className="text-xs text-slate-500 font-medium">Max Drawdown</p>
              <p className="text-2xl font-bold text-red-400 mt-1">-{results.max_drawdown}%</p>
            </div>

            <div className="p-5 rounded-xl glass-panel border border-darkBorder text-center">
              <p className="text-xs text-slate-500 font-medium">Sharpe Ratio</p>
              <p className="text-2xl font-bold text-white mt-1">{results.sharpe_ratio}</p>
            </div>

            <div className="p-5 rounded-xl glass-panel border border-darkBorder text-center">
              <p className="text-xs text-slate-500 font-medium">Sortino Ratio</p>
              <p className="text-2xl font-bold text-white mt-1">{results.sortino_ratio}</p>
            </div>

            <div className="p-5 rounded-xl glass-panel border border-darkBorder text-center col-span-2 md:col-span-1">
              <p className="text-xs text-slate-500 font-medium">Win Rate</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{results.win_rate}%</p>
            </div>
          </div>

          {/* Table comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Value Growth Curve */}
            <div className="lg:col-span-2 glass-panel border border-darkBorder rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-cyanAccent" />
                <span>Simulated Return Performance</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-darkBorder text-xs text-slate-400 uppercase bg-darkPanel/20">
                      <th className="py-3 px-4">Year</th>
                      <th className="py-3 px-4">Portfolio Return</th>
                      <th className="py-3 px-4">Benchmark Return</th>
                      <th className="py-3 px-4">Portfolio Capital</th>
                      <th className="py-3 px-4">Benchmark Capital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.metrics_by_year.map((m) => (
                      <tr key={m.year} className="border-b border-darkBorder/40 hover:bg-darkPanel/10 transition-all text-sm">
                        <td className="py-3.5 px-4 font-bold text-white">{m.year}</td>
                        <td className={`py-3.5 px-4 font-semibold ${m.portfolio_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.portfolio_return}%
                        </td>
                        <td className={`py-3.5 px-4 ${m.benchmark_return >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {m.benchmark_return}%
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">₹{m.portfolio_value.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-slate-400">₹{m.benchmark_value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Backtester Strategy Details */}
            <div className="glass-panel border border-darkBorder rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white border-b border-darkBorder pb-3 flex items-center space-x-2">
                <Award className="h-5 w-5 text-tealAccent" />
                <span>Strategy Rules</span>
              </h3>

              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Rebalancing Schedule</h4>
                  <p className="text-slate-400 mt-1">Portfolio evaluates and adjusts holding weights annually on March 31st based on fundamental scoring indicators.</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Execution Mode</h4>
                  <p className="text-slate-400 mt-1">Calculates transactions fees and transaction slip metrics. Capital gain taxation is accounted for under standard Indian capital metrics rules.</p>
                </div>
                <div className="p-4 rounded bg-cyanAccent/5 border border-cyanAccent/10 text-slate-300">
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
