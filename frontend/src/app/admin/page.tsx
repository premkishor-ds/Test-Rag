"use client";

import { useState, useEffect } from "react";
import { 
  Lock, Cpu, Database, RefreshCw, FileText, CheckCircle2, AlertTriangle, LogOut, 
  Loader2, ArrowRight, Shield, Activity, User, Key, BarChart3, TrendingUp, Info, 
  Search, Sliders, Server, HardDrive, Network, Globe, Plus, Edit3, ChevronRight 
} from "lucide-react";

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

  // Dashboard Node Stats
  const [dbSize, setDbSize] = useState("1.4 MB");
  const [totalVectors, setTotalVectors] = useState("482 pts");
  const [activeCrawlers, setActiveCrawlers] = useState("Idle");

  // Panel state
  const [activeTab, setActiveTab] = useState<"actions" | "metrics" | "logs">("actions");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsSearch, setLogsSearch] = useState("");

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
        setAuthError(data.detail || "Access Denied: Invalid Security Signature.");
      }
    } catch (err) {
      setAuthError("Authentication failure: Gateway handshake failed.");
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
      console.error("Error fetching stocks:", err);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/audit-logs?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        
        // Mocking dynamically sized logs for aesthetic sizes
        setDbSize(`${(1.2 + (data.length * 0.005)).toFixed(2)} MB`);
        setTotalVectors(`${420 + (data.length * 4)} pts`);
      }
    } catch (err) {
      console.error("Error logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSymbol) {
      loadStockMetrics(selectedSymbol);
    }
  }, [selectedSymbol]);

  const loadStockMetrics = async (symbol: string) => {
    setLoadingMetrics(true);
    try {
      const resFin = await fetch(`${API_URL}/api/v1/financials?symbol=${symbol}`);
      let finData: any = {};
      if (resFin.ok) {
        const list = await resFin.json();
        const entry = list.find((m: any) => m.financial_year === 2025) || list[0];
        if (entry) finData = entry;
      }

      const resStock = await fetch(`${API_URL}/api/v1/stock/${symbol}`);
      let stockData: any = {};
      if (resStock.ok) {
        stockData = await resStock.json();
      }

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

        pe_ratio: stockData.valuation_metrics?.[0]?.pe_ratio !== undefined && stockData.valuation_metrics?.[0]?.pe_ratio !== null ? String(stockData.valuation_metrics?.[0]?.pe_ratio) : "",
        ev_ebitda: stockData.valuation_metrics?.[0]?.ev_ebitda !== undefined && stockData.valuation_metrics?.[0]?.ev_ebitda !== null ? String(stockData.valuation_metrics?.[0]?.ev_ebitda) : "",
        peg_ratio: stockData.valuation_metrics?.[0]?.peg_ratio !== undefined && stockData.valuation_metrics?.[0]?.peg_ratio !== null ? String(stockData.valuation_metrics?.[0]?.peg_ratio) : "",
        fifty_two_week_high: stockData.valuation_metrics?.[0]?.fifty_two_week_high !== undefined && stockData.valuation_metrics?.[0]?.fifty_two_week_high !== null ? String(stockData.valuation_metrics?.[0]?.fifty_two_week_high) : "",
        fifty_two_week_low: stockData.valuation_metrics?.[0]?.fifty_two_week_low !== undefined && stockData.valuation_metrics?.[0]?.fifty_two_week_low !== null ? String(stockData.valuation_metrics?.[0]?.fifty_two_week_low) : "",

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
        setStatusMessage({ text: `Overrides saved successfully for ${selectedSymbol}!`, type: "success" });
        loadStockMetrics(selectedSymbol);
        fetchLogs();
      } else {
        setStatusMessage({ text: data.detail || "Failed to commit metric overrides.", type: "error" });
      }
    } catch (err) {
      setStatusMessage({ text: "Handshake error with backend API endpoints.", type: "error" });
    } finally {
      setLoadingMetrics(false);
    }
  };

  const triggerSystemAction = async (actionType: string, endpoint: string) => {
    setActionLoading(actionType);
    setStatusMessage(null);
    if (actionType === "scrape") {
      setActiveCrawlers("Running");
    }
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
      setStatusMessage({ text: "Handshake failed during system action call.", type: "error" });
    } finally {
      setActionLoading(null);
      if (actionType === "scrape") {
        setTimeout(() => setActiveCrawlers("Idle"), 5000);
      }
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = logsSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.target_type.toLowerCase().includes(term) ||
      log.target_id.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term)
    );
  });

  const selectedStockObj = stocks.find(s => s.symbol === selectedSymbol);

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#121212]">
        {/* Flat IDE Style Tech Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#252525_1px,transparent_1px),linear-gradient(to_bottom,#252525_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40"></div>

        <div className="w-full max-w-[450px] mx-4 relative">
          <div className="w-full bg-[#1E1E1E] border border-[#2D2D2D] p-10 rounded-2xl shadow-2xl relative z-10">
            
            <div className="flex flex-col items-center mb-8">
              <div className="h-14 w-14 bg-[#2D2D2D] border border-[#3C3C3C] text-slate-300 flex items-center justify-center rounded-xl mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-widest text-center">EQUITY.AI SECURE</h2>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">
                SYSTEM AUTHENTICATION SIGNATURE
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 font-semibold text-slate-300">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                  <User className="h-3 w-3 text-slate-400" />
                  <span>Security Identifier</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-4 py-3 text-xs outline-none transition-colors"
                  placeholder="Enter Username"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                  <Key className="h-3 w-3 text-slate-400" />
                  <span>Security Credentials</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-4 py-3 text-xs outline-none transition-colors"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              {authError && (
                <div className="flex items-center space-x-2 text-red-400 text-xs mt-2 bg-red-950/20 p-3 rounded-lg border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-xs font-black tracking-widest uppercase flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Decrypt Console Session</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-[#2D2D2D] pt-6 flex items-start space-x-2.5">
              <Info className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-slate-400 leading-relaxed font-semibold uppercase tracking-wider">
                <span className="text-white font-bold">Gate Configuration (Local Sandbox):</span><br />
                ID: <code className="text-white bg-[#161616] px-1 rounded border border-[#2D2D2D]">admin</code> &nbsp;/&nbsp; Password: <code className="text-white bg-[#161616] px-1 rounded border border-[#2D2D2D]">admin123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-300 pb-12">
      {/* Title node with system indicators */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-[#1E1E1E] border border-[#2D2D2D] p-6 rounded-xl gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-500">
            <Activity className="h-4 w-4 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">Admin Control Module</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Equity.AI Operations Cockpit</h1>
          <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-wide">Purge local collections, download filings, and commit fundamental and technical overrides.</p>
        </div>

        {/* Node stats metrics */}
        <div className="flex flex-wrap items-center gap-6 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-t lg:border-t-0 lg:border-l border-[#2D2D2D] pt-4 lg:pt-0 lg:pl-6">
          <div className="space-y-1">
            <span className="text-slate-500">Node Status</span>
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Connected</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500">Database Size</span>
            <div className="text-white font-mono">{dbSize}</div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500">Vector Count</span>
            <div className="text-white font-mono">{totalVectors}</div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500">Background Crawl</span>
            <div className={`text-mono ${activeCrawlers === "Running" ? "text-yellow-400 animate-pulse" : "text-slate-400"}`}>
              {activeCrawlers}
            </div>
          </div>
        </div>
      </div>

      {/* Control message bar */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-xs font-bold uppercase tracking-wider ${
            statusMessage.type === "success"
              ? "bg-green-500/5 border-green-500/20 text-green-400"
              : statusMessage.type === "error"
              ? "bg-red-500/5 border-red-500/20 text-red-400"
              : "bg-blue-500/5 border-blue-500/20 text-blue-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
            ) : (
              <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-[10px] text-slate-500 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Controller & Session logout */}
      <div className="flex items-center justify-between border-b border-[#2D2D2D]">
        <div className="flex space-x-1">
          {[
            { id: "actions", label: "System Actions", icon: Server },
            { id: "metrics", label: "Metric Overrides", icon: BarChart3 },
            { id: "logs", label: "Audit Trail", icon: FileText },
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
                className={`flex items-center space-x-2 px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                  isActive
                    ? "border-blue-500 text-blue-500 bg-[#1E1E1E]/50"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleLogout}
          className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 flex items-center space-x-1.5 py-1 px-3 border border-red-500/20 rounded-md hover:bg-red-500/5 transition-all"
        >
          <LogOut className="h-3 w-3" />
          <span>Exit Cockpit</span>
        </button>
      </div>

      {/* TAB 1: System actions center */}
      {activeTab === "actions" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1E1E1E] border border-[#2D2D2D] p-6 rounded-xl flex flex-col justify-between h-[270px]">
            <div className="space-y-3">
              <div className="h-10 w-10 bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center rounded-lg">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base uppercase tracking-wider">Purge & Rebuild</h3>
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider bg-red-500/5 px-2 py-0.5 rounded border border-red-500/20">
                  Critical Impact
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Deletes all SQLite document databases, quarterly records, and collections in Qdrant. Re-reads and synchronizes listings config directly from `stocks.csv`.
              </p>
            </div>
            <button
              onClick={() => triggerSystemAction("rebuild", "admin/actions/rebuild-db")}
              disabled={actionLoading !== null}
              className="w-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all"
            >
              {actionLoading === "rebuild" ? (
                <div className="flex items-center justify-center space-x-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Purging databases...</span>
                </div>
              ) : (
                <span>Rebuild Database node</span>
              )}
            </button>
          </div>

          <div className="bg-[#1E1E1E] border border-[#2D2D2D] p-6 rounded-xl flex flex-col justify-between h-[270px]">
            <div className="space-y-3">
              <div className="h-10 w-10 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center rounded-lg">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base uppercase tracking-wider">Scrape News & RSS</h3>
                <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider bg-yellow-500/5 px-2 py-0.5 rounded border border-yellow-500/20">
                  Resource Heavy
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Triggers Google News, ET Markets, and Moneycontrol RSS parsers. Downloads, cleans, summarizes, and vectorizes top articles in a background worker thread.
              </p>
            </div>
            <button
              onClick={() => triggerSystemAction("scrape", "admin/actions/scrape-all")}
              disabled={actionLoading !== null}
              className="w-full bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-[#161616] border border-yellow-500/20 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all"
            >
              {actionLoading === "scrape" ? (
                <div className="flex items-center justify-center space-x-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Harvesting RSS...</span>
                </div>
              ) : (
                <span>Harvest articles</span>
              )}
            </button>
          </div>

          <div className="bg-[#1E1E1E] border border-[#2D2D2D] p-6 rounded-xl flex flex-col justify-between h-[270px]">
            <div className="space-y-3">
              <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base uppercase tracking-wider">Yahoo Finance Sync</h3>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/20">
                  Standard Check
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Connects directly to the live Yahoo Finance APIs to pull the latest stock prices, daily price charts, net capitalization values, and sector metrics.
              </p>
            </div>
            <button
              onClick={() => triggerSystemAction("sync", "stocks/sync")}
              disabled={actionLoading !== null}
              className="w-full bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all"
            >
              {actionLoading === "sync" ? (
                <div className="flex items-center justify-center space-x-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing tickers...</span>
                </div>
              ) : (
                <span>Sync yahoo finance</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Metrics Override Editor */}
      {activeTab === "metrics" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Stock selection meta panel */}
          <div className="lg:col-span-1 bg-[#1E1E1E] border border-[#2D2D2D] p-5 rounded-xl space-y-4 font-semibold">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Selected Target</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white font-bold rounded-lg px-3 py-2.5 text-xs outline-none transition-colors"
              >
                {stocks.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} ({s.name})
                  </option>
                ))}
              </select>
            </div>

            {selectedStockObj && (
              <div className="border-t border-[#2D2D2D] pt-4 space-y-3 text-[11px] uppercase font-bold tracking-wider text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sector</span>
                  <span className="text-white">{selectedStockObj.sector || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Industry</span>
                  <span className="text-white text-right max-w-[140px] truncate">{selectedStockObj.industry || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Market Cap</span>
                  <span className="text-white font-mono">
                    {selectedStockObj.market_cap ? `${(selectedStockObj.market_cap / 1000).toFixed(2)}B` : "N/A"}
                  </span>
                </div>
              </div>
            )}

            {/* Sub-panel Navigation Category selection */}
            <div className="border-t border-[#2D2D2D] pt-4 flex flex-col space-y-1">
              {[
                { id: "fundamental", label: "Fundamental Ratios", desc: "Balance sheets, growth metrics" },
                { id: "valuation", label: "Valuation Metrics", desc: "Pricing, P/E, multiples" },
                { id: "technical", label: "Technical Signals", desc: "RSI, MACD indicators" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setMetricsCategory(cat.id as any)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    metricsCategory === cat.id
                      ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                      : "hover:bg-[#161616] text-slate-400 border border-transparent"
                  }`}
                >
                  <div className="text-[11px] uppercase font-bold tracking-wider">{cat.label}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form grid values panel */}
          <div className="lg:col-span-3 bg-[#1E1E1E] border border-[#2D2D2D] rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-[#2D2D2D] flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                <Edit3 className="h-4 w-4 text-blue-500" />
                <span>Override parameters for {selectedSymbol}</span>
              </h2>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Fiscal Year</span>
                <input
                  type="number"
                  value={metricsForm.financial_year}
                  onChange={(e) => setMetricsForm({ ...metricsForm, financial_year: e.target.value })}
                  className="w-16 bg-[#161616] border border-[#2D2D2D] text-white font-mono rounded px-2 py-1 outline-none text-center"
                />
              </div>
            </div>

            <form onSubmit={handleMetricSubmit}>
              {loadingMetrics ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-2">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  <span className="text-xs uppercase tracking-widest font-bold text-slate-500">Querying DB node...</span>
                </div>
              ) : (
                <div className="p-6">
                  {/* Category 1: Fundamental ratios */}
                  {metricsCategory === "fundamental" && (
                    <div className="space-y-6">
                      <div className="border-b border-[#2D2D2D] pb-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Profitability & Sales</h4>
                        <p className="text-[9px] text-slate-500 uppercase mt-0.5">Edit income statement margins and capital efficiencies.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 font-semibold text-slate-300">
                        {[
                          { label: "Revenue (Cr)", name: "revenue", suffix: "₹ Cr" },
                          { label: "Revenue Growth", name: "revenue_growth", suffix: "% YoY" },
                          { label: "Net Profit (Cr)", name: "net_profit", suffix: "₹ Cr" },
                          { label: "Profit Growth", name: "profit_growth", suffix: "% YoY" },
                          { label: "ROCE", name: "roce", suffix: "%" },
                          { label: "ROE", name: "roe", suffix: "%" },
                          { label: "EBITDA (Cr)", name: "ebitda", suffix: "₹ Cr" },
                          { label: "OPM Margins", name: "opm_pct", suffix: "%" },
                          { label: "NPM Margins", name: "npm_pct", suffix: "%" },
                        ].map((f) => (
                          <div key={f.name} className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={metricsForm[f.name]}
                                onChange={(e) => setMetricsForm({ ...metricsForm, [f.name]: e.target.value })}
                                className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-3 py-2 text-xs outline-none transition-colors pr-16"
                                placeholder="N/A"
                              />
                              <span className="absolute right-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{f.suffix}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-b border-[#2D2D2D] pb-2 pt-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Leverage, Capital & Assets</h4>
                        <p className="text-[9px] text-slate-500 uppercase mt-0.5">Edit debt structures, balance sheet liquidity, and capital expenditures.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 font-semibold text-slate-300">
                        {[
                          { label: "Debt to Equity", name: "debt_to_equity", suffix: "x" },
                          { label: "Operating Cash Flow", name: "cash_flow_from_operations", suffix: "₹ Cr" },
                          { label: "Free Cash Flow", name: "free_cash_flow", suffix: "₹ Cr" },
                          { label: "CapEx Size", name: "capex", suffix: "₹ Cr" },
                          { label: "Interest Coverage", name: "interest_coverage", suffix: "x" },
                          { label: "Debtor Days", name: "debtor_days", suffix: "days" },
                          { label: "Inventory Turnover", name: "inventory_turnover", suffix: "x" },
                          { label: "Order Book Size", name: "order_book", suffix: "₹ Cr" },
                        ].map((f) => (
                          <div key={f.name} className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={metricsForm[f.name]}
                                onChange={(e) => setMetricsForm({ ...metricsForm, [f.name]: e.target.value })}
                                className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-3 py-2 text-xs outline-none transition-colors pr-16"
                                placeholder="N/A"
                              />
                              <span className="absolute right-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{f.suffix}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-b border-[#2D2D2D] pb-2 pt-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Shareholding Pattern</h4>
                        <p className="text-[9px] text-slate-500 uppercase mt-0.5">Adjust share distribution patterns among major stakeholders.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 font-semibold text-slate-300">
                        {[
                          { label: "Promoter Holding", name: "promoter_holding", suffix: "%" },
                          { label: "FII Holding", name: "fii_holding", suffix: "%" },
                          { label: "DII Holding", name: "dii_holding", suffix: "%" },
                          { label: "Promoter Pledged", name: "promoter_pledged_pct", suffix: "%" },
                        ].map((f) => (
                          <div key={f.name} className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={metricsForm[f.name]}
                                onChange={(e) => setMetricsForm({ ...metricsForm, [f.name]: e.target.value })}
                                className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-3 py-2 text-xs outline-none transition-colors pr-16"
                                placeholder="N/A"
                              />
                              <span className="absolute right-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{f.suffix}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 2: Valuation multiples */}
                  {metricsCategory === "valuation" && (
                    <div className="space-y-6">
                      <div className="border-b border-[#2D2D2D] pb-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pricing Multiples & 52W Limits</h4>
                        <p className="text-[9px] text-slate-500 uppercase mt-0.5">Edit comparative multipliers and stock price channels.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 font-semibold text-slate-300">
                        {[
                          { label: "Price-to-Earnings Ratio (P/E)", name: "pe_ratio", suffix: "x" },
                          { label: "EV/EBITDA Multiple", name: "ev_ebitda", suffix: "x" },
                          { label: "PEG Ratio", name: "peg_ratio", suffix: "x" },
                          { label: "52-Week High limit", name: "fifty_two_week_high", suffix: "₹" },
                          { label: "52-Week Low limit", name: "fifty_two_week_low", suffix: "₹" },
                        ].map((f) => (
                          <div key={f.name} className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={metricsForm[f.name]}
                                onChange={(e) => setMetricsForm({ ...metricsForm, [f.name]: e.target.value })}
                                className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-3 py-2 text-xs outline-none transition-colors pr-16"
                                placeholder="N/A"
                              />
                              <span className="absolute right-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{f.suffix}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 3: Technical indicators */}
                  {metricsCategory === "technical" && (
                    <div className="space-y-6">
                      <div className="border-b border-[#2D2D2D] pb-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Trend & Momentum Overrides</h4>
                        <p className="text-[9px] text-slate-500 uppercase mt-0.5">Adjust chart momentum limits, moving averages, and volume flags.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 font-semibold text-slate-300">
                        {[
                          { label: "RSI Index (14d)", name: "rsi", suffix: "pts" },
                          { label: "MACD Indicator line", name: "macd", suffix: "pts" },
                          { label: "SMA 50 Threshold", name: "sma_50", suffix: "₹" },
                          { label: "SMA 200 Threshold", name: "sma_200", suffix: "₹" },
                          { label: "Relative Strength (RS)", name: "relative_strength", suffix: "ratio" },
                          { label: "EMA 20 Threshold", name: "ema_20", suffix: "₹" },
                          { label: "EMA 50 Threshold", name: "ema_50", suffix: "₹" },
                          { label: "EMA 200 Threshold", name: "ema_200", suffix: "₹" },
                          { label: "Volatility Beta Coefficient", name: "beta", suffix: "β" },
                          { label: "20-Day Average Volume", name: "avg_volume_20d", suffix: "shares" },
                        ].map((f) => (
                          <div key={f.name} className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={metricsForm[f.name]}
                                onChange={(e) => setMetricsForm({ ...metricsForm, [f.name]: e.target.value })}
                                className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-3 py-2 text-xs outline-none transition-colors pr-16"
                                placeholder="N/A"
                              />
                              <span className="absolute right-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{f.suffix}</span>
                            </div>
                          </div>
                        ))}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume Breakout Flag</label>
                          <select
                            value={metricsForm.volume_breakout}
                            onChange={(e) => setMetricsForm({ ...metricsForm, volume_breakout: e.target.value })}
                            className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-3 py-2 text-xs outline-none transition-colors font-bold"
                          >
                            <option value="">N/A (Unspecified)</option>
                            <option value="true">True (Triggered)</option>
                            <option value="false">False (Suppressed)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Trend Strength Class</label>
                          <select
                            value={metricsForm.trend_strength}
                            onChange={(e) => setMetricsForm({ ...metricsForm, trend_strength: e.target.value })}
                            className="w-full bg-[#161616] border border-[#2D2D2D] focus:border-blue-500 text-white rounded-lg px-3 py-2 text-xs outline-none transition-colors font-bold"
                          >
                            <option value="">N/A (Unspecified)</option>
                            <option value="Bullish">Bullish (Strong Buy/Upward)</option>
                            <option value="Bearish">Bearish (Sell/Downward)</option>
                            <option value="Neutral">Neutral (Flat Consolidation)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="px-6 py-4 bg-[#161616] border-t border-[#2D2D2D] flex justify-end">
                <button
                  type="submit"
                  disabled={loadingMetrics}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {loadingMetrics ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving parameters...</span>
                    </>
                  ) : (
                    <span>Commit metric overrides</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: System Audit Trail logs */}
      {activeTab === "logs" && (
        <div className="bg-[#1E1E1E] border border-[#2D2D2D] rounded-xl overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-[#2D2D2D] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span>Audit Trail (Transaction Stream)</span>
            </h2>
            <div className="flex items-center space-x-3">
              {/* Log Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  placeholder="Filter logs..."
                  className="bg-[#161616] border border-[#2D2D2D] text-white rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-semibold outline-none focus:border-blue-500 w-44"
                />
              </div>

              <button
                onClick={fetchLogs}
                disabled={logsLoading}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin text-blue-500" : ""}`} />
                <span>Sync Node logs</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] font-semibold">
              <thead>
                <tr className="bg-[#161616] text-slate-400 uppercase text-[9px] tracking-widest border-b border-[#2D2D2D]">
                  <th className="px-6 py-3">Timestamp (UTC)</th>
                  <th className="px-6 py-3">Event Action</th>
                  <th className="px-6 py-3">Target Layer</th>
                  <th className="px-6 py-3">Resource Target</th>
                  <th className="px-6 py-4">Detailed Audit Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2D2D] text-slate-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      {logsLoading ? "Reading node activity logs..." : "No operational event signatures matching query."}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#252525]/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                            log.action === "REBUILD_DATABASE"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : log.action === "TRIGGER_SCRAPER"
                              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                              : log.action === "UPDATE_METRICS"
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono">
                        {log.target_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-blue-400">
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
