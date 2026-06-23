"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, BookOpen, AlertTriangle, ShieldCheck, TrendingUp, HelpCircle } from "lucide-react";

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
        const res = await fetch("process.env.NEXT_PUBLIC_API_URL/api/v1/stocks");
        const data = await res.json();
        setStocks(data);
        if (data.length > 0) setSelectedSymbol(data[0].symbol);
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
      const res = await fetch("process.env.NEXT_PUBLIC_API_URL/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_symbol: selectedSymbol }),
      });
      const data = await res.json();
      setReport(data);
      // Initialize chat with greeting
      setMessages([
        { role: "assistant", text: `I have generated the research report for ${selectedSymbol}. Ask me anything about its quarterly updates, order books, PLI benefits, or annual report details!` }
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
      const res = await fetch("process.env.NEXT_PUBLIC_API_URL/api/v1/rag-query", {
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
      {/* Header selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-xl glass-panel border border-darkBorder">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-cyanAccent" />
            <span>Qualitative Research Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Triggers local RAG pipeline to compile comprehensive stock reports.</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="bg-darkBg border border-darkBorder rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyanAccent">
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} - {s.name}
              </option>
            ))}
          </select>
          <button onClick={handleGenerateReport} disabled={loading} className="px-5 py-2 rounded font-bold text-darkBg bg-cyanAccent hover:bg-cyanAccent/90 disabled:bg-slate-700 disabled:text-slate-400 transition-all flex-shrink-0">
            {loading ? "Generating Report..." : "Run AI Research"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 glass-panel border border-darkBorder rounded-xl space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyanAccent"></div>
          <p className="text-slate-300 font-semibold text-sm">Compiling research from local Qwen2.5:14B...</p>
          <p className="text-xs text-slate-500 max-w-sm text-center">This can take up to 45 seconds since it evaluates financial statements and processes semantic files.</p>
        </div>
      )}

      {report && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main report views */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab navigation */}
            <div className="flex border-b border-darkBorder space-x-6 text-sm">
              <button onClick={() => setActiveTab("core")} className={`pb-3 font-semibold ${activeTab === 'core' ? 'text-cyanAccent border-b-2 border-cyanAccent' : 'text-slate-400 hover:text-white'}`}>
                Business Overview
              </button>
              <button onClick={() => setActiveTab("swot")} className={`pb-3 font-semibold ${activeTab === 'swot' ? 'text-cyanAccent border-b-2 border-cyanAccent' : 'text-slate-400 hover:text-white'}`}>
                SWOT & Drivers
              </button>
              <button onClick={() => setActiveTab("financials")} className={`pb-3 font-semibold ${activeTab === 'financials' ? 'text-cyanAccent border-b-2 border-cyanAccent' : 'text-slate-400 hover:text-white'}`}>
                Financials Details
              </button>
              <button onClick={() => setActiveTab("cases")} className={`pb-3 font-semibold ${activeTab === 'cases' ? 'text-cyanAccent border-b-2 border-cyanAccent' : 'text-slate-400 hover:text-white'}`}>
                Bull & Bear Case
              </button>
            </div>

            {/* Tab contents */}
            <div className="glass-panel border border-darkBorder rounded-xl p-6 min-h-[400px]">
              {activeTab === "core" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Business Overview</h3>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.business_overview}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-bold text-cyanAccent uppercase mb-2">Revenue Analysis</h4>
                      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{report.report.revenue_analysis}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-cyanAccent uppercase mb-2">Profit Analysis</h4>
                      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{report.report.profit_analysis}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-cyanAccent uppercase mb-2">Cash Flow Analysis</h4>
                      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{report.report.cash_flow_analysis}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-cyanAccent uppercase mb-2">Management Commentary</h4>
                      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{report.report.management_commentary_summary}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "swot" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded bg-emerald-500/5 border border-emerald-500/10">
                      <h4 className="text-sm font-bold text-emerald-400 uppercase mb-2 flex items-center space-x-1">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Opportunities & Drivers</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.opportunities}</p>
                    </div>

                    <div className="p-4 rounded bg-red-500/5 border border-red-500/10">
                      <h4 className="text-sm font-bold text-red-400 uppercase mb-2 flex items-center space-x-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Key Risks</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.risks}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white mb-2">Competitive Position & Moat</h3>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.competitive_position}</p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white mb-2">Tailwind Summary</h3>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.sector_tailwinds}</p>
                  </div>
                </div>
              )}

              {activeTab === "financials" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Core Financial Ratios</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded bg-darkBg border border-darkBorder">
                        <p className="text-xs text-slate-500">P/E Ratio</p>
                        <p className="text-xl font-bold text-white mt-1">{report.metrics.pe_ratio || "N/A"}</p>
                      </div>
                      <div className="p-4 rounded bg-darkBg border border-darkBorder">
                        <p className="text-xs text-slate-500">ROE</p>
                        <p className="text-xl font-bold text-white mt-1">{report.metrics.roe ? `${report.metrics.roe}%` : "N/A"}</p>
                      </div>
                      <div className="p-4 rounded bg-darkBg border border-darkBorder">
                        <p className="text-xs text-slate-500">ROCE</p>
                        <p className="text-xl font-bold text-white mt-1">{report.metrics.roce ? `${report.metrics.roce}%` : "N/A"}</p>
                      </div>
                      <div className="p-4 rounded bg-darkBg border border-darkBorder">
                        <p className="text-xs text-slate-500">Debt/Equity</p>
                        <p className="text-xl font-bold text-white mt-1">{report.metrics.debt_equity ?? "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white mb-2">Valuation Assessment</h3>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.valuation_assessment}</p>
                  </div>
                </div>
              )}

              {activeTab === "cases" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded bg-cyanAccent/5 border border-cyanAccent/10">
                      <h4 className="text-sm font-bold text-cyanAccent uppercase mb-2 flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>Bull Case Scenario</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.bull_case}</p>
                    </div>

                    <div className="p-5 rounded bg-amber-500/5 border border-amber-500/10">
                      <h4 className="text-sm font-bold text-amber-500 uppercase mb-2 flex items-center space-x-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Bear Case Scenario</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.bear_case}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded bg-darkBg/60 border border-darkBorder">
                    <h3 className="text-sm font-bold text-white mb-2">Final Investment Thesis</h3>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{report.report.final_investment_thesis}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Investment Rating & Q&A Panel */}
          <div className="space-y-6">
            {/* Rating card */}
            <div className="glass-panel border border-darkBorder rounded-xl p-6 text-center space-y-4">
              <p className="text-xs text-slate-400 uppercase font-semibold">Deterministic Investment Rating</p>
              <h2 className="text-4xl font-extrabold bg-gradient-to-r from-cyanAccent to-tealAccent bg-clip-text text-transparent">{report.rating}</h2>
              
              <div className="flex justify-around items-center py-2 border-y border-darkBorder/40">
                <div>
                  <p className="text-xs text-slate-500">Calculated Score</p>
                  <p className="text-lg font-bold text-white mt-0.5">{report.score}/100</p>
                </div>
                <div className="w-[1px] h-8 bg-darkBorder"></div>
                <div>
                  <p className="text-xs text-slate-500">Confidence</p>
                  <p className="text-lg font-bold text-white mt-0.5">{report.confidence_score}%</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-left leading-relaxed italic whitespace-pre-wrap">{report.report.score_explanation}</p>
            </div>

            {/* RAG Chat assistant */}
            <div className="glass-panel border border-darkBorder rounded-xl p-5 flex flex-col h-[400px]">
              <h3 className="text-sm font-bold text-white mb-3 border-b border-darkBorder pb-2">Document RAG Assistant</h3>
              
              {/* Messages list */}
              <div className="flex-grow overflow-y-auto space-y-3 mb-4 pr-1 text-xs">
                {messages.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-lg leading-relaxed ${msg.role === 'user' ? 'bg-cyanAccent/10 text-cyanAccent self-end ml-6' : 'bg-darkBg/60 text-slate-300 mr-6'}`}>
                    <p className="font-semibold mb-1 text-[10px] text-slate-400 uppercase">{msg.role === 'user' ? 'You' : 'AI Assistant'}</p>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-slate-500 italic animate-pulse">Searching vector indexes...</div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex space-x-2 border-t border-darkBorder pt-3">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask about order book, supply chain..." className="flex-grow bg-darkBg border border-darkBorder rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyanAccent" />
                <button type="submit" disabled={chatLoading} className="px-3 bg-cyanAccent text-darkBg rounded font-bold hover:bg-cyanAccent/90 transition-all flex items-center justify-center">
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center p-20 glass-panel border border-darkBorder rounded-xl text-center">
          <BookOpen className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Research Generated</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">Select a monitored stock from the panel above and trigger the qualitative compiler to fetch report details.</p>
        </div>
      )}
    </div>
  );
}
