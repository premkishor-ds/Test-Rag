"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Sparkles, AlertCircle, Search, ArrowUpRight, 
  Trash2, FileText, ChevronDown, ChevronUp, BarChart2, Plus, 
  Menu, X, Send, History, Briefcase, TrendingUp, Settings, Sliders, Cpu, Download
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Citation {
  score: number;
  content: string;
  metadata: {
    source_file: string;
    page_number: number;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources?: Citation[];
  scores?: {
    business: number;
    financial: number;
    valuation: number;
    risk: number;
    overall: number;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  target_symbol?: string | null;
}

const SUGGESTED_QUESTIONS = [
  { text: "Should I invest in GROWW?", icon: TrendingUp, tag: "Investment Thesis" },
  { text: "Summarize AEROFLEX annual report.", icon: FileText, tag: "PDF Analysis" },
  { text: "Compare SJS vs NETWEB.", icon: Briefcase, tag: "Competitor Analysis" },
  { text: "What are the risks in Knowledge Marine?", icon: AlertCircle, tag: "Risk Evaluation" }
];

export default function StockChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [sessionSearch, setSessionSearch] = useState("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("qwen2.5:14b");
  const [temperature, setTemperature] = useState(0.2);
  const [topK, setTopK] = useState(10);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");

  const [tempModel, setTempModel] = useState("qwen2.5:14b");
  const [tempTemperature, setTempTemperature] = useState(0.2);
  const [tempTopK, setTempTopK] = useState(10);
  const [tempSystemPrompt, setTempSystemPrompt] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook to fetch documents when active stock symbol changes
  useEffect(() => {
    if (activeSymbol) {
      fetch(`${API_URL}/api/v1/stock/${activeSymbol}/documents`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          setDocuments(data || []);
          const pendingFile = sessionStorage.getItem("pending_chat_file");
          if (pendingFile && data.includes(pendingFile)) {
            setSelectedDocument(pendingFile);
            sessionStorage.removeItem("pending_chat_file");
          } else {
            setSelectedDocument("");
          }
        })
        .catch(err => {
          console.error("Error fetching documents:", err);
          setDocuments([]);
          setSelectedDocument("");
        });
    } else {
      setDocuments([]);
      setSelectedDocument("");
    }
  }, [activeSymbol]);

  // Hide global layout footer and stretch main container on mount, restore on unmount
  useEffect(() => {
    const main = document.querySelector("main");
    let originalMainClass = "";
    if (main) {
      originalMainClass = main.className;
      main.className = "flex-grow w-full relative flex flex-col";
    }

    const footer = document.querySelector("footer");
    if (footer) {
      footer.style.display = "none";
    }

    return () => {
      if (main && originalMainClass) {
        main.className = originalMainClass;
      }
      if (footer) {
        footer.style.display = "";
      }
    };
  }, []);

  // Fetch sessions from backend
  const fetchSessions = async (autoSelectFirst = true) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations`);
      if (res.ok) {
        const data = await res.json();
        const formatted: ChatSession[] = data.map((c: any) => ({
          id: String(c.id),
          title: c.title,
          messages: [],
          target_symbol: c.target_symbol
        }));
        setSessions(formatted);
        
        if (autoSelectFirst && formatted.length > 0) {
          setCurrentSessionId(formatted[0].id);
          loadSessionMessages(formatted[0].id);
          if (formatted[0].target_symbol) {
            setActiveSymbol(formatted[0].target_symbol);
          } else {
            setActiveSymbol(null);
          }
        } else if (formatted.length === 0) {
          startNewSession();
        }
      }
    } catch (e) {
      console.error("Error loading chat sessions from database:", e);
    }
  };

  // Load messages for specific session
  const loadSessionMessages = async (sessionId: string) => {
    if (!sessionId || isNaN(Number(sessionId))) {
      setMessages([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const msgs: ChatMessage[] = data.map((m: any) => {
          let meta = { sources: [], scores: undefined, comparison_table: undefined };
          if (m.meta_json) {
            try {
              meta = JSON.parse(m.meta_json);
            } catch (e) {}
          }
          return {
            role: m.sender as "user" | "assistant",
            text: m.content,
            sources: meta.sources || [],
            scores: meta.scores || undefined,
            comparison_table: meta.comparison_table || undefined
          };
        });
        setMessages(msgs);
      }
    } catch (e) {
      console.error("Error loading session messages:", e);
    }
  };

  // Fetch initial conversations list & Check for pending search prompt context
  useEffect(() => {
    fetchSessions();
    
    const pendingPrompt = sessionStorage.getItem("pending_chat_prompt");
    const pendingSymbol = sessionStorage.getItem("pending_chat_symbol");
    
    if (pendingPrompt) {
      setInput(pendingPrompt);
      if (pendingSymbol) {
        setActiveSymbol(pendingSymbol);
      }
      sessionStorage.removeItem("pending_chat_prompt");
      sessionStorage.removeItem("pending_chat_symbol");
    }
  }, []);

  // Load chat settings from local storage
  useEffect(() => {
    const savedModel = localStorage.getItem("equity_ai_chat_model");
    if (savedModel) {
      setSelectedModel(savedModel);
      setTempModel(savedModel);
    }
    
    const savedTemp = localStorage.getItem("equity_ai_chat_temp");
    if (savedTemp) {
      const v = parseFloat(savedTemp);
      setTemperature(v);
      setTempTemperature(v);
    }
    
    const savedTopK = localStorage.getItem("equity_ai_chat_topK");
    if (savedTopK) {
      const v = parseInt(savedTopK);
      setTopK(v);
      setTempTopK(v);
    }
    
    const savedPrompt = localStorage.getItem("equity_ai_chat_systemPrompt");
    if (savedPrompt) {
      setCustomSystemPrompt(savedPrompt);
      setTempSystemPrompt(savedPrompt);
    }
  }, []);

  const startNewSession = () => {
    // If the current session is already new and blank, don't spawn another one
    if (currentSessionId && isNaN(Number(currentSessionId)) && messages.length === 0) {
      return;
    }
    // Set a temporary temp session ID until first message saves it in database
    const tempId = "temp-" + Math.random().toString(36).substring(7);
    setCurrentSessionId(tempId);
    setMessages([]);
    setActiveSymbol(null);
    setDocuments([]);
    setSelectedDocument("");
  };

  const selectSession = (id: string) => {
    setCurrentSessionId(id);
    loadSessionMessages(id);
    const session = sessions.find(s => s.id === id);
    if (session && session.target_symbol) {
      setActiveSymbol(session.target_symbol);
    } else {
      setActiveSymbol(null);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id.startsWith("temp-")) {
      fetchSessions(true);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchSessions(true);
      }
    } catch (e) {
      console.error("Error deleting session:", e);
    }
  };

  const handleSaveSettings = () => {
    setSelectedModel(tempModel);
    setTemperature(tempTemperature);
    setTopK(tempTopK);
    setCustomSystemPrompt(tempSystemPrompt);

    localStorage.setItem("equity_ai_chat_model", tempModel);
    localStorage.setItem("equity_ai_chat_temp", tempTemperature.toString());
    localStorage.setItem("equity_ai_chat_topK", tempTopK.toString());
    localStorage.setItem("equity_ai_chat_systemPrompt", tempSystemPrompt);

    setSettingsOpen(false);
  };

  const handleOpenSettings = () => {
    setTempModel(selectedModel);
    setTempTemperature(temperature);
    setTempTopK(topK);
    setTempSystemPrompt(customSystemPrompt);
    setSettingsOpen(true);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    // Optimistic user update
    const newMessages: ChatMessage[] = [...messages, { role: "user", text: userMsg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setExpandedSource(null);

    const isTemp = currentSessionId.startsWith("temp-");

    try {
      const res = await fetch(`${API_URL}/api/v1/stock-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          conversationId: isTemp ? null : currentSessionId,
          model: selectedModel,
          temperature: temperature,
          topK: topK,
          systemPrompt: customSystemPrompt || undefined,
          sourceFile: selectedDocument || undefined
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // If it was a new temp conversation, set database conversation ID and reload session list
        if (isTemp && data.conversationId) {
          setCurrentSessionId(String(data.conversationId));
          fetchSessions(false);
        }

        if (data.target_symbol) {
          setActiveSymbol(data.target_symbol);
        }

        setMessages((prev) => [
          ...prev.filter(m => m.role === "user"), // Keep user message
          { 
            role: "assistant", 
            text: data.answer,
            sources: data.sources || [],
            scores: data.scores || undefined
          }
        ]);
      } else {
        throw new Error("API call failed");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Failed to fetch response. Please verify Ollama and backend connection." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown & Table Formatter
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      // 1. Headers
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${idx}`} className="text-sm font-extrabold text-[color:var(--text-primary)] mt-6 mb-2 border-b border-[color:var(--border-color)] pb-1 uppercase tracking-wider">
            {line.replace("## ", "")}
          </h2>
        );
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${idx}`} className="text-xs font-bold text-[color:var(--cyan-accent)] mt-4 mb-2 uppercase tracking-wide">
            {line.replace("### ", "")}
          </h3>
        );
        return;
      }

      // 2. Table Parsing
      if (line.startsWith("|") && line.endsWith("|")) {
        const parts = line.split("|").map(p => p.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (line.includes("---")) {
          return;
        }
        if (!inTable) {
          inTable = true;
          tableHeaders = parts;
        } else {
          tableRows.push(parts);
        }
        return;
      } else if (inTable) {
        inTable = false;
        const headers = [...tableHeaders];
        const rows = [...tableRows];
        tableHeaders = [];
        tableRows = [];
        elements.push(
          <div key={`table-${idx}`} className="overflow-x-auto my-4 border border-[color:var(--border-color)] rounded-xl bg-[color:var(--bg-secondary)] shadow-sm">
            <table className="w-full text-left border-collapse text-[11px] font-medium">
              <thead>
                <tr className="bg-[color:var(--bg-tertiary)] border-b border-[color:var(--border-color)] text-[9px] text-[color:var(--text-secondary)] font-bold uppercase tracking-wider">
                  {headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-color)]/50">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[color:var(--bg-tertiary)]/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-[color:var(--text-primary)]/90">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // 3. Bullet points
      if (line.startsWith("* ") || line.startsWith("- ")) {
        elements.push(
          <li key={`li-${idx}`} className="ml-4 list-disc text-xs text-[color:var(--text-primary)]/80 leading-relaxed my-1 pl-1">
            {formatBold(line.substring(2))}
          </li>
        );
        return;
      }

      // 4. Regular line
      if (line.trim() === "") {
        elements.push(<div key={`empty-${idx}`} className="h-2"></div>);
        return;
      }

      elements.push(
        <p key={`p-${idx}`} className="text-xs text-[color:var(--text-primary)]/85 leading-relaxed my-1">
          {formatBold(line)}
        </p>
      );
    });

    function formatBold(str: string) {
      const regex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(str)) !== null) {
        if (match.index > lastIndex) {
          parts.push(str.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-[color:var(--text-primary)] font-semibold">{match[1]}</strong>);
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < str.length) {
        parts.push(str.substring(lastIndex));
      }
      return parts.length > 0 ? parts : str;
    }

    return <div className="space-y-1">{elements}</div>;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[color:var(--bg-primary)] relative overflow-hidden">
      
      {/* Sidebar Panel - Collapsible / ChatGPT Style */}
      <div 
        className={`${
          sidebarOpen ? "w-66 border-r" : "w-0 border-r-0"
        } transition-all duration-350 ease-in-out border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] flex flex-col flex-shrink-0 z-20 relative overflow-hidden`}
      >
        <div className="p-4 border-b border-[color:var(--border-color)] flex items-center justify-between">
          <button 
            onClick={startNewSession}
            className="flex-grow flex items-center justify-center space-x-2 py-2 px-3 bg-[color:var(--cyan-accent)] hover:opacity-90 text-white dark:text-black rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Research</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-grow overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          <div className="flex items-center space-x-2 px-2 pb-2 text-[10px] font-bold text-[color:var(--text-secondary)] uppercase tracking-widest">
            <History className="h-3.5 w-3.5" />
            <span>Recent Analysis</span>
          </div>

          <div className="px-2 pb-2">
            <input
              type="text"
              placeholder="Search chat history..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="w-full bg-[color:var(--bg-tertiary)] border border-[color:var(--border-color)] text-[11px] p-2 rounded-lg font-semibold placeholder-[color:var(--text-secondary)] focus:outline-none focus:border-[color:var(--cyan-accent)]"
            />
          </div>
          
          {/* Temporary Blank Session Indicator in Sidebar */}
          {currentSessionId.startsWith("temp-") && (
            <div className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer bg-[color:var(--bg-tertiary)] text-[color:var(--text-primary)]">
              <div className="flex items-center space-x-2 truncate">
                <MessageSquare className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
                <span className="truncate italic">New Research Session</span>
              </div>
            </div>
          )}

          {sessions
            .filter((s) => s.title.toLowerCase().includes(sessionSearch.toLowerCase()))
            .map((s) => (
              <div
              key={s.id}
              onClick={() => selectSession(s.id)}
              className={`group flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                s.id === currentSessionId
                  ? "bg-[color:var(--bg-tertiary)] text-[color:var(--text-primary)] border border-[color:var(--border-color)]"
                  : "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-tertiary)]/50"
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <MessageSquare className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </div>
              <button
                type="button"
                onClick={(e) => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[color:var(--text-secondary)] hover:text-red-500 rounded transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Panel Info */}
        <div className="p-4 border-t border-[color:var(--border-color)] text-[9px] text-[color:var(--text-secondary)] font-bold uppercase tracking-wider space-y-1">
          <span>{selectedModel} Active Node</span>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-grow flex flex-col h-full relative bg-[color:var(--bg-primary)]">
        
        {/* Top Control Bar */}
        <div className="px-6 py-3 border-b border-[color:var(--border-color)] flex items-center justify-between bg-[color:var(--bg-secondary)] z-10">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-tertiary)] rounded-lg transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <div>
              <h2 className="text-xs font-black text-[color:var(--text-primary)] uppercase tracking-wider">EQUITY.AI Copilot</h2>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">RAG Engine Online</span>
            </div>

            {/* Export Thread Button */}
            {currentSessionId && !currentSessionId.startsWith("temp-") && (
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`${API_URL}/api/v1/conversations/${currentSessionId}/export`);
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Research_Report_${currentSessionId}.md`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    } else {
                      alert("Failed to export chat thread.");
                    }
                  } catch (e) {
                    console.error("Export failed:", e);
                  }
                }}
                className="p-1.5 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-tertiary)] rounded-lg transition-all"
                title="Export Research Report"
              >
                <Download className="h-4.5 w-4.5" />
              </button>
            )}

            {/* Settings Trigger Gear Button */}
            <button
              onClick={handleOpenSettings}
              className="p-1.5 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-tertiary)] rounded-lg transition-all"
              title="Chat Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Messaging Container */}
        <div className="flex-grow overflow-y-auto px-4 md:px-8 py-6 space-y-6 scrollbar-thin">
          {messages.length === 0 ? (
            /* ChatGPT / Gemini Welcome screen */
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 my-auto">
              <div className="space-y-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[color:var(--cyan-accent)] to-[color:var(--teal-accent)] bg-clip-text text-transparent">
                  Where should we research today?
                </h1>
                <p className="text-xs text-[color:var(--text-secondary)] font-medium">
                  Ask quantitative parameters, compare stock filings, or evaluate corporate risks.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full max-w-xl">
                {SUGGESTED_QUESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.text)}
                      className="p-4 text-left rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] hover:border-[color:var(--cyan-accent)] hover:bg-[color:var(--bg-tertiary)]/50 transition-all flex flex-col justify-between shadow-sm group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-black text-[color:var(--cyan-accent)] uppercase tracking-widest">{item.tag}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-[color:var(--text-secondary)] group-hover:text-[color:var(--cyan-accent)] transition-all" />
                      </div>
                      <p className="text-xs text-[color:var(--text-primary)] font-semibold mt-2.5">{item.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Conversation Bubble Stream */
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex items-start space-x-4 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="p-2 rounded-lg flex-shrink-0 bg-[color:var(--cyan-accent)]/10 text-[color:var(--cyan-accent)] border border-[color:var(--cyan-accent)]/20 shadow-sm">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                  )}

                  <div className="space-y-3 flex-grow max-w-[88%]">
                    {/* Chat Bubble Body */}
                    <div className={`p-4 rounded-xl text-xs leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-[color:var(--cyan-accent)] text-white dark:text-black ml-auto max-w-[80%] shadow-md font-semibold" 
                        : "bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] font-medium"
                    }`}>
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* Metric evaluation block */}
                    {msg.scores && (
                      <div className="p-3.5 rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] space-y-3">
                        <div className="flex items-center justify-between border-b border-[color:var(--border-color)] pb-1.5">
                          <span className="text-[10px] font-black text-[color:var(--text-secondary)] uppercase tracking-widest flex items-center space-x-1">
                            <BarChart2 className="h-3.5 w-3.5 text-[color:var(--cyan-accent)]" />
                            <span>AI Financial Evaluation Metrics</span>
                          </span>
                          <span className="text-xs font-black text-[color:var(--cyan-accent)]">
                            Overall Score: {msg.scores.overall}/100
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3.5">
                          {Object.entries(msg.scores)
                            .filter(([key]) => key !== "overall")
                            .map(([key, val]) => (
                              <div key={key} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-[color:var(--text-secondary)] capitalize">
                                  <span>{key} Score</span>
                                  <span>{val}/100</span>
                                </div>
                                <div className="w-full bg-[color:var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      val >= 70 
                                        ? "bg-emerald-500" 
                                        : val >= 50 
                                        ? "bg-amber-500" 
                                        : "bg-red-500"
                                    }`} 
                                    style={{ width: `${val}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Cited sources accordion list */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-[color:var(--text-secondary)] uppercase tracking-widest block">
                          Verified Citations:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {msg.sources.map((src, srcIdx) => {
                            const uniqueKey = `${i}-${srcIdx}`;
                            const isExpanded = expandedSource === uniqueKey;
                            return (
                              <div 
                                key={srcIdx} 
                                className="border border-[color:var(--border-color)] rounded-xl overflow-hidden bg-[color:var(--bg-secondary)] text-[11px]"
                              >
                                <button 
                                  type="button"
                                  onClick={() => setExpandedSource(isExpanded ? null : uniqueKey)}
                                  className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[color:var(--bg-tertiary)]/50 transition-colors"
                                >
                                  <span className="flex items-center space-x-2 font-bold text-[color:var(--text-primary)]">
                                    <FileText className="h-3.5 w-3.5 text-[color:var(--text-secondary)]" />
                                    <span className="truncate max-w-[200px]">{src.metadata.source_file}</span>
                                    <span className="text-[color:var(--text-secondary)] font-normal text-[10px]">p. {src.metadata.page_number}</span>
                                  </span>
                                  <div className="flex items-center space-x-2 text-[10px] font-black text-[color:var(--cyan-accent)]">
                                    <span>Match: {Math.round(src.score * 100)}%</span>
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="px-3 py-2.5 bg-[color:var(--bg-tertiary)]/30 border-t border-[color:var(--border-color)] text-[11px] text-[color:var(--text-secondary)] italic leading-relaxed">
                                    "{src.content}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="max-w-3xl mx-auto flex items-center space-x-3 text-[color:var(--text-secondary)] font-black text-[9px] uppercase tracking-widest pl-12 mt-4">
              <Sparkles className="h-4 w-4 text-[color:var(--cyan-accent)] animate-spin" />
              <span>Scanning databases & formulating financial thesis...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Centered Pill Search Input Bar */}
        <div className="p-4 bg-[color:var(--bg-secondary)] border-t border-[color:var(--border-color)] backdrop-blur-md">
          {documents.length > 0 && (
            <div className="max-w-3xl mx-auto mb-2 flex items-center space-x-2 px-1">
              <span className="text-[10px] font-black text-[color:var(--text-secondary)] uppercase tracking-widest flex items-center space-x-1">
                <FileText className="h-3.5 w-3.5 text-[color:var(--cyan-accent)]" />
                <span>Chat Focus:</span>
              </span>
              <select
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                className="bg-[color:var(--bg-tertiary)] text-[11px] font-bold text-[color:var(--text-primary)] border border-[color:var(--border-color)] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[color:var(--cyan-accent)] max-w-xs truncate"
              >
                <option value="">All Stock Documents ({documents.length})</option>
                {documents.map((doc, idx) => (
                  <option key={idx} value={doc}>{doc}</option>
                ))}
              </select>
            </div>
          )}

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="max-w-3xl mx-auto relative flex items-center bg-[color:var(--bg-tertiary)] border border-[color:var(--border-color)] focus-within:border-[color:var(--cyan-accent)] rounded-xl px-4 py-2 transition-all shadow-sm focus-within:ring-1 focus-within:ring-[color:var(--cyan-accent)]/20"
          >
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Ask Copilot: 'Should I invest in GROWW?' or 'Compare SJS vs AEROFLEX'..." 
              className="flex-grow bg-transparent text-xs text-[color:var(--text-primary)] focus:outline-none py-2 px-1 font-semibold placeholder-[color:var(--text-secondary)]"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="p-2.5 bg-[color:var(--cyan-accent)] text-white dark:text-black rounded-lg hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center shadow-md dark:shadow-none"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Settings Overlay Modal Dialog */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[color:var(--border-color)] flex items-center justify-between text-[color:var(--text-primary)]">
              <div className="flex items-center space-x-2">
                <Settings className="h-4.5 w-4.5 text-[color:var(--cyan-accent)]" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider">Research Terminal Settings</h3>
              </div>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="p-1 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* LLM Model Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[color:var(--text-secondary)] uppercase tracking-wider flex items-center space-x-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Local LLM Engine Node</span>
                </label>
                <select
                  value={tempModel}
                  onChange={(e) => setTempModel(e.target.value)}
                  className="w-full bg-[color:var(--bg-tertiary)] border border-[color:var(--border-color)] rounded-lg py-2 px-3 text-xs text-[color:var(--text-primary)] focus:outline-none focus:border-[color:var(--cyan-accent)] font-bold"
                >
                  <option value="qwen2.5:14b">Qwen 2.5:14B (Optimized Financial Logic)</option>
                  <option value="qwen2.5:7b">Qwen 2.5:7B (Fast Conversational)</option>
                  <option value="nomic-embed-text">Nomic Embed (Reference Embeddings)</option>
                </select>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-[color:var(--text-secondary)] uppercase tracking-wider">
                  <span className="flex items-center space-x-1.5">
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Temperature / Creativity</span>
                  </span>
                  <span className="text-[color:var(--cyan-accent)] font-black">{tempTemperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={tempTemperature}
                  onChange={(e) => setTempTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[color:var(--cyan-accent)]"
                />
                <div className="flex justify-between text-[9px] text-[color:var(--text-secondary)] font-bold uppercase">
                  <span>Deterministic (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              {/* Retrieval Limit (Top-K Chunks) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-[color:var(--text-secondary)] uppercase tracking-wider">
                  <span className="flex items-center space-x-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Vector Chunk Retrieve Limit (Top-K)</span>
                  </span>
                  <span className="text-[color:var(--cyan-accent)] font-black">{tempTopK} chunks</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="20"
                  step="1"
                  value={tempTopK}
                  onChange={(e) => setTempTopK(parseInt(e.target.value))}
                  className="w-full accent-[color:var(--cyan-accent)]"
                />
                <div className="flex justify-between text-[9px] text-[color:var(--text-secondary)] font-bold uppercase">
                  <span>Fast (3 Chunks)</span>
                  <span>Detailed (20 Chunks)</span>
                </div>
              </div>

              {/* System Instruction Override */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[color:var(--text-secondary)] uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Custom System Instruction Overrides</span>
                </label>
                <textarea
                  value={tempSystemPrompt}
                  onChange={(e) => setTempSystemPrompt(e.target.value)}
                  placeholder="e.g. 'You are a premium stock research assistant for Indian equities. Focus on GROWW, NETWEB, SJS, AEROFLEX.'"
                  className="w-full h-20 bg-[color:var(--bg-tertiary)] border border-[color:var(--border-color)] rounded-lg py-2 px-3 text-xs text-[color:var(--text-primary)] focus:outline-none focus:border-[color:var(--cyan-accent)] placeholder-[color:var(--text-secondary)] font-medium"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-[color:var(--bg-tertiary)]/50 border-t border-[color:var(--border-color)] flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Are you sure you want to delete all chat history from the database? This action is irreversible.")) {
                    try {
                      // Delete each database conversation sequentially
                      for (const s of sessions) {
                        await fetch(`${API_URL}/api/v1/conversations/${s.id}`, { method: "DELETE" });
                      }
                      fetchSessions(true);
                      setSettingsOpen(false);
                    } catch (e) {
                      console.error("Error clearing database conversations:", e);
                    }
                  }
                }}
                className="px-3.5 py-2 border border-red-500/30 text-[10px] text-red-500 hover:bg-red-500/5 font-bold uppercase tracking-wider rounded-lg transition-all"
              >
                Clear DB History
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 border border-[color:var(--border-color)] text-[10px] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] font-bold uppercase tracking-wider rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-[color:var(--cyan-accent)] text-white dark:text-black text-[10px] font-bold uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
