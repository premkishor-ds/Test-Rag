"use client";

import { useState } from "react";
import { TrendingUp, Percent, AlertCircle, Award, RotateCcw, BarChart3 } from "lucide-react";

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const allValues = data.flatMap(d => [d.portfolio_value, d.benchmark_value]);
  const maxVal = Math.max(...allValues) * 1.05;
  const minVal = Math.min(...allValues) * 0.95;
  const valRange = maxVal - minVal || 1;

  const width = 600;
  const height = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getCoords = (index: number, value: number) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((value - minVal) / valRange) * chartHeight;
    return { x, y };
  };

  let portfolioPoints = "";
  let benchmarkPoints = "";
  let portfolioAreaPoints = "";

  data.forEach((d, i) => {
    const pCoords = getCoords(i, d.portfolio_value);
    const bCoords = getCoords(i, d.benchmark_value);

    if (i === 0) {
      portfolioPoints = `M ${pCoords.x} ${pCoords.y}`;
      benchmarkPoints = `M ${bCoords.x} ${bCoords.y}`;
      portfolioAreaPoints = `M ${pCoords.x} ${paddingTop + chartHeight} L ${pCoords.x} ${pCoords.y}`;
    } else {
      portfolioPoints += ` L ${pCoords.x} ${pCoords.y}`;
      benchmarkPoints += ` L ${bCoords.x} ${bCoords.y}`;
      portfolioAreaPoints += ` L ${pCoords.x} ${pCoords.y}`;
    }

    if (i === data.length - 1) {
      portfolioAreaPoints += ` L ${pCoords.x} ${paddingTop + chartHeight} Z`;
    }
  });

  const gridTicks = 4;
  const yTicks = Array.from({ length: gridTicks }, (_, i) => minVal + (i * valRange) / (gridTicks - 1));

  return (
    <div className="space-y-4">
      <div className="relative bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E2538] rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center space-x-6 mb-4 text-xs font-bold uppercase tracking-wider select-none">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-blue-600 dark:bg-[#00E5FF]"></span>
            <span className="text-slate-800 dark:text-slate-200">Portfolio Capital</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-indigo-500"></span>
            <span className="text-slate-500 dark:text-slate-400">Benchmark Capital</span>
          </div>
        </div>

        <div className="relative w-full h-[240px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="portfolioGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="portfolioGlowDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((tick, i) => {
              const y = paddingTop + chartHeight - (i / (gridTicks - 1)) * chartHeight;
              return (
                <g key={i} className="opacity-40 dark:opacity-20">
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-slate-300 dark:text-[#1E2538]" />
                  <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-bold">
                    ₹{(tick / 100000).toFixed(1)}L
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
              return (
                <text key={i} x={x} y={height - 8} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-bold opacity-70">
                  {d.year}
                </text>
              );
            })}

            <path d={portfolioAreaPoints} className="fill-blue-500/10 dark:hidden" fill="url(#portfolioGlow)" />
            <path d={portfolioAreaPoints} className="hidden dark:block" fill="url(#portfolioGlowDark)" />

            <path d={benchmarkPoints} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
            <path d={portfolioPoints} fill="none" className="stroke-blue-600 dark:stroke-[#00E5FF]" strokeWidth="3" strokeLinecap="round" />

            {data.map((d, i) => {
              const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
              return (
                <rect
                  key={i}
                  x={x - chartWidth / (data.length - 1) / 2}
                  y={paddingTop}
                  width={chartWidth / (data.length - 1)}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}

            {hoveredIndex !== null && (() => {
              const d = data[hoveredIndex];
              const pCoords = getCoords(hoveredIndex, d.portfolio_value);
              const bCoords = getCoords(hoveredIndex, d.benchmark_value);
              return (
                <g>
                  <line x1={pCoords.x} y1={paddingTop} x2={pCoords.x} y2={paddingTop + chartHeight} stroke="currentColor" strokeWidth="1.5" className="text-slate-350 dark:text-[#2D3753] opacity-60" />
                  <circle cx={bCoords.x} cy={bCoords.y} r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={pCoords.x} cy={pCoords.y} r="6" className="fill-blue-600 dark:fill-[#00E5FF]" stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })()}
          </svg>
        </div>

        {hoveredIndex !== null && (
          <div className="absolute top-4 right-4 bg-white dark:bg-[#0E121E] border border-slate-200 dark:border-[#1E2538] p-3 rounded-lg shadow-md text-xs font-semibold space-y-1">
            <p className="text-slate-500 uppercase text-[9px] font-black tracking-wider">FY {data[hoveredIndex].year}</p>
            <div className="flex justify-between space-x-6">
              <span className="text-slate-750 dark:text-slate-300">Portfolio Capital:</span>
              <span className="text-blue-600 dark:text-[#00E5FF] font-bold">₹{data[hoveredIndex].portfolio_value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between space-x-6">
              <span className="text-slate-500">Benchmark Capital:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">₹{data[hoveredIndex].benchmark_value.toLocaleString()}</span>
            </div>
          </div>
        )}
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
