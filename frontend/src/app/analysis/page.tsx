"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, BookOpen, AlertTriangle, ShieldCheck, TrendingUp, HelpCircle, BarChart2, MessageSquare, Award, ArrowUpRight, Newspaper, RefreshCw, ExternalLink } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stock {
  symbol: string;
  name: string;
}

interface ReportResult {
  stock_symbol: string;
  report_date: string;
  rating: string;
  score: number;
  confidence_score: number;
  report: {
    business_overview: string;
    revenue_analysis: string;
    profit_analysis: string;
    cash_flow_analysis: string;
    balance_sheet_analysis: string;
    management_commentary_summary: string;
    order_book_analysis: string;
    growth_drivers: string;
    government_tailwinds: string;
    sector_tailwinds: string;
    risks: string;
    opportunities: string;
    competitive_position: string;
    valuation_assessment: string;
    bull_case: string;
    bear_case: string;
    final_investment_thesis: string;
    score_explanation: string;
  };
  metrics: {
    pe_ratio: number | null;
    roe: number | null;
    roce: number | null;
    debt_equity: number | null;
    promoter_holding: number | null;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources?: Array<{
    score: number;
    content: string;
    metadata: {
      source_file: string;
      page_number: number;
    }
  }>;
}

interface StockArticle {
  id: number;
  title: string;
  url: string;
  source: string;
  source_type: string;
  sentiment: "Positive" | "Negative" | "Neutral";
  summary: string | null;
  published_date: string | null;
  fetched_at: string | null;
}

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface StockPricePoint {
  date: string;
  close_price: number;
  volume: number;
}

const calculateEMA = (data: StockPricePoint[], period: number): number[] => {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  let emaArray: number[] = [];
  let prevEma = data[0].close_price;
  for (let i = 0; i < data.length; i++) {
    const currentPrice = data[i].close_price;
    const emaVal = i === 0 ? currentPrice : (currentPrice * k) + (prevEma * (1 - k));
    emaArray.push(Number(emaVal.toFixed(2)));
    prevEma = emaVal;
  }
  return emaArray;
};

export default function StockAnalysis() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("core");

