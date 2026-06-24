"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Cpu, HeartPulse, RefreshCw, BarChart2, Layers, Briefcase, Plus, Search, MessageSquare, Newspaper } from "lucide-react";

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
  const [portfolio, setPortfolio] = useState<any>({ total_value: 0, pnl: 0, pnl_pct: 0 });
  
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

      // Fetch top 5 recent articles
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
    <div className="space-y-8 dark:text-white">
      {/* Welcome Hero / Command Panel */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-8 sm:p-10 shadow-md dark:shadow-2xl transition-colors duration-200">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 dark:bg-[#00E5FF]/5 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-[#00F5D4]/5 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-4xl space-y-5">
          <div className="inline-flex items-center space-x-2 bg-blue-600/10 text-blue-600 dark:bg-[#00E5FF]/10 dark:text-[#00E5FF] text-xs font-bold tracking-widest px-3 py-1 rounded-full border border-blue-600/20 dark:border-[#00E5FF]/20 uppercase">
            <TrendingUp className="h-3 w-3" />
            <span>Equity Wealth Command Center</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
            All-In-One <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4] bg-clip-text text-transparent">Stock Intelligence</span> Hub
          </h1>
          
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl font-semibold">
            One workspace for your portfolio tracking, quantitative metrics screening, yFinance analysis, and local document RAG.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link 
              href="/portfolio" 
              className="px-5 py-3 rounded-lg font-bold text-white dark:text-[#080A10] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4] hover:opacity-90 active:scale-95 transition-all shadow-md hover:shadow-lg dark:shadow-none text-xs tracking-wider uppercase"
            >
              Analyze My Holdings
            </Link>
            <Link 
              href="/chat" 
              className="px-5 py-3 rounded-lg font-bold border border-slate-200 bg-white hover:bg-slate-50 dark:border-[#1E2538] dark:bg-[#0E121E]/60 dark:hover:bg-[#0E121E] dark:hover:border-[#2D3753] text-slate-700 dark:text-slate-200 transition-all text-xs tracking-wider uppercase active:scale-95 shadow-sm"
            >
              Ask AI Assistant
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Portfolio Net Worth */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] flex items-center space-x-4 shadow-sm transition-colors duration-200">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 shadow-inner">
            <Briefcase className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Portfolio Net Value</p>
            <h3 className="text-xl font-black text-slate-950 dark:text-white mt-1">
              Rs. {portfolio.total_value?.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Portfolio Returns */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] flex items-center space-x-4 shadow-sm transition-colors duration-200">
          <div className={`p-3 rounded-xl shadow-inner ${portfolio.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            <TrendingUp className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Return</p>
            <h3 className={`text-xl font-black mt-1 ${portfolio.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {portfolio.pnl_pct >= 0 ? "+" : ""}{portfolio.pnl_pct?.toFixed(2)}%
            </h3>
          </div>
        </div>

        {/* Monitored Stocks Card */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] flex items-center space-x-4 shadow-sm transition-colors duration-200">
          <div className="p-3 bg-blue-600/10 dark:bg-[#00E5FF]/10 rounded-xl text-blue-600 dark:text-[#00E5FF] shadow-inner">
            <Layers className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Monitored Stocks</p>
            <h3 className="text-xl font-black text-slate-950 dark:text-white mt-1">
              {loading ? "..." : stocks.length}
            </h3>
          </div>
        </div>

        {/* System Health Card */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] flex items-center space-x-4 shadow-sm transition-colors duration-200">
          <div className={`p-3 rounded-xl shadow-inner ${health?.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            <HeartPulse className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">AI Node Status</p>
            <h3 className="text-sm font-black text-slate-950 dark:text-white mt-1 flex items-center space-x-1.5">
              <span className={`h-2 w-2 rounded-full ${health?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="capitalize">{health?.status || "Degraded"}</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Main Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Watchlist Section */}
        <div className="lg:col-span-2 bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] rounded-xl p-6 shadow-sm relative transition-colors duration-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-950 dark:text-white tracking-wide flex items-center space-x-2">
              <BarChart2 className="h-5 w-5 text-blue-600 dark:text-[#00E5FF]" />
              <span>Monitored Watchlist</span>
            </h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter stocks..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <button 
                onClick={fetchData} 
                disabled={refreshing}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1E2538] bg-slate-50 dark:bg-[#0E121E] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#1E2538] text-[9px] text-slate-450 font-bold uppercase tracking-wider">
                  <th className="pb-3.5 px-3">Symbol</th>
                  <th className="pb-3.5 px-3">Company</th>
                  <th className="pb-3.5 px-3">Sector</th>
                  <th className="pb-3.5 px-3">Market Cap</th>
                  <th className="pb-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E2538]/40">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">Loading stock records...</td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">
                      No matching stocks found.
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <tr key={stock.symbol} className="hover:bg-slate-50/50 dark:hover:bg-[#0E121E]/30 transition-colors text-xs font-semibold">
                      <td className="py-4 px-3 font-bold text-slate-900 dark:text-white">{stock.symbol}</td>
                      <td className="py-4 px-3 text-slate-500 dark:text-slate-300">{stock.name}</td>
                      <td className="py-4 px-3 text-slate-400">{stock.sector || "N/A"}</td>
                      <td className="py-4 px-3">Rs. {stock.market_cap ? `${stock.market_cap} Cr` : "N/A"}</td>
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2.5">
                          <Link href={`/analysis?symbol=${stock.symbol}`} className="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-[#00E5FF] dark:bg-[#00E5FF]/10 dark:hover:bg-[#00E5FF]/20 rounded-md text-[10px] uppercase font-black tracking-wide transition-all">
                            Research
                          </Link>
                          <Link href={`/chat?symbol=${stock.symbol}`} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2538]/50 transition-colors">
                            <MessageSquare className="h-4 w-4" />
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

        {/* Intelligence feed column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Live intelligence news */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-950 dark:text-white tracking-wide flex items-center space-x-2.5 mb-5">
              <Newspaper className="h-5 w-5 text-indigo-500" />
              <span>Intelligence News Feed</span>
            </h2>
            <div className="space-y-4">
              {news.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-bold">No intelligence feed synced yet.</div>
              ) : (
                news.map((item) => {
                  const badgeColor = {
                    "Positive": "bg-emerald-500/10 text-emerald-500",
                    "Negative": "bg-red-500/10 text-red-500",
                    "Neutral": "bg-slate-500/10 text-slate-400"
                  }[item.sentiment] || "bg-slate-500/10 text-slate-400";
                  return (
                    <div key={item.id} className="text-xs space-y-1.5 border-b border-slate-100 dark:border-[#1E2538]/30 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-blue-600 dark:text-[#00E5FF]">{item.stock_symbol}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${badgeColor}`}>
                          {item.sentiment}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-500 transition-colors leading-relaxed">
                        {item.title}
                      </h4>
                      <div className="text-[10px] text-slate-400 font-semibold">{item.source}</div>
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
