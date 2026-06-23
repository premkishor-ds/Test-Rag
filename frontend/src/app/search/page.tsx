"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Globe, FileText, ArrowRight, MessageSquare } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SearchResult {
  score: number;
  content: string;
  metadata: {
    stock_symbol: string;
    stock_name: string;
    source_file: string;
    financial_year: number;
    page_number: number;
    source_type?: string;
  };
}

interface Stock {
  symbol: string;
  name: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("");

  useEffect(() => {
    // Fetch stocks list for filters
    fetch(`${API_URL}/api/v1/stocks`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setStocks(data))
      .catch((e) => console.error("Error loading stocks:", e));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("query", query);
      params.set("limit", "15");
      if (selectedStock) {
        params.set("stock_symbol", selectedStock);
      }
      const res = await fetch(`${API_URL}/api/v1/search/global?${params.toString()}`);
      if (res.ok) {
        let data: SearchResult[] = await res.json();
        // Client side filtering for document type if selected
        if (selectedDocType) {
          data = data.filter((r) => r.metadata.source_type === selectedDocType || r.metadata.source_file.toLowerCase().includes(selectedDocType));
        }
        setResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAskCopilot = (r: SearchResult) => {
    // Save to sessionStorage to load on the Chat page
    sessionStorage.setItem("pending_chat_prompt", `In the document ${r.metadata.source_file} (Page ${r.metadata.page_number}), it states: "${r.content.substring(0, 150)}...". Tell me more about this.`);
    sessionStorage.setItem("pending_chat_file", r.metadata.source_file);
    sessionStorage.setItem("pending_chat_symbol", r.metadata.stock_symbol);
    router.push("/chat");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 dark:text-white">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Globe className="h-6 w-6 text-blue-600 dark:text-[#00E5FF]" />
        <h1 className="text-2xl font-black tracking-tight">Global RAG Search</h1>
      </div>

      {/* Search Input & Filters */}
      <form onSubmit={handleSearch} className="space-y-4 bg-white dark:bg-[#0E121E]/60 border border-slate-200 dark:border-[#1E2538] p-5 rounded-2xl shadow-sm">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for keywords or metrics across all uploaded PDFs..."
            className="flex-grow bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-3 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-semibold"
          />
          <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm flex items-center gap-2 active:scale-95 transition-all">
            <Search className="h-4 w-4" />
            <span>{loading ? "Searching..." : "Search"}</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap gap-4 pt-1 select-none">
          <div className="flex-grow min-w-[150px]">
            <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Filter by Stock</label>
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="w-full bg-slate-50 border border-slate-255 dark:bg-[#0B0F19] dark:border-[#1E2538] text-xs p-2 rounded-lg font-bold"
            >
              <option value="">All Stocks</option>
              {stocks.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-grow min-w-[150px]">
            <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Filter by Document Type</label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-255 dark:bg-[#0B0F19] dark:border-[#1E2538] text-xs p-2 rounded-lg font-bold"
            >
              <option value="">All Document Types</option>
              <option value="annual_report">Annual Reports</option>
              <option value="quarterly_result">Quarterly Results</option>
              <option value="concall">Concall Transcripts</option>
              <option value="presentation">Investor Presentations</option>
            </select>
          </div>
        </div>
      </form>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-sm font-semibold text-slate-400">Querying semantic indices...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-semibold text-sm">
            No search results. Try searching for "order book", "growth drivers", or "PLI scheme".
          </div>
        ) : (
          results.map((r, i) => (
            <div key={i} className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-blue-600 dark:text-[#00E5FF] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-[#00E5FF]/10 border border-blue-100 dark:border-[#00E5FF]/20">
                  {r.metadata.stock_symbol}
                </span>
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {r.metadata.source_file} (Page {r.metadata.page_number})
                </span>
              </div>
              <p className="text-xs text-slate-750 dark:text-slate-300 leading-relaxed font-semibold">
                {r.content}
              </p>
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#1E2538]/60 pt-3">
                <button
                  onClick={() => handleAskCopilot(r)}
                  className="flex items-center space-x-1.5 text-[10px] font-black text-blue-600 dark:text-[#00E5FF] hover:opacity-85 uppercase tracking-wider active:scale-95 transition-all"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Ask Copilot about this</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Relevance: {Math.round(r.score * 100)}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
