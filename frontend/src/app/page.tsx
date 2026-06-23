"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Cpu, HeartPulse, ExternalLink, RefreshCw, BarChart2, Layers } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
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
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const stocksRes = await fetch(`${API_URL}/api/v1/stocks`);
      const stocksData = await stocksRes.json();
      setStocks(stocksData);

      const healthRes = await fetch(`${API_URL}/health`);
      const healthData = await healthRes.json();
      setHealth(healthData);
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

  return (
    <div className="space-y-10">
      {/* Welcome Hero / Command Panel */}
      <div className="relative rounded-2xl overflow-hidden glass-panel p-8 sm:p-12 border border-[#1E2538] shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#00E5FF]/5 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00F5D4]/5 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-4xl space-y-6">
          <div className="inline-flex items-center space-x-2 bg-[#00E5FF]/10 text-[#00E5FF] text-xs font-bold tracking-widest px-3 py-1 rounded-full border border-[#00E5FF]/20 uppercase">
            <TrendingUp className="h-3 w-3" />
            <span>Institutional Research Node</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-2 leading-none">
            Local Intelligent <span className="bg-gradient-to-r from-[#00E5FF] to-[#00F5D4] bg-clip-text text-transparent">Stock RAG</span> Platform
          </h1>
          
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-medium">
            Perform professional financial statement analysis, semantic document queries, and backtests 
            locally with complete data privacy. Powered by local LLM orchestration and vector embeddings.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link 
              href="/analysis" 
              className="px-6 py-3.5 rounded-lg font-bold text-[#080A10] bg-gradient-to-r from-[#00E5FF] to-[#00F5D4] hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#00E5FF]/20 text-sm tracking-wide"
            >
              Launch AI Research
            </Link>
            <Link 
              href="/screener" 
              className="px-6 py-3.5 rounded-lg font-bold border border-[#1E2538] bg-[#0E121E]/60 hover:bg-[#0E121E] hover:border-[#2D3753] text-slate-200 transition-all text-sm tracking-wide active:scale-95"
            >
              Open stock Screener
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Stocks Card */}
        <div className="p-6 rounded-xl glass-panel border border-[#1E2538] flex items-center space-x-5 glass-card-hover">
          <div className="p-3.5 bg-[#00E5FF]/10 rounded-xl text-[#00E5FF] shadow-inner">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Monitored Stocks</p>
            <h3 className="text-3xl font-black text-white mt-1.5 tracking-tight">
              {loading ? <span className="text-sm font-medium text-slate-500">Loading...</span> : stocks.length}
            </h3>
          </div>
        </div>

        {/* AI Capabilities Card */}
        <div className="p-6 rounded-xl glass-panel border border-[#1E2538] flex items-center space-x-5 glass-card-hover">
          <div className="p-3.5 bg-[#00F5D4]/10 rounded-xl text-[#00F5D4] shadow-inner">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Local Model</p>
            <h3 className="text-2xl font-black text-white mt-2 tracking-tight">Qwen2.5:14B</h3>
          </div>
        </div>

        {/* System Status Card */}
        <div className="p-6 rounded-xl glass-panel border border-[#1E2538] flex items-center space-x-5 glass-card-hover">
          <div className={`p-3.5 rounded-xl shadow-inner ${health?.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Infrastructure Status</p>
            <div className="flex items-center space-x-2 mt-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${health?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <h3 className="text-lg font-black text-white capitalize">
                {loading ? <span className="text-sm font-medium text-slate-500">Checking...</span> : (health?.status || "Degraded")}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Watchlist/Tracked Stocks Panel */}
        <div className="lg:col-span-2 glass-panel border border-[#1E2538] rounded-xl p-6 shadow-xl relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2.5">
              <BarChart2 className="h-5 w-5 text-[#00E5FF]" />
              <span>Registered Watchlist</span>
            </h2>
            <button 
              onClick={fetchData} 
              disabled={refreshing}
              className="p-1.5 rounded-lg border border-[#1E2538] bg-[#0E121E] text-slate-400 hover:text-white hover:border-[#2E3956] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E2538] text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3.5 px-4">Symbol</th>
                  <th className="pb-3.5 px-4">Company Name</th>
                  <th className="pb-3.5 px-4">Sector</th>
                  <th className="pb-3.5 px-4">Market Cap</th>
                  <th className="pb-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2538]/40">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-slate-500 font-medium">Querying local nodes for stock records...</td>
                  </tr>
                ) : stocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-slate-500 font-medium">
                      No stocks registered. Populate <code className="text-cyanAccent text-xs">stocks.csv</code> to begin.
                    </td>
                  </tr>
                ) : (
                  stocks.map((stock) => (
                    <tr key={stock.symbol} className="hover:bg-[#0E121E]/30 transition-colors text-sm">
                      <td className="py-4 px-4 font-black text-[#00E5FF] tracking-wide">{stock.symbol}</td>
                      <td className="py-4 px-4 font-semibold text-slate-200">{stock.name || "N/A"}</td>
                      <td className="py-4 px-4 text-slate-300 font-medium">{stock.sector || "N/A"}</td>
                      <td className="py-4 px-4 text-slate-300 font-bold">
                        {stock.market_cap ? `₹${stock.market_cap.toLocaleString('en-IN')} Cr` : "—"}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link 
                          href={`/analysis?symbol=${stock.symbol}`} 
                          className="inline-flex items-center space-x-1.5 text-xs bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 hover:bg-[#00E5FF]/20 font-bold px-3 py-1.5 rounded transition-all active:scale-95"
                        >
                          <span>Analyze</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infrastructure Nodes Status Panel */}
        <div className="glass-panel border border-[#1E2538] rounded-xl p-6 shadow-xl h-fit space-y-6">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2.5">
            <Cpu className="h-5 w-5 text-[#00F5D4]" />
            <span>Local Microservices</span>
          </h2>
          
          <div className="space-y-4">
            {/* Database Node */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0E121E]/80 border border-[#1E2538]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">SQLite Database</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Structured metadata & history</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${health?.services?.postgres === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {health?.services?.postgres || "offline"}
              </span>
            </div>

            {/* Qdrant Node */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0E121E]/80 border border-[#1E2538]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Qdrant Vector DB</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Unstructured PDF embeddings</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${health?.services?.qdrant === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {health?.services?.qdrant || "offline"}
              </span>
            </div>

            {/* Ollama LLM Node */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0E121E]/80 border border-[#1E2538]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Ollama API (Local)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Embedding & Generation LLMs</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${health?.services?.ollama === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {health?.services?.ollama || "offline"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