  // RAG Chat states
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // News / Articles state
  const [articles, setArticles] = useState<StockArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Price History state
  const [priceHistory, setPriceHistory] = useState<StockPricePoint[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);


  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/stocks`);
        const data = await res.json();
        setStocks(data);
        
        // Read URL query parameter for stock symbol
        const params = new URLSearchParams(window.location.search);
        const urlSymbol = params.get("symbol")?.toUpperCase();
        
        if (urlSymbol && data.some((s: Stock) => s.symbol === urlSymbol)) {
          setSelectedSymbol(urlSymbol);
        } else if (data.length > 0) {
          setSelectedSymbol(data[0].symbol);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStocks();
  }, []);

  // Fetch articles and price history whenever selected stock changes
  useEffect(() => {
    if (!selectedSymbol) return;
    const fetchArticles = async () => {
      setArticlesLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/stock/${selectedSymbol}/articles?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
        }
      } catch (err) {
        console.error("Failed to fetch articles:", err);
      } finally {
        setArticlesLoading(false);
      }
    };
    const fetchPriceHistory = async () => {
      setPriceLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/stock/${selectedSymbol}/price-history`);
        if (res.ok) {
          const data = await res.json();
          setPriceHistory(data);
        }
      } catch (err) {
        console.error("Failed to fetch price history:", err);
      } finally {
        setPriceLoading(false);
      }
    };
    fetchArticles();
    fetchPriceHistory();
  }, [selectedSymbol]);


  const handleRefreshArticles = async () => {
    if (!selectedSymbol || refreshing) return;
    setRefreshing(true);
    try {
      await fetch(`${API_URL}/api/v1/stock/${selectedSymbol}/articles/refresh`, { method: "POST" });
      // Wait a moment then refetch
      setTimeout(async () => {
        const res = await fetch(`${API_URL}/api/v1/stock/${selectedSymbol}/articles?limit=50`);
        if (res.ok) setArticles(await res.json());
        setRefreshing(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setRefreshing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedSymbol) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_symbol: selectedSymbol }),
      });
      const data = await res.json();
      setReport(data);
      setMessages([
        { role: "assistant", text: `I have compiled the comprehensive qualitative research report for ${selectedSymbol}. You can now query quarterly disclosures, order books, PLI status, or audit details using the AI Assistant below.` }
      ]);
    } catch (err) {
      console.error(err);
      alert("Error compiling report from local LLM. Verify Ollama service state.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = query;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setQuery("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/rag-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMsg,
          stock_symbol: selectedSymbol
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, sources: data.source_documents }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Error fetching answer from vector database." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Panel with Stock Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-2xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] shadow-sm dark:shadow-lg transition-colors duration-200">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 dark:text-[#00E5FF]">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Qualitative Research</span>
            <span className="text-xs text-slate-300 dark:text-slate-600 font-bold">|</span>
            <a href="/compare" className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:hover:text-[#00E5FF] transition-all">Compare Dashboard</a>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
            Research Command Node
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select a stock to run local LLM-orchestrated RAG report synthesis.</p>
        </div>


        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedSymbol} 
            onChange={(e) => {
              const sym = e.target.value;
              setSelectedSymbol(sym);
              const url = new URL(window.location.href);
              url.searchParams.set("symbol", sym);
              window.history.pushState({}, "", url.toString());
            }} 
            className="flex-grow md:flex-initial bg-white border border-slate-200 hover:border-slate-300 dark:bg-[#0B0F19] dark:border-[#1E2538] dark:hover:border-[#2E3752] rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF] transition-all shadow-sm"
          >
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} — {s.name || "Unknown"}
              </option>
            ))}
          </select>
          <button 
            onClick={handleGenerateReport} 
            disabled={loading} 
            className="px-6 py-2.5 rounded-lg font-bold text-white dark:text-[#080A10] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4] hover:opacity-95 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400 transition-all flex-shrink-0 text-sm active:scale-95 shadow-sm dark:shadow-none"
          >
            {loading ? "Orchestrating AI..." : "Run AI Research"}
          </button>
          {report && (
            <a 
              href={`${API_URL}/api/v1/stock/${selectedSymbol}/export-pdf`}
              download
              className="px-4 py-2.5 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 dark:bg-[#1E2538] dark:hover:bg-[#2B354C] dark:border-[#2B354C] dark:text-slate-200 text-sm transition-all"
            >
              Export PDF
            </a>
          )}
        </div>

      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl space-y-6 shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-blue-600 dark:border-[#00E5FF]"></div>
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-[#00F5D4] absolute animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-900 dark:text-white font-bold text-base tracking-wide">Synthesizing Reports from Local Nodes...</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Evaluating financial statements, scanning PDF embeddings, and generating qualitative analysis. This may take up to 40 seconds.
            </p>
          </div>
        </div>
      )}

      {report && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left/Middle Column: Main report contents */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tab navigation bar */}
            <div className="flex border-b border-slate-200 dark:border-[#1E2538] space-x-6 text-sm overflow-x-auto pb-px">
              <button 
                onClick={() => setActiveTab("core")} 
                className={`pb-3 font-bold tracking-wide transition-all border-b-2 ${activeTab === 'core' ? 'text-blue-600 border-blue-600 dark:text-[#00E5FF] dark:border-[#00E5FF]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border-transparent'}`}
              >
                Business & Operations
              </button>
              <button 
                onClick={() => setActiveTab("swot")} 
                className={`pb-3 font-bold tracking-wide transition-all border-b-2 ${activeTab === 'swot' ? 'text-blue-600 border-blue-600 dark:text-[#00E5FF] dark:border-[#00E5FF]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border-transparent'}`}
              >
                SWOT & Drivers
              </button>
              <button 
                onClick={() => setActiveTab("financials")} 
                className={`pb-3 font-bold tracking-wide transition-all border-b-2 ${activeTab === 'financials' ? 'text-blue-600 border-blue-600 dark:text-[#00E5FF] dark:border-[#00E5FF]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border-transparent'}`}
              >
                Financial Analytics
              </button>
              <button 
                onClick={() => setActiveTab("cases")} 
                className={`pb-3 font-bold tracking-wide transition-all border-b-2 ${activeTab === 'cases' ? 'text-blue-600 border-blue-600 dark:text-[#00E5FF] dark:border-[#00E5FF]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border-transparent'}`}
              >
                Scenarios & Thesis
              </button>
              <button 
                onClick={() => setActiveTab("visualizations")} 
                className={`pb-3 font-bold tracking-wide transition-all border-b-2 ${activeTab === 'visualizations' ? 'text-blue-600 border-blue-600 dark:text-[#00E5FF] dark:border-[#00E5FF]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border-transparent'}`}
              >
                Visualizations
              </button>
            </div>


            {/* Tab contents panel */}
            <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl p-6 sm:p-8 min-h-[450px] shadow-sm dark:shadow-xl transition-colors duration-200">
              
              {activeTab === "core" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-wide border-b border-slate-100 dark:border-[#1E2538] pb-2 mb-4">
                      Business Overview
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.business_overview}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                      <h4 className="text-xs font-black text-blue-600 dark:text-[#00E5FF] uppercase tracking-wider mb-2.5">Revenue Dynamics</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.revenue_analysis}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                      <h4 className="text-xs font-black text-blue-600 dark:text-[#00E5FF] uppercase tracking-wider mb-2.5">Profitability Structure</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.profit_analysis}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                      <h4 className="text-xs font-black text-blue-600 dark:text-[#00E5FF] uppercase tracking-wider mb-2.5">Cash Flows & Solvency</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.cash_flow_analysis}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                      <h4 className="text-xs font-black text-blue-600 dark:text-[#00E5FF] uppercase tracking-wider mb-2.5">Management Outlook</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.management_commentary_summary}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "swot" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/20">
                      <h4 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Growth Drivers & Moats</span>
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.opportunities}</p>
                    </div>

                    <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/10 dark:border-red-500/20">
                      <h4 className="text-sm font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Critical Risks</span>
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.risks}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide mb-2.5">Competitive Positioning</h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.competitive_position}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide mb-2.5">Sector Tailwinds & Policy Benefits</h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.sector_tailwinds}</p>
                  </div>
                </div>
              )}

              {activeTab === "financials" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                      <BarChart2 className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />
                      <span>Quantitative Benchmarks</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E2538] shadow-inner text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">P/E Ratio</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{report.metrics.pe_ratio || "N/A"}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E2538] shadow-inner text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">ROE</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{report.metrics.roe ? `${report.metrics.roe}%` : "N/A"}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E2538] shadow-inner text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">ROCE</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{report.metrics.roce ? `${report.metrics.roce}%` : "N/A"}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E2538] shadow-inner text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Debt / Equity</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{report.metrics.debt_equity ?? "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide mb-2.5">Valuation Assessment</h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.valuation_assessment}</p>
                  </div>
                </div>
              )}

              {activeTab === "cases" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-xl bg-blue-500/5 dark:bg-[#00E5FF]/5 border border-blue-500/10 dark:border-[#00E5FF]/10">
                      <h4 className="text-sm font-extrabold text-blue-600 dark:text-[#00E5FF] uppercase tracking-wider mb-3 flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>Bull Case Model</span>
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.bull_case}</p>
                    </div>

                    <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <h4 className="text-sm font-extrabold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-3 flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Bear Case Model</span>
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{report.report.bear_case}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-[#00E5FF]/5 dark:to-[#00F5D4]/5 border border-slate-200 dark:border-[#1E2538]">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide mb-2.5">Investment Thesis</h3>
                    <p className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-bold">{report.report.final_investment_thesis}</p>
                  </div>
                </div>
              )}

              {activeTab === "visualizations" && (
                <div className="space-y-8 animate-fade-in">
                  {/* Radar Chart for qualitative metrics comparison */}
                  <div className="bg-slate-50 dark:bg-[#0B0F19]/40 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                    <h4 className="text-xs font-black text-blue-600 dark:text-[#00E5FF] uppercase tracking-wider mb-4">Multi-Dimensional Analysis Profile</h4>
                    <div className="h-72 w-full text-[10px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                          { subject: 'Valuation (P/E)', value: report.metrics?.pe_ratio ? Math.max(10, Math.min(100, 100 - report.metrics.pe_ratio)) : 50 },
                          { subject: 'Efficiency (ROE)', value: report.metrics?.roe ? Math.min(100, report.metrics.roe * 2) : 50 },
                          { subject: 'Profitability (ROCE)', value: report.metrics?.roce ? Math.min(100, report.metrics.roce * 2) : 50 },
                          { subject: 'Risk Profile (D/E)', value: report.metrics?.debt_equity !== null ? Math.max(0, 100 - (report.metrics.debt_equity * 40)) : 50 },
                          { subject: 'Promoter Skin', value: report.metrics?.promoter_holding || 50 },
                          { subject: 'Sentiment Score', value: report.score || 50 }
                        ]}>
                          <PolarGrid stroke="#2D3753" />
                          <PolarAngleAxis dataKey="subject" stroke="#64748B" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748B" />
                          <Radar name={selectedSymbol} dataKey="value" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.25} />
                          <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E2538', color: '#fff' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Price History & Moving Averages Chart */}
                  <div className="bg-slate-50 dark:bg-[#0B0F19]/40 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                    <h4 className="text-xs font-black text-blue-600 dark:text-[#00E5FF] uppercase tracking-wider mb-4">Interactive Price & EMA History</h4>
                    <div className="h-64 w-full text-[10px]">
                      {priceLoading ? (
                        <div className="h-full flex items-center justify-center font-bold text-slate-400">Loading chart data...</div>
                      ) : priceHistory.length === 0 ? (
                        <div className="h-full flex items-center justify-center font-bold text-slate-400">No price history available.</div>
                      ) : (
                        (() => {
                          const ema20 = calculateEMA(priceHistory, 20);
                          const ema50 = calculateEMA(priceHistory, 50);
                          const ema200 = calculateEMA(priceHistory, 200);
                          const chartPriceData = priceHistory.map((pt, idx) => ({
                            ...pt,
                            ema20: ema20[idx],
                            ema50: ema50[idx],
                            ema200: ema200[idx],
                          }));

                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartPriceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2E3752" opacity={0.15} />
                                <XAxis dataKey="date" stroke="#64748B" tickFormatter={(str) => str?.slice(5, 10)} />
                                <YAxis stroke="#64748B" domain={['auto', 'auto']} />
                                <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E2538', color: '#fff' }} />
                                <Legend />
                                <Line type="monotone" dataKey="close_price" name="Close Price" stroke="#00E5FF" strokeWidth={2.5} dot={false} />
                                <Line type="monotone" dataKey="ema20" name="EMA 20" stroke="#FF007F" strokeWidth={1.2} strokeDasharray="5 5" dot={false} />
                                <Line type="monotone" dataKey="ema50" name="EMA 50" stroke="#FFD700" strokeWidth={1.2} strokeDasharray="5 5" dot={false} />
                                <Line type="monotone" dataKey="ema200" name="EMA 200" stroke="#10B981" strokeWidth={1.2} strokeDasharray="5 5" dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  {/* Sentiment Over Time Chart */}
                  <div className="bg-slate-50 dark:bg-[#0B0F19]/40 border border-slate-200 dark:border-[#1E2538] p-5 rounded-xl">
                    <h4 className="text-xs font-black text-blue-600 dark:text-[#00E5FF] uppercase tracking-wider mb-4">News Sentiment Trend</h4>
                    <div className="h-64 w-full text-[10px]">
                      {articles.length === 0 ? (
                        <div className="h-full flex items-center justify-center font-bold text-slate-400">No article sentiment records available.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.values(
                              articles.reduce((acc, curr) => {
                                const date = curr.published_date || curr.fetched_at?.slice(0, 10) || "Recent";
                                if (!acc[date]) acc[date] = { date, Positive: 0, Neutral: 0, Negative: 0 };
                                if (curr.sentiment === "Positive") acc[date].Positive++;
                                else if (curr.sentiment === "Negative") acc[date].Negative++;
                                else acc[date].Neutral++;
                                return acc;
                              }, {} as Record<string, any>)
                            ).slice(-10)} // Show last 10 days of news activity
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#2E3752" opacity={0.15} />
                            <XAxis dataKey="date" stroke="#64748B" />
                            <YAxis stroke="#64748B" />
                            <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E2538', color: '#fff' }} />
                            <Legend />
                            <Bar dataKey="Positive" stackId="a" fill="#10B981" />
                            <Bar dataKey="Neutral" stackId="a" fill="#F59E0B" />
                            <Bar dataKey="Negative" stackId="a" fill="#EF4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              )}


            </div>
          </div>

          {/* Right Column: Ratings and RAG Chat Assistant */}
          <div className="space-y-6">
            
            {/* Rating card */}
            <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl p-6 text-center space-y-5 shadow-sm dark:shadow-xl transition-colors duration-200">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider flex items-center justify-center space-x-1">
                <Award className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />
                <span>Deterministic Rating & Score Gauge</span>
              </span>
              
              {/* Speedometer Gauge */}
              <div className="flex justify-center items-center h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "score", value: report.score, fill: "#00E5FF" },
                        { name: "remainder", value: 100 - report.score, fill: "#1E2538" }
                      ]}
                      dataKey="value"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={0}
                    >
                      <Cell fill="url(#colorScore)" />
                      <Cell fill="#1A2035" />
                    </Pie>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00E5FF" />
                        <stop offset="100%" stopColor="#00F5D4" />
                      </linearGradient>
                    </defs>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute bottom-2 flex flex-col items-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{report.score}</span>
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest mt-1">Score / 100</span>
                </div>
              </div>

              <h2 className="text-3xl font-black text-blue-600 dark:text-white dark:bg-gradient-to-r dark:from-[#00E5FF] dark:to-[#00F5D4] dark:bg-clip-text dark:text-transparent tracking-tight py-1">
                Rating: {report.rating}
              </h2>
              
              <div className="grid grid-cols-2 gap-4 py-3.5 border-y border-slate-200 dark:border-[#1E2538]/60">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Calculated Score</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{report.score} <span className="text-[10px] font-medium text-slate-400">/ 100</span></p>
                </div>
                <div className="text-center border-l border-slate-200 dark:border-[#1E2538]/60">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Confidence</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{report.confidence_score}%</p>
                </div>
              </div>

              <div className="text-left bg-slate-50 dark:bg-[#0B0F19]/55 p-4 rounded-xl border border-slate-200 dark:border-[#1E2538]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Rating Logic</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic whitespace-pre-wrap">
                  {report.report.score_explanation}
                </p>
              </div>
            </div>

            {/* RAG Chat assistant */}
            <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl p-5 flex flex-col h-[480px] shadow-sm dark:shadow-xl relative overflow-hidden transition-colors duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4]"></div>
              
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />
                <span>Interactive RAG Agent</span>
              </h3>
              
              {/* Messages list */}
              <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin text-xs">
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`p-3.5 rounded-xl leading-relaxed flex flex-col ${msg.role === 'user' ? 'bg-blue-600/10 text-slate-800 dark:bg-[#00E5FF]/10 dark:text-slate-200 self-end ml-10 border border-blue-600/15 dark:border-[#00E5FF]/15' : 'bg-slate-50 text-slate-700 dark:bg-[#0B0F19]/80 dark:text-slate-300 mr-10 border border-slate-200 dark:border-[#1E2538]'}`}
                  >
                    <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1.5">
                      {msg.role === 'user' ? 'Client' : 'Local Agent'}
                    </span>
                    <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#1E2538]/60 space-y-1.5">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Cited Sources:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {msg.sources.map((src, idx) => (
                            <div 
                              key={idx} 
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200/80 dark:bg-[#0E121E] dark:hover:bg-[#1E2538] text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#1E2538] flex items-center space-x-1 cursor-default select-none transition-colors"
                              title={src.content}
                            >
                              <span className="truncate max-w-[120px]">{src.metadata.source_file}</span>
                              <span className="opacity-60">• p.{src.metadata.page_number}</span>
                              <span className="text-blue-500 dark:text-[#00E5FF] opacity-90">({Math.round(src.score * 100)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest animate-pulse pl-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-[#00F5D4]"></span>
                    <span>Querying vector store...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex space-x-2 border-t border-slate-200 dark:border-[#1E2538] pt-3.5 mt-auto">
                <input 
                  type="text" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Ask about GROWW's business model, NETWEB's order book, AEROFLEX's financials..." 
                  className="flex-grow bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] focus:border-blue-600 dark:focus:border-[#00E5FF] rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors font-medium" 
                />
                <button 
                  type="submit" 
                  disabled={chatLoading} 
                  className="px-4 bg-blue-600 text-white dark:bg-[#00E5FF] dark:text-[#080A10] rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* News Feed Panel — always visible when a stock is selected */}
      {selectedSymbol && (
        <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] rounded-2xl shadow-sm dark:shadow-xl overflow-hidden transition-colors duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#1E2538]">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-[#00E5FF]/10 border border-blue-100 dark:border-[#00E5FF]/20">
                <Newspaper className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Latest News & Articles
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {articles.length > 0 ? `${articles.length} articles fetched` : "No articles yet — click Refresh to fetch"} · Auto-refreshes daily
                </p>
              </div>
            </div>
            <button
              onClick={handleRefreshArticles}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#1E2538] border border-slate-200 dark:border-[#2B354C] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2A334B] transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Fetching..." : "Refresh"}</span>
            </button>
          </div>

          {/* Articles list */}
          <div className="divide-y divide-slate-100 dark:divide-[#1E2538] max-h-[520px] overflow-y-auto">
            {articlesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3 text-slate-400 dark:text-slate-500">
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Loading articles...</span>
                </div>
              </div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-8">
                <Newspaper className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No articles fetched yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click Refresh to pull the latest news for {selectedSymbol}</p>
              </div>
            ) : (
              articles.map((article) => {
                const sentimentConfig = {
                  Positive: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
                  Negative: { dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
                  Neutral:  { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
                }[article.sentiment] ?? { dot: "bg-slate-400", badge: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" };

                return (
                  <div key={article.id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-[#0B0F19]/40 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${sentimentConfig.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sentimentConfig.dot}`} />
                            {article.sentiment}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                            {article.source} · {article.published_date || article.fetched_at?.slice(0, 10) || "Recent"}
                          </span>
                        </div>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug hover:text-blue-600 dark:hover:text-[#00E5FF] transition-colors line-clamp-2 group-hover:underline"
                        >
                          {article.title}
                        </a>
                        {article.summary && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2 font-medium">
                            {article.summary}
                          </p>
                        )}
                      </div>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-[#00E5FF] hover:bg-blue-50 dark:hover:bg-[#00E5FF]/10 transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl text-center shadow-sm dark:shadow-xl transition-colors duration-200">
          <div className="p-4 bg-slate-50 border border-slate-200 dark:bg-[#0E121E] dark:border-[#1E2538] rounded-2xl text-slate-400 dark:text-slate-500 mb-5">
            <BookOpen className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-wide">No Qualitative Analysis Active</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 font-medium">
            Select a stock ticker from the control node above and trigger the local qualitative compiler.
          </p>
        </div>
      )}
    </div>
  );
}
