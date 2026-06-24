"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, Cpu, HeartPulse, RefreshCw, BarChart2, Layers, Briefcase, 
  Search, MessageSquare, Newspaper, ArrowUpRight, Activity, PieChart 
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
}

interface NewsItem {
  id: number;
  stock_symbol: string;
  title: string;
  source: string;
  sentiment: string;
}

interface Health {
  status: string;
  services: {
    postgres: string;
    qdrant: string;
    ollama: string;
  };
}

export default function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [portfolio, setPortfolio] = useState<any>({ total_value: 0, pnl: 0, pnl_pct: 0, weights: {} });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const stocksRes = await fetch(`${API_URL}/api/v1/stocks`);
      const stocksData = await stocksRes.json();
      setStocks(stocksData);

      const healthRes = await fetch(`${API_URL}/health`);
      const healthData = await healthRes.json();
      setHealth(healthData);

      const portRes = await fetch(`${API_URL}/api/v1/portfolio/analysis`);
      if (portRes.ok) {
        setPortfolio(await portRes.json());
      }

      const newsRes = await fetch(`${API_URL}/api/v1/news?limit=5`);
      if (newsRes.ok) {
        setNews(await newsRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredStocks = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchVal.toLowerCase()) ||
      s.name.toLowerCase().includes(searchVal.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-300">
      
      {/* Upper Control Bar / Command Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-white border border-slate-200 dark:bg-[#1E1E1E] dark:border-[#2D2D2D] p-6 rounded-xl gap-4 transition-all">
        <div>
          <div className="flex items-center space-x-2 text-blue-500">
            <Activity className="h-4 w-4 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">Equity.AI Mainframe</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">Intelligence Command</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 uppercase tracking-wide">Enterprise analytics workspace: quantitative indicators, portfolio sync, and local documents RAG.</p>
        </div>

        {/* Global Node KPI summary */}
        <div className="flex flex-wrap items-center gap-6 text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-[#2D2D2D] pt-4 lg:pt-0 lg:pl-6">
          <div className="space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500">Active Holdings</span>
            <div className="text-slate-900 dark:text-white font-mono flex items-center space-x-1">
              <Briefcase className="h-3 w-3 text-blue-500" />
              <span>Rs. {portfolio.total_value?.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500">Total Return</span>
            <div className={`font-mono ${portfolio.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {portfolio.pnl_pct >= 0 ? "+" : ""}{portfolio.pnl_pct?.toFixed(2)}%
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500">Listed Tickers</span>
            <div className="text-slate-900 dark:text-white font-mono">{loading ? "..." : stocks.length} stocks</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500">AI Engine</span>
            <div className="flex items-center space-x-1.5 text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Monitored Stocks Watchlist */}
        <div className="lg:col-span-2 bg-white border border-slate-200 dark:bg-[#1E1E1E] dark:border-[#2D2D2D] rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2D2D2D] flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
              <BarChart2 className="h-4 w-4 text-blue-500" />
              <span>Monitored Intelligence List</span>
            </h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter stocks..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-[11px] font-semibold bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2D2D2D] text-slate-900 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 w-44 outline-none transition-colors"
                />
              </div>
              <button 
                onClick={fetchData} 
                disabled={refreshing}
                className="p-1.5 border border-slate-200 dark:border-[#2D2D2D] bg-slate-50 dark:bg-[#161616] text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] font-semibold">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#161616]/40 text-slate-400 uppercase text-[9px] tracking-widest border-b border-slate-200 dark:border-[#2D2D2D]">
                  <th className="px-6 py-3">Symbol</th>
                  <th className="px-6 py-3">Company Profile</th>
                  <th className="px-6 py-3">Sector</th>
                  <th className="px-6 py-3">Capitalization</th>
                  <th className="px-6 py-3 text-right">Research Terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2D2D2D] text-slate-900 dark:text-slate-350">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4"><div className="h-4 w-12 shimmer-skeleton rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 shimmer-skeleton rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 shimmer-skeleton rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 shimmer-skeleton rounded"></div></td>
                      <td className="px-6 py-4 text-right flex justify-end space-x-2 items-center"><div className="h-6 w-16 shimmer-skeleton rounded"></div><div className="h-6 w-6 shimmer-skeleton rounded"></div></td>
                    </tr>
                  ))
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400">
                      No matching assets found in listings database.
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <tr key={stock.symbol} className="hover:bg-slate-50/50 dark:hover:bg-[#252525]/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">{stock.symbol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">{stock.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-400">{stock.sector || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono">
                        {stock.market_cap ? `Rs. ${stock.market_cap.toLocaleString()} Cr` : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link href={`/analysis?symbol=${stock.symbol}`} className="bg-blue-600/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 text-blue-600 dark:text-[#00E5FF] dark:bg-[#00E5FF]/5 dark:border-[#00E5FF]/20 px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all">
                            Research
                          </Link>
                          <Link href={`/chat?symbol=${stock.symbol}`} className="p-1.5 border border-slate-200 dark:border-[#2D2D2D] hover:border-blue-500 rounded text-slate-400 hover:text-blue-500 transition-colors">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Column */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Quick Action Index Links */}
          <div className="bg-white border border-slate-200 dark:bg-[#1E1E1E] dark:border-[#2D2D2D] p-5 rounded-xl space-y-4 font-semibold">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              <span>AI Command Launchers</span>
            </h3>
            <div className="flex flex-col space-y-2">
              <Link href="/screener" className="w-full text-left px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#161616] dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2D2D2D] rounded-lg transition-all flex items-center justify-between text-slate-700 dark:text-slate-300">
                <div>
                  <div className="text-[11px] uppercase font-black tracking-wider">Advanced Screener</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Filter qualitative and technical stock features</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/backtest" className="w-full text-left px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#161616] dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2D2D2D] rounded-lg transition-all flex items-center justify-between text-slate-700 dark:text-slate-300">
                <div>
                  <div className="text-[11px] uppercase font-black tracking-wider">Strategy Backtester</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Verify algorithms and indicators over history</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/compare" className="w-full text-left px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#161616] dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2D2D2D] rounded-lg transition-all flex items-center justify-between text-slate-700 dark:text-slate-300">
                <div>
                  <div className="text-[11px] uppercase font-black tracking-wider">Compare Node</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Dual-profile side-by-side metric analytics</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Live intelligence news */}
          <div className="bg-white border border-slate-200 dark:bg-[#1E1E1E] dark:border-[#2D2D2D] p-5 rounded-xl shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2.5 mb-4">
              <Newspaper className="h-4 w-4 text-indigo-500" />
              <span>Intelligence News Feed</span>
            </h2>
            <div className="space-y-3.5">
              {news.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">No dynamic articles found.</div>
              ) : (
                news.map((item) => {
                  const badgeColor = {
                    "Positive": "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400",
                    "Negative": "bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400",
                    "Neutral": "bg-slate-500/10 border-slate-500/20 text-slate-500 dark:text-slate-400"
                  }[item.sentiment] || "bg-slate-500/10 border-slate-500/20 text-slate-500 dark:text-slate-400";
                  return (
                    <div key={item.id} className="text-xs space-y-1.5 border-b border-slate-100 dark:border-[#2D2D2D] pb-3 last:border-b-0 last:pb-0 font-semibold">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-blue-600 dark:text-[#00E5FF]">{item.stock_symbol}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider ${badgeColor}`}>
                          {item.sentiment}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-500 transition-colors leading-relaxed">
                        {item.title}
                      </h4>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{item.source}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
