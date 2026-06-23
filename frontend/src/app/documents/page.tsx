"use client";

import { useEffect, useState, useRef } from "react";
import { FileText, Upload, RefreshCw, CheckCircle, XCircle, Loader2, Search, ChevronDown } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Document {
  id: number;
  stock_symbol: string;
  document_type: string;
  financial_year: number;
  quarter: string | null;
  version: number;
  is_latest: boolean;
  file_path: string;
  file_exists: boolean;
  uploaded_at: string;
  summary: string | null;
}

interface StatusSummary {
  total_stocks: number;
  stocks: Array<{
    symbol: string;
    name: string;
    total_documents: number;
    documents: Array<{
      document_type: string;
      financial_year: number;
      quarter: string | null;
      file_exists: boolean;
      uploaded_at: string;
    }>;
  }>;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  annual_report: "Annual Report",
  quarterly_result: "Quarterly Result",
  concall: "Concall",
  presentation: "Presentation",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  annual_report: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  quarterly_result: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  concall: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  presentation: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [status, setStatus] = useState<StatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSymbol, setFilterSymbol] = useState("");
  const [filterType, setFilterType] = useState("");

  // Upload form state
  const [uploadSymbol, setUploadSymbol] = useState("");
  const [uploadType, setUploadType] = useState("annual_report");
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploadQuarter, setUploadQuarter] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Trigger download state
  const [triggerSymbol, setTriggerSymbol] = useState("");
  const [triggerType, setTriggerType] = useState("annual_report");
  const [triggerYear, setTriggerYear] = useState(new Date().getFullYear());
  const [triggerQuarter, setTriggerQuarter] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSymbol) params.set("stock_symbol", filterSymbol.toUpperCase());
      if (filterType) params.set("document_type", filterType);

      const [docsRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/ingest/documents?${params}`),
        fetch(`${API_URL}/api/v1/ingest/status`),
      ]);
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (statusRes.ok) setStatus(await statusRes.json());
    } catch (err) {
      console.error("Failed to fetch document data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterSymbol, filterType]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadSymbol || !uploadYear) return;
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("file", uploadFile);
    form.append("stock_symbol", uploadSymbol.toUpperCase());
    form.append("document_type", uploadType);
    form.append("financial_year", String(uploadYear));
    if (uploadQuarter) form.append("quarter", uploadQuarter.toUpperCase());

    try {
      const res = await fetch(`${API_URL}/api/v1/ingest/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMsg({ type: "success", text: data.message || "Ingested successfully." });
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchData();
      } else {
        setUploadMsg({ type: "error", text: data.detail || "Upload failed." });
      }
    } catch (err) {
      setUploadMsg({ type: "error", text: "Network error. Is the backend running?" });
    } finally {
      setUploading(false);
    }
  };

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerSymbol || !triggerYear) return;
    setTriggering(true);
    setTriggerMsg(null);
    const params = new URLSearchParams({
      stock_symbol: triggerSymbol.toUpperCase(),
      financial_year: String(triggerYear),
      document_type: triggerType,
    });
    if (triggerQuarter) params.set("quarter", triggerQuarter.toUpperCase());

    try {
      const res = await fetch(`${API_URL}/api/v1/ingest/trigger?${params}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTriggerMsg({ type: "success", text: data.message || "Download and ingestion triggered." });
        fetchData();
      } else {
        setTriggerMsg({ type: "error", text: data.detail || "Trigger failed." });
      }
    } catch (err) {
      setTriggerMsg({ type: "error", text: "Network error. Is the backend running?" });
    } finally {
      setTriggering(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-8 shadow-sm dark:shadow-2xl transition-colors duration-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-violet-500/10 rounded-xl">
            <FileText className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Document Management</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Upload, trigger downloads, and manage RAG knowledge base documents.
            </p>
          </div>
        </div>
        {status && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19]/50 border border-slate-200 dark:border-[#1E2538]">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Stocks</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{status.total_stocks}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19]/50 border border-slate-200 dark:border-[#1E2538]">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Docs</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{documents.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19]/50 border border-slate-200 dark:border-[#1E2538]">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Files Present</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {documents.filter((d) => d.file_exists).length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19]/50 border border-slate-200 dark:border-[#1E2538]">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Missing Files</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {documents.filter((d) => !d.file_exists).length}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: Action Cards */}
        <div className="space-y-6">
          {/* Upload Card */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-4 flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-600 dark:text-[#00E5FF]" />
              <span>Upload Document</span>
            </h2>
            <form onSubmit={handleUpload} className="space-y-3">
              <input
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF]/50"
                placeholder="Stock Symbol (e.g. TCS)"
                value={uploadSymbol}
                onChange={(e) => setUploadSymbol(e.target.value)}
                required
              />
              <select
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF]/50"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <select
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF]/50"
                value={uploadYear}
                onChange={(e) => setUploadYear(Number(e.target.value))}
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <input
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-[#00E5FF]/50"
                placeholder="Quarter (e.g. Q1) — optional"
                value={uploadQuarter}
                onChange={(e) => setUploadQuarter(e.target.value)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.html"
                className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600/10 dark:file:bg-[#00E5FF]/10 file:text-blue-600 dark:file:text-[#00E5FF] file:text-xs file:font-semibold hover:file:bg-blue-600/20 dark:hover:file:bg-[#00E5FF]/20 cursor-pointer"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
              />
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 rounded-lg font-semibold text-sm bg-blue-600 text-white dark:bg-[#00E5FF] dark:text-[#080A10] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-95"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploading ? "Ingesting..." : "Upload & Ingest"}</span>
              </button>
              {uploadMsg && (
                <div className={`flex items-center space-x-2 text-xs p-2.5 rounded-lg border ${uploadMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                  {uploadMsg.type === "success" ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                  <span>{uploadMsg.text}</span>
                </div>
              )}
            </form>
          </div>

          {/* Trigger Download Card */}
          <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-4 flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-indigo-600 dark:text-[#00F5D4]" />
              <span>Trigger Auto-Download</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Search the internet and download a PDF automatically.
            </p>
            <form onSubmit={handleTrigger} className="space-y-3">
              <input
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 dark:focus:border-[#00F5D4]/50"
                placeholder="Stock Symbol (e.g. INFOSYS)"
                value={triggerSymbol}
                onChange={(e) => setTriggerSymbol(e.target.value)}
                required
              />
              <select
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-600 dark:focus:border-[#00F5D4]/50"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
              >
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <select
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-600 dark:focus:border-[#00F5D4]/50"
                value={triggerYear}
                onChange={(e) => setTriggerYear(Number(e.target.value))}
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <input
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 dark:focus:border-[#00F5D4]/50"
                placeholder="Quarter (e.g. Q2) — optional"
                value={triggerQuarter}
                onChange={(e) => setTriggerQuarter(e.target.value)}
              />
              <button
                type="submit"
                disabled={triggering}
                className="w-full py-2.5 rounded-lg font-semibold text-sm bg-indigo-600 text-white dark:bg-[#00F5D4] dark:text-[#080A10] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-95"
              >
                {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span>{triggering ? "Downloading..." : "Trigger Download"}</span>
              </button>
              {triggerMsg && (
                <div className={`flex items-center space-x-2 text-xs p-2.5 rounded-lg border ${triggerMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                  {triggerMsg.type === "success" ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                  <span>{triggerMsg.text}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right: Documents List */}
        <div className="xl:col-span-2 bg-white border border-slate-200 dark:bg-[#0E121E]/80 dark:border-[#1E2538] rounded-xl p-6 shadow-sm dark:shadow-xl transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <span>Ingested Documents</span>
            </h2>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-[#1E2538] hover:border-blue-600 dark:hover:border-cyanAccent/30 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyanAccent transition-all shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-sm text-slate-900 dark:text-slate-200 placeholder-slate-450 focus:outline-none focus:border-blue-600 dark:focus:border-cyanAccent/50 font-medium"
                placeholder="Filter by symbol..."
                value={filterSymbol}
                onChange={(e) => setFilterSymbol(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-600 dark:focus:border-cyanAccent/50 font-semibold"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 font-medium">
              <Loader2 className="h-6 w-6 animate-spin mr-3" />
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 font-medium">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No documents ingested yet.</p>
              <p className="text-xs mt-1">Upload a file or trigger an auto-download.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1E2538] text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-[#0F1322]/50">
                    <th className="py-3.5 px-3">Symbol</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">FY</th>
                    <th className="py-3.5 px-3">Quarter</th>
                    <th className="py-3.5 px-3">Ver</th>
                    <th className="py-3.5 px-3">File</th>
                    <th className="py-3.5 px-3">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E2538]/40">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/30 dark:hover:bg-[#0E121E]/30 transition-colors text-sm"
                    >
                      <td className="py-3 px-3 font-black text-blue-600 dark:text-cyanAccent">{doc.stock_symbol}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${DOC_TYPE_COLORS[doc.document_type] || "bg-slate-500/10 text-slate-500"}`}>
                          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-bold">{doc.financial_year}</td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">{doc.quarter || "—"}</td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-medium">v{doc.version}{doc.is_latest ? " ✓" : ""}</td>
                      <td className="py-3 px-3">
                        {doc.file_exists ? (
                          <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>OK</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-red-600 dark:text-red-400 text-xs font-bold">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Missing</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400 dark:text-slate-500 text-xs font-medium">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
