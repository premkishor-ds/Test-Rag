"use client";

import { useState, useEffect } from "react";
import { Wallet, Plus, Trash2, Edit2, TrendingUp, TrendingDown, RefreshCw, History, Info, PieChart as PieIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const COLORS = ["#00E5FF", "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

interface Holding {
  stock_symbol: string;
  shares: number;
  average_buy_price: number;
  current_price: number;
  cost: number;
  market_value: number;
  pnl: number;
  pnl_pct: number;
}

interface Transaction {
  id: number;
  stock_symbol: string;
  transaction_type: string;
  shares: number;
  price: number;
  timestamp: string;
}

interface Stock {
  symbol: string;
  name: string;
}

export default function PortfolioAnalyzer() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [summary, setSummary] = useState<any>({ total_cost: 0, total_value: 0, pnl: 0, pnl_pct: 0 });
  
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchHoldings();
    fetchTransactions();
    fetchStocksList();
  }, []);

  const fetchHoldings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/portfolio/holdings`);
      if (res.ok) {
        setHoldings(await res.json());
      }
      
      const analRes = await fetch(`${API_URL}/api/v1/portfolio/analysis`);
      if (analRes.ok) {
        setSummary(await analRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/portfolio/transactions?limit=25`);
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStocksList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/stocks`);
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
        if (data.length > 0) setSymbol(data[0].symbol);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncPrices = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/stocks/sync`, { method: "POST" });
      if (res.ok) {
        await fetchHoldings();
        await fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !buyPrice) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/portfolio/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_symbol: symbol,
          shares: parseFloat(shares),
          average_buy_price: parseFloat(buyPrice),
        }),
      });

      if (res.ok) {
        setShares("");
        setBuyPrice("");
        setEditing(false);
        await fetchHoldings();
        await fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (sym: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/portfolio/holdings/${sym}`, { method: "DELETE" });
      if (res.ok) {
        await fetchHoldings();
        await fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (h: Holding) => {
    setSymbol(h.stock_symbol);
    setShares(h.shares.toString());
    setBuyPrice(h.average_buy_price.toString());
    setEditing(true);
  };

  const pieData = holdings.map((h) => ({
    name: h.stock_symbol,
    value: h.market_value,
  }));

  const isProfit = summary.pnl >= 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 dark:text-white">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-blue-600 dark:text-[#00E5FF]" />
          <h1 className="text-2xl font-black tracking-tight">Portfolio Tracker & Analyzer</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncPrices}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? "Syncing yFinance..." : "Sync Live Prices"}</span>
          </button>
          <button onClick={fetchHoldings} disabled={loading} className="p-2 border border-slate-200 dark:border-[#1E2538] rounded-lg bg-white dark:bg-[#0E121E]/60 text-slate-400 hover:text-white transition-colors duration-200">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] text-slate-455 uppercase font-black tracking-wider mb-2">Total Invested Cost</div>
          <div className="text-2xl font-black flex items-baseline">
            <span className="text-xs text-slate-450 font-bold mr-1">Rs.</span>
            {summary.total_cost.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] text-slate-455 uppercase font-black tracking-wider mb-2">Current Value</div>
          <div className="text-2xl font-black flex items-baseline">
            <span className="text-xs text-slate-450 font-bold mr-1">Rs.</span>
            {summary.total_value.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] text-slate-455 uppercase font-black tracking-wider mb-2">Total Gain / Loss</div>
          <div className={`text-2xl font-black flex items-center ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
            <span className="text-sm mr-1 font-bold">Rs.</span>
            {summary.pnl >= 0 ? "+" : ""}
            {summary.pnl.toLocaleString()}
            {isProfit ? <TrendingUp className="h-5 w-5 ml-2" /> : <TrendingDown className="h-5 w-5 ml-2" />}
          </div>
        </div>
        <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] text-slate-455 uppercase font-black tracking-wider mb-2">Overall Returns (%)</div>
          <div className={`text-2xl font-black ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
            {summary.pnl_pct >= 0 ? "+" : ""}
            {summary.pnl_pct.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Form & Allocations */}
        <div className="space-y-8 lg:col-span-1">
          {/* Position Input Form */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-extrabold mb-4 flex items-center space-x-2">
              <Plus className="h-4 w-4 text-blue-500" />
              <span>{editing ? "Update Transaction Position" : "Log Buy Transaction"}</span>
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1.5">Asset Symbol</label>
                <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-2.5 rounded-lg font-bold">
                  {stocks.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1.5">Shares Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-2.5 rounded-lg font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1.5">Average Cost (Rs)</label>
                <input
                  type="number"
                  step="any"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="e.g. 1420.50"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] p-2.5 rounded-lg font-bold"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs active:scale-97 transition-all shadow-md">
                  {editing ? "Save Changes" : "Add Position"}
                </button>
                {editing && (
                  <button type="button" onClick={() => { setEditing(false); setShares(""); setBuyPrice(""); }} className="px-4 py-2.5 border border-slate-200 dark:border-[#1E2538] text-slate-400 hover:text-white font-bold rounded-lg text-xs">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Allocation Weights Pie Chart */}
          {holdings.length > 0 && (
            <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-extrabold mb-4 flex items-center space-x-2">
                <PieIcon className="h-4 w-4 text-[#00E5FF]" />
                <span>Portfolio Weighting</span>
              </h3>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `Rs. ${parseFloat(value as string).toLocaleString()}`} contentStyle={{ backgroundColor: "#0E121E", borderColor: "#1E2538", borderRadius: "8px", fontSize: "10px" }} />
                    <Legend wrapperStyle={{ fontSize: "9px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Holdings positions table list & Transaction logs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Holdings */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-extrabold mb-4">Invested Holdings Positions</h3>
            {holdings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs">
                No active positions logged. Enter transactions inside the buy portal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead>
                    <tr className="text-slate-455 uppercase text-[9px] tracking-wider border-b border-slate-100 dark:border-[#1E2538]/50 pb-2">
                      <th className="py-3">Stock</th>
                      <th className="py-3">Qty</th>
                      <th className="py-3">Buy Price</th>
                      <th className="py-3">Current Price</th>
                      <th className="py-3 text-right">Value</th>
                      <th className="py-3 text-right">Unrealized P&L</th>
                      <th className="py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E2538]/30">
                    {holdings.map((h) => {
                      const posProfit = h.pnl >= 0;
                      return (
                        <tr key={h.stock_symbol} className="hover:bg-slate-50 dark:hover:bg-[#0B0F19]/20 transition-colors">
                          <td className="py-4 font-bold text-slate-900 dark:text-white">{h.stock_symbol}</td>
                          <td className="py-4">{h.shares}</td>
                          <td className="py-4">Rs. {h.average_buy_price}</td>
                          <td className="py-4">Rs. {h.current_price}</td>
                          <td className="py-4 text-right font-bold">Rs. {h.market_value.toLocaleString()}</td>
                          <td className={`py-4 text-right font-black ${posProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                            {h.pnl >= 0 ? "+" : ""}
                            {h.pnl.toLocaleString()}<br />
                            <span className="text-[10px] font-medium">({h.pnl_pct >= 0 ? "+" : ""}{h.pnl_pct.toFixed(2)}%)</span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => handleEdit(h)} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(h.stock_symbol)} className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transaction History log */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-extrabold mb-4 flex items-center space-x-2">
              <History className="h-4 w-4 text-indigo-500" />
              <span>Activity & Transaction History</span>
            </h3>
            {transactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-y-auto max-h-72">
                <table className="w-full text-left text-xs font-semibold">
                  <thead>
                    <tr className="text-slate-455 uppercase text-[9px] tracking-wider border-b border-slate-100 dark:border-[#1E2538]/50 pb-2">
                      <th className="py-2">Date</th>
                      <th className="py-2">Stock</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E2538]/30 text-slate-500 font-medium">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#0B0F19]/25 py-2.5">
                        <td className="py-3 font-semibold">{t.timestamp.slice(0, 10)}</td>
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{t.stock_symbol}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            t.transaction_type === "BUY"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-red-500/10 text-red-500"
                          }`}>
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 font-semibold">{t.shares}</td>
                        <td className="py-3 text-right font-semibold">Rs. {t.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
