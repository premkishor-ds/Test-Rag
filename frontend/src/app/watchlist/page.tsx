"use client";

import { useState, useEffect } from "react";
import { ListPlus, Trash2, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Watchlist {
  id: number;
  name: string;
}

interface TrackedStock {
  symbol: string;
  name: string;
  current_score: number | null;
  rating: string;
  score_change: number;
  pe_ratio: number | null;
  revenue_growth: number | null;
  profit_growth: number | null;
  last_updated: string | null;
}

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [newListName, setNewListName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [items, setItems] = useState<TrackedStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<Array<{ symbol: string; name: string }>>([]);

  const fetchStocks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/stocks`);
      const data = await res.json();
      setStocks(data);
      if (data.length > 0 && !newSymbol) {
        setNewSymbol(data[0].symbol);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWatchlists = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/watchlists`);
      const data = await res.json();
      setWatchlists(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrackedStocks = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/watchlist/${selectedId}/track`);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlists();
    fetchStocks();
  }, []);

  useEffect(() => {
    fetchTrackedStocks();
  }, [selectedId]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewListName("");
        await fetchWatchlists();
        setSelectedId(data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWatchlist = async () => {
    if (!selectedId) return;
    if (!confirm("Are you sure you want to delete this watchlist?")) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/watchlist/${selectedId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedId("");
        setItems([]);
        await fetchWatchlists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newSymbol.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/watchlist/${selectedId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_symbol: newSymbol.toUpperCase() }),
      });
      if (res.ok) {
        setNewSymbol("");
        await fetchTrackedStocks();
      } else {
        alert("Stock symbol not found or already in watchlist.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/watchlist/${selectedId}/stock/${symbol}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchTrackedStocks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-blue-600 dark:text-[#00E5FF]">
          <ListPlus className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Stock Watchlists node</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">Watchlists Manager</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track valuation movements and score shifts on your preferred list of stocks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Playlists control panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* List select */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Select List</label>
            <div className="flex space-x-2">
              <select 
                value={selectedId} 
                onChange={(e) => setSelectedId(parseInt(e.target.value))} 
                className="flex-grow bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF] transition-all font-semibold shadow-sm"
              >
                {watchlists.length === 0 ? (
                  <option value="">No lists created</option>
                ) : (
                  watchlists.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))
                )}
              </select>
              {selectedId && (
                <button 
                  onClick={handleDeleteWatchlist} 
                  className="p-2.5 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95 shadow-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Create new list form */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-[#1E2538] pb-3">
              <ListPlus className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />
              <span>Create New List</span>
            </h3>
            <form onSubmit={handleCreateWatchlist} className="space-y-3">
              <input 
                type="text" 
                value={newListName} 
                onChange={(e) => setNewListName(e.target.value)} 
                placeholder="e.g. EV Stocks" 
                className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] focus:border-blue-600 dark:focus:border-[#00E5FF] rounded-lg px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors font-medium shadow-inner" 
              />
              <button 
                type="submit" 
                className="w-full py-2.5 bg-slate-100 dark:bg-[#1E2538] border border-slate-200 dark:border-[#2B354C] hover:bg-slate-200 dark:hover:bg-[#2A334B] text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-lg font-bold text-xs transition-all active:scale-95 shadow-sm"
              >
                Create Watchlist
              </button>
            </form>
          </div>
        </div>

        {/* Dynamic stock stats */}
        <div className="lg:col-span-3 space-y-6">
          {/* Add ticker control */}
          <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] gap-4 shadow-sm transition-colors duration-200">
            <form onSubmit={handleAddStock} className="flex items-center space-x-2 w-full sm:w-auto">
              <input 
                type="text" 
                value={newSymbol} 
                onChange={(e) => setNewSymbol(e.target.value)} 
                placeholder="Enter symbol (e.g., TCS)..." 
                className="bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] focus:border-blue-600 dark:focus:border-[#00E5FF] rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none transition-colors" 
              />
              <button 
                type="submit" 
                className="flex items-center space-x-1 px-4 py-2 bg-blue-600 dark:bg-[#00E5FF] text-white dark:text-[#080A10] rounded-lg text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Symbol</span>
              </button>
            </form>
          </div>

          {/* List contents */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] rounded-xl overflow-hidden shadow-sm dark:shadow-xl transition-colors duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1E2538] text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-[#0F1322]/50">
                    <th className="py-3.5 px-4">Symbol</th>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Score Change</th>
                    <th className="py-3.5 px-4">PE Ratio</th>
                    <th className="py-3.5 px-4">Revenue Growth</th>
                    <th className="py-3.5 px-4">Rating</th>
                    <th className="py-3.5 px-4 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E2538]/40">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">Tracking score changes...</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        No stocks added to this watchlist yet. Add a symbol above to start tracking!
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.symbol} className="hover:bg-slate-50/30 dark:hover:bg-[#0E121E]/30 transition-colors text-sm">
                        <td className="py-4 px-4 font-black text-blue-600 dark:text-[#00E5FF] tracking-wide">{item.symbol}</td>
                        <td className="py-4 px-4 font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-bold">{item.current_score !== null ? `${item.current_score}/100` : "N/A"}</td>
                        <td className="py-4 px-4">
                          {item.score_change === 0 ? (
                            <span className="text-slate-400 text-xs font-semibold">-</span>
                          ) : item.score_change > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center">
                              <ArrowUpRight className="h-3 w-3 mr-0.5" />
                              +{item.score_change}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-xs font-bold flex items-center">
                              <ArrowDownRight className="h-3 w-3 mr-0.5" />
                              {item.score_change}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-bold">{item.pe_ratio !== null ? item.pe_ratio : "—"}</td>
                        <td className="py-4 px-4 text-[#00F5D4] dark:text-[#00F5D4] font-bold">{item.revenue_growth !== null ? `${item.revenue_growth}%` : "—"}</td>
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${item.rating === 'Strong Buy' || item.rating === 'Buy' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : item.rating === 'Watchlist' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                            {item.rating}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button onClick={() => handleRemoveStock(item.symbol)} className="text-xs text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 font-bold transition-colors">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
