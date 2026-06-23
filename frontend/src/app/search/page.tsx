"use client";

import { useState } from "react";
import { Search, Globe, FileText, ArrowRight } from "lucide-react";

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
  };
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/search/global?query=${encodeURIComponent(query)}&limit=15`);
      if (res.ok) {
        setResults(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 dark:text-white">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Globe className="h-6 w-6 text-blue-600 dark:text-[#00E5FF]" />
        <h1 className="text-2xl font-black tracking-tight">Global RAG Search</h1>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex gap-3 bg-white dark:bg-[#0E121E]/60 border border-slate-200 dark:border-[#1E2538] p-4 rounded-2xl">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for keywords or metrics across all uploaded PDFs..."
          className="flex-grow bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-3 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm flex items-center gap-2 active:scale-95 transition-all">
          <Search className="h-4 w-4" />
          <span>{loading ? "Searching..." : "Search"}</span>
        </button>
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
            <div key={i} className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-blue-600 dark:text-[#00E5FF] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-[#00E5FF]/10 border border-blue-100 dark:border-[#00E5FF]/20">
                  {r.metadata.stock_symbol}
                </span>
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {r.metadata.source_file} (Page {r.metadata.page_number})
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                {r.content}
              </p>
              <div className="text-[10px] text-right font-black text-slate-400 uppercase tracking-wider">
                Relevance: {Math.round(r.score * 100)}%
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
