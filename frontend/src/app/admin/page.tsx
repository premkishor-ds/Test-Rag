"use client";

import { useState, useEffect } from "react";
import { Lock, Cpu, Database, RefreshCw, FileText, CheckCircle2, AlertTriangle, LogOut, Loader2, ArrowRight, Shield, Activity, User, Key, BarChart3, TrendingUp, Info } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stock {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
}

interface AuditLog {
  id: number;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  timestamp: string;
}

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Panel state
  const [activeTab, setActiveTab] = useState<"actions" | "metrics" | "logs">("actions");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Metric Override form states
  const [metricsCategory, setMetricsCategory] = useState<"fundamental" | "valuation" | "technical">("fundamental");
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Dynamic fields
  const [metricsForm, setMetricsForm] = useState<Record<string, string>>({
    // Financials
    financial_year: "2025",
    revenue: "",
    revenue_growth: "",
    net_profit: "",
    profit_growth: "",
    roce: "",
    roe: "",
    debt_to_equity: "",
    cash_flow_from_operations: "",
    promoter_holding: "",
    fii_holding: "",
    dii_holding: "",
    order_book: "",
    capex: "",
    free_cash_flow: "",
    ebitda: "",
    opm_pct: "",
    npm_pct: "",
    interest_coverage: "",
    debtor_days: "",
    inventory_turnover: "",
    promoter_pledged_pct: "",
    // Valuations
    pe_ratio: "",
    ev_ebitda: "",
    peg_ratio: "",
    fifty_two_week_high: "",
    fifty_two_week_low: "",
    // Technicals
    rsi: "",
    macd: "",
    sma_50: "",
    sma_200: "",
    volume_breakout: "",
    relative_strength: "",
    trend_strength: "",
    ema_20: "",
    ema_50: "",
    ema_200: "",
    beta: "",
    avg_volume_20d: "",
  });

  // Check existing token
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token === "admin-mock-token") {
      setIsLoggedIn(true);
      fetchStocks();
      fetchLogs();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("admin_token", data.token);
        setIsLoggedIn(true);
        fetchStocks();
        fetchLogs();
      } else {
        setAuthError(data.detail || "Authentication failed. Incorrect admin credentials.");
      }
    } catch (err) {
      setAuthError("Failed to establish server connection. Verify backend state.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
  };

  const fetchStocks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/stocks`);
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
        if (data.length > 0) {
          setSelectedSymbol(data[0].symbol);
        }
      }
    } catch (err) {
      console.error("Error fetching stocks list:", err);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/audit-logs?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch metrics when selected stock changes
  useEffect(() => {
    if (selectedSymbol) {
      loadStockMetrics(selectedSymbol);
    }
  }, [selectedSymbol]);

  const loadStockMetrics = async (symbol: string) => {
    setLoadingMetrics(true);
    try {
      // 1. Fetch fundamentals (financials)
      const resFin = await fetch(`${API_URL}/api/v1/financials?symbol=${symbol}`);
      let finData: any = {};
      if (resFin.ok) {
        const list = await resFin.json();
        const entry = list.find((m: any) => m.financial_year === 2025) || list[0];
        if (entry) finData = entry;
      }

      // 2. Fetch stock general info which contains valuation/technicals details
      const resStock = await fetch(`${API_URL}/api/v1/stock/${symbol}`);
      let stockData: any = {};
      if (resStock.ok) {
        stockData = await resStock.json();
      }

      // Populate metrics form state
      setMetricsForm({
        financial_year: "2025",
        revenue: finData.revenue !== undefined && finData.revenue !== null ? String(finData.revenue) : "",
        revenue_growth: finData.revenue_growth !== undefined && finData.revenue_growth !== null ? String(finData.revenue_growth) : "",
        net_profit: finData.net_profit !== undefined && finData.net_profit !== null ? String(finData.net_profit) : "",
        profit_growth: finData.profit_growth !== undefined && finData.profit_growth !== null ? String(finData.profit_growth) : "",
        roce: finData.roce !== undefined && finData.roce !== null ? String(finData.roce) : "",
        roe: finData.roe !== undefined && finData.roe !== null ? String(finData.roe) : "",
        debt_to_equity: finData.debt_to_equity !== undefined && finData.debt_to_equity !== null ? String(finData.debt_to_equity) : "",
        cash_flow_from_operations: finData.cash_flow_from_operations !== undefined && finData.cash_flow_from_operations !== null ? String(finData.cash_flow_from_operations) : "",
        promoter_holding: finData.promoter_holding !== undefined && finData.promoter_holding !== null ? String(finData.promoter_holding) : "",
        fii_holding: finData.fii_holding !== undefined && finData.fii_holding !== null ? String(finData.fii_holding) : "",
        dii_holding: finData.dii_holding !== undefined && finData.dii_holding !== null ? String(finData.dii_holding) : "",
        order_book: finData.order_book !== undefined && finData.order_book !== null ? String(finData.order_book) : "",
        capex: finData.capex !== undefined && finData.capex !== null ? String(finData.capex) : "",
        free_cash_flow: finData.free_cash_flow !== undefined && finData.free_cash_flow !== null ? String(finData.free_cash_flow) : "",
        ebitda: finData.ebitda !== undefined && finData.ebitda !== null ? String(finData.ebitda) : "",
        opm_pct: finData.opm_pct !== undefined && finData.opm_pct !== null ? String(finData.opm_pct) : "",
        npm_pct: finData.npm_pct !== undefined && finData.npm_pct !== null ? String(finData.npm_pct) : "",
        interest_coverage: finData.interest_coverage !== undefined && finData.interest_coverage !== null ? String(finData.interest_coverage) : "",
        debtor_days: finData.debtor_days !== undefined && finData.debtor_days !== null ? String(finData.debtor_days) : "",
        inventory_turnover: finData.inventory_turnover !== undefined && finData.inventory_turnover !== null ? String(finData.inventory_turnover) : "",
        promoter_pledged_pct: finData.promoter_pledged_pct !== undefined && finData.promoter_pledged_pct !== null ? String(finData.promoter_pledged_pct) : "",

        // Valuations
        pe_ratio: stockData.valuation_metrics?.[0]?.pe_ratio !== undefined && stockData.valuation_metrics?.[0]?.pe_ratio !== null ? String(stockData.valuation_metrics?.[0]?.pe_ratio) : "",
        ev_ebitda: stockData.valuation_metrics?.[0]?.ev_ebitda !== undefined && stockData.valuation_metrics?.[0]?.ev_ebitda !== null ? String(stockData.valuation_metrics?.[0]?.ev_ebitda) : "",
        peg_ratio: stockData.valuation_metrics?.[0]?.peg_ratio !== undefined && stockData.valuation_metrics?.[0]?.peg_ratio !== null ? String(stockData.valuation_metrics?.[0]?.peg_ratio) : "",
        fifty_two_week_high: stockData.valuation_metrics?.[0]?.fifty_two_week_high !== undefined && stockData.valuation_metrics?.[0]?.fifty_two_week_high !== null ? String(stockData.valuation_metrics?.[0]?.fifty_two_week_high) : "",
        fifty_two_week_low: stockData.valuation_metrics?.[0]?.fifty_two_week_low !== undefined && stockData.valuation_metrics?.[0]?.fifty_two_week_low !== null ? String(stockData.valuation_metrics?.[0]?.fifty_two_week_low) : "",

        // Technicals
        rsi: stockData.technical_indicators?.[0]?.rsi !== undefined && stockData.technical_indicators?.[0]?.rsi !== null ? String(stockData.technical_indicators?.[0]?.rsi) : "",
        macd: stockData.technical_indicators?.[0]?.macd !== undefined && stockData.technical_indicators?.[0]?.macd !== null ? String(stockData.technical_indicators?.[0]?.macd) : "",
        sma_50: stockData.technical_indicators?.[0]?.sma_50 !== undefined && stockData.technical_indicators?.[0]?.sma_50 !== null ? String(stockData.technical_indicators?.[0]?.sma_50) : "",
        sma_200: stockData.technical_indicators?.[0]?.sma_200 !== undefined && stockData.technical_indicators?.[0]?.sma_200 !== null ? String(stockData.technical_indicators?.[0]?.sma_200) : "",
        volume_breakout: stockData.technical_indicators?.[0]?.volume_breakout !== undefined && stockData.technical_indicators?.[0]?.volume_breakout !== null ? String(stockData.technical_indicators?.[0]?.volume_breakout) : "",
        relative_strength: stockData.technical_indicators?.[0]?.relative_strength !== undefined && stockData.technical_indicators?.[0]?.relative_strength !== null ? String(stockData.technical_indicators?.[0]?.relative_strength) : "",
        trend_strength: stockData.technical_indicators?.[0]?.trend_strength !== undefined && stockData.technical_indicators?.[0]?.trend_strength !== null ? String(stockData.technical_indicators?.[0]?.trend_strength) : "",
        ema_20: stockData.technical_indicators?.[0]?.ema_20 !== undefined && stockData.technical_indicators?.[0]?.ema_20 !== null ? String(stockData.technical_indicators?.[0]?.ema_20) : "",
        ema_50: stockData.technical_indicators?.[0]?.ema_50 !== undefined && stockData.technical_indicators?.[0]?.ema_50 !== null ? String(stockData.technical_indicators?.[0]?.ema_50) : "",
        ema_200: stockData.technical_indicators?.[0]?.ema_200 !== undefined && stockData.technical_indicators?.[0]?.ema_200 !== null ? String(stockData.technical_indicators?.[0]?.ema_200) : "",
        beta: stockData.technical_indicators?.[0]?.beta !== undefined && stockData.technical_indicators?.[0]?.beta !== null ? String(stockData.technical_indicators?.[0]?.beta) : "",
        avg_volume_20d: stockData.technical_indicators?.[0]?.avg_volume_20d !== undefined && stockData.technical_indicators?.[0]?.avg_volume_20d !== null ? String(stockData.technical_indicators?.[0]?.avg_volume_20d) : "",
      });
    } catch (err) {
      console.error("Error loading metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleMetricSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoadingMetrics(true);

    try {
      const payload: Record<string, any> = {
        financial_year: parseInt(metricsForm.financial_year) || 2025,
      };

      Object.entries(metricsForm).forEach(([key, val]) => {
        if (key === "financial_year") return;
        if (val !== "") {
          if (key === "volume_breakout") {
            payload[key] = val === "true";
          } else if (key === "trend_strength") {
            payload[key] = val;
          } else {
            payload[key] = parseFloat(val);
          }
        }
      });

      const res = await fetch(`${API_URL}/api/v1/admin/stock/${selectedSymbol}/metrics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `Parameters committed successfully for ${selectedSymbol}.`, type: "success" });
        loadStockMetrics(selectedSymbol);
        fetchLogs();
      } else {
        setStatusMessage({ text: data.detail || "Failed to commit parameter modifications.", type: "error" });
      }
    } catch (err) {
      setStatusMessage({ text: "Failed to connect to backend api endpoints.", type: "error" });
    } finally {
      setLoadingMetrics(false);
    }
  };

  const triggerSystemAction = async (actionType: string, endpoint: string) => {
    setActionLoading(actionType);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: data.message || "System action launched successfully.", type: "success" });
        fetchLogs();
      } else {
        setStatusMessage({ text: data.detail || "Action failed execution.", type: "error" });
      }
    } catch (err) {
      setStatusMessage({ text: "Action connection pipeline failed.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[85vh] relative overflow-hidden px-4">
        {/* Abstract glowing backgrounds for enterprise tech aesthetic */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none select-none"></div>
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[90px] pointer-events-none select-none"></div>

        <div className="w-full max-w-[480px] backdrop-blur-xl bg-[#0B0F19]/80 border border-[#1E294B] p-10 rounded-3xl shadow-2xl relative z-10">
          {/* Decorative neon top bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent rounded-t-3xl shadow-[0_0_15px_#00E5FF]"></div>

          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center rounded-2xl mb-4 border border-[#00E5FF]/20 shadow-[0_0_20px_rgba(0,229,255,0.15)] animate-pulse">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-widest text-center">Equity.AI Security</h2>
            <p className="text-[10px] text-[#00E5FF] uppercase font-bold tracking-widest mt-1.5 px-3 py-1 bg-[#00E5FF]/5 border border-[#00E5FF]/10 rounded-full">
              Enterprise Control Gateway
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 font-semibold text-slate-300">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center space-x-1">
                <User className="h-3 w-3 text-[#00E5FF]" />
                <span>Security Username</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] focus:shadow-[0_0_10px_rgba(0,229,255,0.1)] text-white rounded-xl px-4 py-3.5 text-xs outline-none transition-all duration-300"
                  placeholder="Enter Username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center space-x-1">
                <Key className="h-3 w-3 text-[#00E5FF]" />
                <span>Security Password</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] focus:shadow-[0_0_10px_rgba(0,229,255,0.1)] text-white rounded-xl px-4 py-3.5 text-xs outline-none transition-all duration-300"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center space-x-2.5 text-red-400 text-xs mt-3 bg-red-950/20 p-3.5 rounded-xl border border-red-500/20">
                <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 text-red-500" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-3 bg-gradient-to-r from-[#00E5FF] to-[#00A8CC] hover:from-[#00FFFF] hover:to-[#00B8E6] text-[#090D1A] py-3.5 rounded-xl text-xs font-black tracking-widest uppercase flex items-center justify-center space-x-2 transition-all duration-300 shadow-[0_4px_20px_rgba(0,229,255,0.25)] hover:shadow-[0_4px_25px_rgba(0,229,255,0.35)] active:scale-[0.98] disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#090D1A]" />
                  <span>Verifying Node Authority...</span>
                </>
              ) : (
                <>
                  <span>Initialize Console Session</span>
                  <ArrowRight className="h-4 w-4 text-[#090D1A]" />
                </>
              )}
            </button>
          </form>

          {/* Secure Hint banner */}
          <div className="mt-8 border-t border-[#1E294B] pt-5 flex items-start space-x-2">
            <Info className="h-4.5 w-4.5 text-[#00E5FF] mt-0.5 flex-shrink-0" />
            <div className="text-[10px] text-slate-400 leading-normal font-semibold uppercase tracking-wider">
              <span className="text-[#00E5FF] font-black">Gate Configuration (Local Sandbox):</span><br />
              Username: <code className="text-white bg-[#070A13] px-1 rounded border border-[#1E294B]">admin</code> / Password: <code className="text-white bg-[#070A13] px-1 rounded border border-[#1E294B]">admin123</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative z-10 pb-16">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-[#0B0F19]/50 border border-[#1E294B] p-6 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2 text-[#00E5FF]">
            <Activity className="h-4 w-4 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-[#00E5FF]">Operations Center Node</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1 tracking-tight">Enterprise Admin Control</h1>
          <p className="text-slate-400 text-xs mt-1 uppercase font-bold tracking-wider">Deploy data rebuild routines, override model columns, and review transaction streams.</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 px-5 py-3 rounded-xl text-xs font-black tracking-widest uppercase flex items-center space-x-2 transition-all duration-300"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit Session</span>
        </button>
      </div>

      {/* Message banners */}
      {statusMessage && (
        <div
          className={`flex items-center space-x-3 p-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
            statusMessage.type === "success"
              ? "bg-green-500/5 border-green-500/20 text-green-400"
              : statusMessage.type === "error"
              ? "bg-red-500/5 border-red-500/20 text-red-400"
              : "bg-blue-500/5 border-blue-500/20 text-blue-400"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="flex border-b border-[#1E294B] space-x-2">
        {[
          { id: "actions", label: "Control Center", icon: Cpu },
          { id: "metrics", label: "Parameter Override", icon: BarChart3 },
          { id: "logs", label: "System Audit Logs", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === "logs") fetchLogs();
              }}
              className={`flex items-center space-x-2.5 px-6 py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/10"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: System Actions */}
      {activeTab === "actions" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0B0F19]/50 border border-[#1E294B] p-6 rounded-2xl shadow-xl flex flex-col justify-between h-64 transition-all hover:border-[#1E294B]/80 hover:bg-[#0B0F19]/75">
            <div>
              <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center rounded-xl mb-4">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-base uppercase tracking-wider">Purge & Rebuild Node</h3>
              <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                Clears all SQLite report matrices and vector collection indexes in Qdrant. Re-establishes connections and syncs basic profiles using target files.
              </p>
            </div>
            <button
              onClick={() => triggerSystemAction("rebuild", "admin/actions/rebuild-db")}
              disabled={actionLoading !== null}
              className="w-full bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center space-x-2"
            >
              {actionLoading === "rebuild" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Rebuilding Stack...</span>
                </>
              ) : (
                <span>Rebuild Database</span>
              )}
            </button>
          </div>

          <div className="bg-[#0B0F19]/50 border border-[#1E294B] p-6 rounded-2xl shadow-xl flex flex-col justify-between h-64 transition-all hover:border-[#1E294B]/80 hover:bg-[#0B0F19]/75">
            <div>
              <div className="h-12 w-12 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center rounded-xl mb-4">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-base uppercase tracking-wider">Execute Feed Crawler</h3>
              <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                Manually initiates standard pipelines for Moneycontrol, yfinance news, and RSS feeds. Ingests and vectorizes top articles in the background.
              </p>
            </div>
            <button
              onClick={() => triggerSystemAction("scrape", "admin/actions/scrape-all")}
              disabled={actionLoading !== null}
              className="w-full bg-yellow-500/15 hover:bg-yellow-500 text-yellow-400 hover:text-[#090D1A] border border-yellow-500/30 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center space-x-2"
            >
              {actionLoading === "scrape" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Crawling feeds...</span>
                </>
              ) : (
                <span>Force RSS Crawler</span>
              )}
            </button>
          </div>

          <div className="bg-[#0B0F19]/50 border border-[#1E294B] p-6 rounded-2xl shadow-xl flex flex-col justify-between h-64 transition-all hover:border-[#1E294B]/80 hover:bg-[#0B0F19]/75">
            <div>
              <div className="h-12 w-12 bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] flex items-center justify-center rounded-xl mb-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-base uppercase tracking-wider">Sync Market Data</h3>
              <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                Connects directly to yfinance API. Fetches real-time valuations, technical indices, and historical daily closures for the local listings.
              </p>
            </div>
            <button
              onClick={() => triggerSystemAction("sync", "stocks/sync")}
              disabled={actionLoading !== null}
              className="w-full bg-[#00E5FF]/15 hover:bg-[#00E5FF] text-[#00E5FF] hover:text-[#090D1A] border border-[#00E5FF]/30 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center space-x-2"
            >
              {actionLoading === "sync" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Establishing Stream...</span>
                </>
              ) : (
                <span>Sync Yahoo Finance</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Parameter Override */}
      {activeTab === "metrics" && (
        <div className="bg-[#0B0F19]/50 border border-[#1E294B] p-8 rounded-2xl shadow-xl backdrop-blur-md">
          <form onSubmit={handleMetricSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-[#1E294B] pb-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Target Stock</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] text-white font-bold rounded-xl px-4 py-3 text-xs outline-none transition-colors"
                >
                  {stocks.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Parameter Category</label>
                <div className="flex bg-[#070A13] border border-[#1E294B] rounded-xl p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setMetricsCategory("fundamental")}
                    className={`flex-1 py-2 rounded-lg font-black uppercase tracking-wider transition-all duration-200 ${
                      metricsCategory === "fundamental"
                        ? "bg-[#00E5FF] text-[#090D1A]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Fundamental
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricsCategory("valuation")}
                    className={`flex-1 py-2 rounded-lg font-black uppercase tracking-wider transition-all duration-200 ${
                      metricsCategory === "valuation"
                        ? "bg-[#00E5FF] text-[#090D1A]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Valuation
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricsCategory("technical")}
                    className={`flex-1 py-2 rounded-lg font-black uppercase tracking-wider transition-all duration-200 ${
                      metricsCategory === "technical"
                        ? "bg-[#00E5FF] text-[#090D1A]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Technical
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Year</label>
                <input
                  type="number"
                  value={metricsForm.financial_year}
                  onChange={(e) => setMetricsForm({ ...metricsForm, financial_year: e.target.value })}
                  className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] text-white font-bold rounded-xl px-4 py-3 text-xs outline-none transition-colors"
                />
              </div>
            </div>

            {loadingMetrics ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-10 w-10 text-[#00E5FF] animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 font-semibold text-slate-300">
                {metricsCategory === "fundamental" && (
                  <>
                    {[
                      { label: "Revenue (Cr)", name: "revenue" },
                      { label: "Revenue Growth (YoY %)", name: "revenue_growth" },
                      { label: "Net Profit (Cr)", name: "net_profit" },
                      { label: "Profit Growth (YoY %)", name: "profit_growth" },
                      { label: "ROCE (%)", name: "roce" },
                      { label: "ROE (%)", name: "roe" },
                      { label: "Debt/Equity (x)", name: "debt_to_equity" },
                      { label: "Operating Cash Flow (Cr)", name: "cash_flow_from_operations" },
                      { label: "Promoter Holding (%)", name: "promoter_holding" },
                      { label: "FII Holding (%)", name: "fii_holding" },
                      { label: "DII Holding (%)", name: "dii_holding" },
                      { label: "Order Book (Cr)", name: "order_book" },
                      { label: "CapEx (Cr)", name: "capex" },
                      { label: "Free Cash Flow (Cr)", name: "free_cash_flow" },
                      { label: "EBITDA (Cr)", name: "ebitda" },
                      { label: "OPM (%)", name: "opm_pct" },
                      { label: "NPM (%)", name: "npm_pct" },
                      { label: "Interest Coverage (x)", name: "interest_coverage" },
                      { label: "Debtor Days (d)", name: "debtor_days" },
                      { label: "Inventory Turnover (x)", name: "inventory_turnover" },
                      { label: "Pledged Promoter (%)", name: "promoter_pledged_pct" },
                    ].map((field) => (
                      <div key={field.name} className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">{field.label}</label>
                        <input
                          type="text"
                          value={metricsForm[field.name]}
                          onChange={(e) => setMetricsForm({ ...metricsForm, [field.name]: e.target.value })}
                          className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] text-white rounded-xl px-4 py-2.5 text-xs outline-none transition-colors"
                          placeholder="Unspecified"
                        />
                      </div>
                    ))}
                  </>
                )}

                {metricsCategory === "valuation" && (
                  <>
                    {[
                      { label: "P/E Ratio", name: "pe_ratio" },
                      { label: "EV/EBITDA", name: "ev_ebitda" },
                      { label: "PEG Ratio", name: "peg_ratio" },
                      { label: "52-Week High (₹)", name: "fifty_two_week_high" },
                      { label: "52-Week Low (₹)", name: "fifty_two_week_low" },
                    ].map((field) => (
                      <div key={field.name} className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">{field.label}</label>
                        <input
                          type="text"
                          value={metricsForm[field.name]}
                          onChange={(e) => setMetricsForm({ ...metricsForm, [field.name]: e.target.value })}
                          className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] text-white rounded-xl px-4 py-2.5 text-xs outline-none transition-colors"
                          placeholder="Unspecified"
                        />
                      </div>
                    ))}
                  </>
                )}

                {metricsCategory === "technical" && (
                  <>
                    {[
                      { label: "RSI (14)", name: "rsi" },
                      { label: "MACD Index", name: "macd" },
                      { label: "SMA 50 (₹)", name: "sma_50" },
                      { label: "SMA 200 (₹)", name: "sma_200" },
                      { label: "Relative Strength Index", name: "relative_strength" },
                      { label: "EMA 20 (₹)", name: "ema_20" },
                      { label: "EMA 50 (₹)", name: "ema_50" },
                      { label: "EMA 200 (₹)", name: "ema_200" },
                      { label: "Beta Index", name: "beta" },
                      { label: "20d Avg Volume", name: "avg_volume_20d" },
                    ].map((field) => (
                      <div key={field.name} className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">{field.label}</label>
                        <input
                          type="text"
                          value={metricsForm[field.name]}
                          onChange={(e) => setMetricsForm({ ...metricsForm, [field.name]: e.target.value })}
                          className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] text-white rounded-xl px-4 py-2.5 text-xs outline-none transition-colors"
                          placeholder="Unspecified"
                        />
                      </div>
                    ))}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Volume Breakout</label>
                      <select
                        value={metricsForm.volume_breakout}
                        onChange={(e) => setMetricsForm({ ...metricsForm, volume_breakout: e.target.value })}
                        className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] text-white rounded-xl px-4 py-2.5 text-xs outline-none transition-colors font-bold"
                      >
                        <option value="">Unspecified</option>
                        <option value="true">True (Active)</option>
                        <option value="false">False (Inactive)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Trend Strength</label>
                      <select
                        value={metricsForm.trend_strength}
                        onChange={(e) => setMetricsForm({ ...metricsForm, trend_strength: e.target.value })}
                        className="w-full bg-[#070A13] border border-[#1E294B] focus:border-[#00E5FF] text-white rounded-xl px-4 py-2.5 text-xs outline-none transition-colors font-bold"
                      >
                        <option value="">Unspecified</option>
                        <option value="Bullish">Bullish</option>
                        <option value="Bearish">Bearish</option>
                        <option value="Neutral">Neutral</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-[#1E294B]">
              <button
                type="submit"
                disabled={loadingMetrics}
                className="bg-gradient-to-r from-[#00E5FF] to-[#00A8CC] hover:from-[#00FFFF] hover:to-[#00B8E6] text-[#090D1A] px-8 py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(0,229,255,0.15)] disabled:opacity-50"
              >
                {loadingMetrics ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#090D1A]" />
                    <span>Committing overrides...</span>
                  </>
                ) : (
                  <span>Commit Node Overwrites</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Audit trail logs */}
      {activeTab === "logs" && (
        <div className="bg-[#0B0F19]/50 border border-[#1E294B] rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#1E294B]">
            <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center space-x-2">
              <FileText className="h-4.5 w-4.5 text-[#00E5FF]" />
              <span>Audit Trail Logs (Node History)</span>
            </h2>
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#00E5FF] flex items-center space-x-1.5 transition-all duration-300 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${logsLoading ? "animate-spin text-[#00E5FF]" : ""}`} />
              <span>Refresh Trail</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="bg-[#070A13]/55 text-slate-400 uppercase text-[10px] tracking-widest border-b border-[#1E294B]">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Target Class</th>
                  <th className="px-6 py-4">Node Target</th>
                  <th className="px-6 py-4">Operational Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E294B] text-slate-300">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      {logsLoading ? "Reading node activity logs..." : "No administrative actions found."}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#151D36]/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                            log.action === "REBUILD_DATABASE"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : log.action === "TRIGGER_SCRAPER"
                              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                              : log.action === "UPDATE_METRICS"
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : "bg-[#00E5FF]/10 border-[#00E5FF]/20 text-[#00E5FF]"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono">
                        {log.target_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-[#00E5FF]">
                        {log.target_id}
                      </td>
                      <td className="px-6 py-4 leading-normal font-mono max-w-sm overflow-hidden text-ellipsis whitespace-nowrap" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
