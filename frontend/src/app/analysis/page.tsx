"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, BookOpen, AlertTriangle, ShieldCheck, TrendingUp, HelpCircle, BarChart2, MessageSquare, Award, ArrowUpRight } from "lucide-react";

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
}

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
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
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

            </div>
          </div>

          {/* Right Column: Ratings and RAG Chat Assistant */}
          <div className="space-y-6">
            
            {/* Rating card */}
            <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl p-6 text-center space-y-5 shadow-sm dark:shadow-xl transition-colors duration-200">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider flex items-center justify-center space-x-1">
                <Award className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />
                <span>Deterministic Rating</span>
              </span>
              
              <h2 className="text-5xl font-black text-blue-600 dark:text-white dark:bg-gradient-to-r dark:from-[#00E5FF] dark:to-[#00F5D4] dark:bg-clip-text dark:text-transparent tracking-tight py-1">
                {report.rating}
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
                  placeholder="Ask about order book, supply chain..." 
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
