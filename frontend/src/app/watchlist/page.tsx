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
      <div>
        <h1 className="text-3xl font-extrabold text-white">Watchlists Manager</h1>
        <p className="text-slate-400 text-sm mt-1">Track valuation movements and score shifts on your preferred list of stocks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Playlists control panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* List select */}
          <div className="glass-panel border border-darkBorder rounded-xl p-5 space-y-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase">Select List</label>
            <div className="flex space-x-2">
              <select value={selectedId} onChange={(e) => setSelectedId(parseInt(e.target.value))} className="flex-grow bg-darkBg border border-darkBorder rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyanAccent">
                {watchlists.length === 0 ? (
                  <option value="">No lists created</option>
                ) : (
                  watchlists.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))
                )}
              </select>
              {selectedId && (
                <button onClick={handleDeleteWatchlist} className="p-2 border border-red-500/30 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Create new list form */}
          <div className="glass-panel border border-darkBorder rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ListPlus className="h-4 w-4 text-cyanAccent" />
              <span>Create New List</span>
            </h3>
            <form onSubmit={handleCreateWatchlist} className="space-y-2">
              <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. Electric Vehicle Stocks" className="w-full bg-darkBg border border-darkBorder rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyanAccent" />
              <button type="submit" className="w-full py-2 bg-darkBorder border border-slate-700 hover:bg-slate-700/50 rounded font-bold text-xs text-slate-200 transition-colors">
                Create Watchlist
              </button>
            </form>
          </div>
        </div>

        {/* Dynamic stock stats */}
        <div className="lg:col-span-3 space-y-6">
          {/* Add ticker control */}
          <div className="flex flex-wrap items-center justify-between p-4 rounded-xl glass-panel border border-darkBorder gap-4">
            <form onSubmit={handleAddStock} className="flex items-center space-x-2">
              <input type="text" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="Enter stock symbol..." className="bg-darkBg border border-darkBorder rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyanAccent" />
              <button type="submit" className="flex items-center space-x-1 px-3.5 py-1.5 bg-cyanAccent text-darkBg rounded text-xs font-bold hover:bg-cyanAccent/90 transition-colors">
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* List contents */}
          <div className="glass-panel border border-darkBorder rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-darkBorder text-xs text-slate-400 uppercase bg-darkPanel/20">
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
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">Tracking score changes...</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No stocks added to this watchlist yet. Add a symbol above to start tracking!
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.symbol} className="border-b border-darkBorder/40 hover:bg-darkPanel/10 transition-all text-sm">
                        <td className="py-4 px-4 font-bold text-cyanAccent">{item.symbol}</td>
                        <td className="py-4 px-4 font-medium text-white">{item.name}</td>
                        <td className="py-4 px-4 text-slate-300 font-semibold">{item.current_score !== null ? `${item.current_score}/100` : "N/A"}</td>
                        <td className="py-4 px-4">
                          {item.score_change === 0 ? (
                            <span className="text-slate-400 text-xs">-</span>
                          ) : item.score_change > 0 ? (
                            <span className="text-emerald-400 text-xs flex items-center">
                              <ArrowUpRight className="h-3 w-3 mr-0.5" />
                              +{item.score_change}
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs flex items-center">
                              <ArrowDownRight className="h-3 w-3 mr-0.5" />
                              {item.score_change}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-300">{item.pe_ratio !== null ? item.pe_ratio : "N/A"}</td>
                        <td className="py-4 px-4 text-slate-300">{item.revenue_growth !== null ? `${item.revenue_growth}%` : "N/A"}</td>
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.rating === 'Strong Buy' || item.rating === 'Buy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : item.rating === 'Watchlist' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {item.rating}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button onClick={() => handleRemoveStock(item.symbol)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
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
