"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Award, Layers, ShieldAlert, Cpu, HeartPulse } from "lucide-react";

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

  useEffect(() => {
    // Fetch stats and health from local backend (defaulting to localhost:8000)
    const fetchData = async () => {
      try {
        const stocksRes = await fetch("process.env.NEXT_PUBLIC_API_URL/api/v1/stocks");
        const stocksData = await stocksRes.json();
        setStocks(stocksData);

        const healthRes = await fetch("process.env.NEXT_PUBLIC_API_URL/health");
        const healthData = await healthRes.json();
        setHealth(healthData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative rounded-2xl overflow-hidden glass-panel p-8 sm:p-12 border border-darkBorder">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyanAccent/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-tealAccent/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            India's First Local <span className="bg-gradient-to-r from-cyanAccent to-tealAccent bg-clip-text text-transparent">Stock Market RAG</span> Platform
          </h1>
          <p className="text-lg text-slate-300 mb-6 leading-relaxed">
            Perform enterprise-grade stock research and qualitative analysis locally using 
            Qwen2.5:14B, Nomic Embeddings, Qdrant Vector database, and structured financial stats.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/analysis" className="px-6 py-3 rounded-lg font-semibold text-darkBg bg-cyanAccent hover:bg-cyanAccent/90 transition-all shadow-lg shadow-cyanAccent/20">
              Run AI Research
            </Link>
            <Link href="/screener" className="px-6 py-3 rounded-lg font-semibold border border-slate-700 bg-darkPanel/50 hover:bg-darkPanel text-slate-200 transition-all">
              Launch Screener
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Stats / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Stocks Card */}
        <div className="p-6 rounded-xl glass-panel border border-darkBorder flex items-center space-x-4">
          <div className="p-3 bg-cyanAccent/10 rounded-lg text-cyanAccent">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Monitored Stocks</p>
            <h3 className="text-2xl font-bold text-white mt-1">{loading ? "Loading..." : stocks.length}</h3>
          </div>
        </div>

        {/* AI Capabilities Card */}
        <div className="p-6 rounded-xl glass-panel border border-darkBorder flex items-center space-x-4">
          <div className="p-3 bg-tealAccent/10 rounded-lg text-tealAccent">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Local LLM Node</p>
            <h3 className="text-2xl font-bold text-white mt-1">Qwen2.5:14B</h3>
          </div>
        </div>

        {/* System Status Card */}
        <div className="p-6 rounded-xl glass-panel border border-darkBorder flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${health?.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">System Health</p>
            <h3 className="text-2xl font-bold text-white mt-1 capitalize">
              {loading ? "Checking..." : (health?.status || "Degraded")}
            </h3>
          </div>
        </div>
      </div>

      {/* Stocks List and Local Services Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Watchlist/Tracked Stocks */}
        <div className="lg:col-span-2 glass-panel border border-darkBorder rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-cyanAccent" />
            <span>Monitored Stocks</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-darkBorder text-xs text-slate-400 uppercase">
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4">Market Cap</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">Loading stocks...</td>
                  </tr>
                ) : stocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No stocks registered yet. Upload stocks.csv to ingest.</td>
                  </tr>
                ) : (
                  stocks.map((stock) => (
                    <tr key={stock.symbol} className="border-b border-darkBorder/40 hover:bg-darkPanel/20 transition-all text-sm">
                      <td className="py-4 px-4 font-bold text-cyanAccent">{stock.symbol}</td>
                      <td className="py-4 px-4 font-medium text-white">{stock.name}</td>
                      <td className="py-4 px-4 text-slate-300">{stock.sector}</td>
                      <td className="py-4 px-4 text-slate-300">₹{stock.market_cap} Cr</td>
                      <td className="py-4 px-4 text-right">
                        <Link href={`/analysis?symbol=${stock.symbol}`} className="text-xs bg-cyanAccent/10 text-cyanAccent border border-cyanAccent/30 hover:bg-cyanAccent/20 font-semibold px-3 py-1.5 rounded transition-all">
                          Analyze
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="glass-panel border border-darkBorder rounded-xl p-6 h-fit">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Award className="h-5 w-5 text-tealAccent" />
            <span>Infrastructure Node</span>
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-darkBg/50 border border-darkBorder">
              <div>
                <p className="text-sm font-semibold text-slate-200">PostgreSQL Database</p>
                <p className="text-xs text-slate-500">Structured stocks metadata</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${health?.services?.postgres === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {health?.services?.postgres || "offline"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-darkBg/50 border border-darkBorder">
              <div>
                <p className="text-sm font-semibold text-slate-200">Qdrant Vector DB</p>
                <p className="text-xs text-slate-500">Unstructured semantic chunks</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${health?.services?.qdrant === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {health?.services?.qdrant || "offline"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-darkBg/50 border border-darkBorder">
              <div>
                <p className="text-sm font-semibold text-slate-200">Ollama API (Local)</p>
                <p className="text-xs text-slate-500">Qwen2.5:14B + Nomic Embed</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${health?.services?.ollama === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {health?.services?.ollama || "offline"}
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-[11px] text-slate-400 flex items-start space-x-2">
            <ShieldAlert className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p>
              Notice: Platform processes monthly updates asynchronously. Place PDF or TXT reports under 
              <code className="text-slate-200"> backend/data/documents</code> with naming pattern 
              <code className="text-slate-200"> SYMBOL_2025_Report.txt</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
