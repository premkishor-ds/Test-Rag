"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Sparkles, AlertCircle, Search, ArrowUpRight, 
  Trash2, FileText, ChevronDown, ChevronUp, BarChart2, Plus, 
  Menu, X, Send, History, Briefcase, TrendingUp
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
}

const SUGGESTED_QUESTIONS = [
  { text: "Should I invest in Netweb?", icon: TrendingUp, tag: "Investment Thesis" },
  { text: "Summarize Aeroflex annual report.", icon: FileText, tag: "PDF Analysis" },
  { text: "Compare SJS vs Aeroflex.", icon: Briefcase, tag: "Competitor Analysis" },
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hide global layout footer on mount, restore on unmount
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (footer) {
      footer.style.display = "none";
    }
    return () => {
      if (footer) {
        footer.style.display = "";
      }
    };
  }, []);

  // Load sessions from local storage
  useEffect(() => {
    const saved = localStorage.getItem("equity_ai_chat_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
        } else {
          startNewSession();
        }
      } catch (e) {
        startNewSession();
      }
    } else {
      startNewSession();
    }
  }, []);

  // Save sessions to local storage when messages or sessions change
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem("equity_ai_chat_sessions", JSON.stringify(updatedSessions));
  };

  const startNewSession = () => {
    const newId = Math.random().toString(36).substring(7);
    const newSession: ChatSession = {
      id: newId,
      title: `Analysis Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      messages: []
    };
    const updated = [newSession, ...sessions];
    setCurrentSessionId(newId);
    setMessages([]);
    saveSessions(updated);
  };

  const selectSession = (id: string) => {
    const sess = sessions.find((s) => s.id === id);
    if (sess) {
      setCurrentSessionId(id);
      setMessages(sess.messages);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (currentSessionId === id) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
        setMessages(updated[0].messages);
      } else {
        const newId = Math.random().toString(36).substring(7);
        const newSession: ChatSession = {
          id: newId,
          title: "New Analysis",
          messages: []
        };
        setCurrentSessionId(newId);
        setMessages([]);
        saveSessions([newSession]);
      }
    }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    const newMessages: ChatMessage[] = [...messages, { role: "user", text: userMsg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setExpandedSource(null);

    // Update session title on first message
    let sessionTitle = sessions.find(s => s.id === currentSessionId)?.title || "Analysis Session";
    if (messages.length === 0) {
      sessionTitle = userMsg.length > 25 ? userMsg.substring(0, 25) + "..." : userMsg;
    }

    // Temporary update to session list
    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSessionId) {
        return { ...s, title: sessionTitle, messages: newMessages };
      }
      return s;
    });
    saveSessions(updatedSessions);

    try {
      const res = await fetch(`${API_URL}/api/v1/stock-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          conversationId: currentSessionId
        })
      });
      const data = await res.json();
      
      const replyMessages: ChatMessage[] = [
        ...newMessages,
        { 
          role: "assistant", 
          text: data.answer,
          sources: data.sources || [],
          scores: data.scores || undefined
        }
      ];
      setMessages(replyMessages);

      const finalSessions = sessions.map((s) => {
        if (s.id === currentSessionId) {
          return { ...s, title: sessionTitle, messages: replyMessages };
        }
        return s;
      });
      saveSessions(finalSessions);

    } catch (err) {
      const errorMessages: ChatMessage[] = [
        ...newMessages,
        { role: "assistant", text: "Failed to fetch response. Please verify Ollama and backend connection." }
      ];
      setMessages(errorMessages);
      const finalSessions = sessions.map((s) => {
        if (s.id === currentSessionId) {
          return { ...s, messages: errorMessages };
        }
        return s;
      });
      saveSessions(finalSessions);
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
          <h2 key={`h2-${idx}`} className="text-sm font-extrabold text-slate-900 dark:text-white mt-6 mb-2 border-b border-slate-100 dark:border-[#1E2538] pb-1 uppercase tracking-wider">
            {line.replace("## ", "")}
          </h2>
        );
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${idx}`} className="text-xs font-bold text-blue-600 dark:text-[#00E5FF] mt-4 mb-2 uppercase tracking-wide">
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
          <div key={`table-${idx}`} className="overflow-x-auto my-4 border border-slate-200 dark:border-[#1E2538] rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse text-[11px] font-medium">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-[#1E2538] text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  {headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1E2538]/50">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-[#0B0F19]/25 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-slate-700 dark:text-slate-300">{cell}</td>
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
          <li key={`li-${idx}`} className="ml-4 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1 pl-1">
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
        <p key={`p-${idx}`} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1">
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
        parts.push(<strong key={match.index} className="text-slate-900 dark:text-white font-semibold">{match[1]}</strong>);
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
    <div className="flex h-[calc(100vh-140px)] border border-slate-200 dark:border-[#1E2538] rounded-2xl bg-white dark:bg-[#0E121E]/60 shadow-md relative overflow-hidden">
      
      {/* Sidebar Panel - Collapsible / ChatGPT Style */}
      <div 
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-[#1E2538] bg-slate-50/50 dark:bg-[#090C15] flex flex-col flex-shrink-0 z-20 relative overflow-hidden`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-[#1E2538] flex items-center justify-between">
          <button 
            onClick={startNewSession}
            className="flex-grow flex items-center justify-center space-x-2 py-2 px-3 bg-blue-600 dark:bg-[#00E5FF] hover:opacity-90 text-white dark:text-[#080A10] rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Research</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-grow overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          <div className="flex items-center space-x-2 px-2 pb-2 text-[10px] font-bold text-slate-455 dark:text-slate-550 uppercase tracking-widest">
            <History className="h-3.5 w-3.5" />
            <span>Recent Analysis</span>
          </div>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => selectSession(s.id)}
              className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                s.id === currentSessionId
                  ? "bg-slate-200/60 dark:bg-[#1C233D] text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#131A30]"
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <MessageSquare className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </div>
              <button
                type="button"
                onClick={(e) => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Panel Info */}
        <div className="p-4 border-t border-slate-200 dark:border-[#1E2538] text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider space-y-1">
          <span>Qwen2.5:14B Active Node</span>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-grow flex flex-col h-full relative bg-slate-50/15 dark:bg-transparent">
        
        {/* Top Control Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#1E2538]/70 flex items-center justify-between bg-white dark:bg-[#0E121E]/30 z-10">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1A2035] rounded-lg transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">EQUITY.AI Copilot</h2>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-bold uppercase tracking-widest">RAG Engine Online</span>
          </div>
        </div>

        {/* Messaging Container */}
        <div className="flex-grow overflow-y-auto px-4 md:px-8 py-6 space-y-6 scrollbar-thin">
          {messages.length === 0 ? (
            /* ChatGPT / Gemini Welcome screen */
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 my-auto">
              <div className="space-y-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4] bg-clip-text text-transparent">
                  Where should we research today?
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
                      className="p-4 text-left rounded-2xl border border-slate-200/80 hover:border-slate-350 dark:border-[#1A2035] dark:hover:border-[#2D364F] bg-white dark:bg-[#0B0F19]/40 hover:bg-slate-50 dark:hover:bg-[#0E121E]/80 transition-all flex flex-col justify-between shadow-sm group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-black text-blue-600 dark:text-[#00E5FF] uppercase tracking-widest">{item.tag}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-[#00E5FF] transition-all" />
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-2.5">{item.text}</p>
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
                    <div className="p-2 rounded-xl flex-shrink-0 bg-blue-600/10 dark:bg-[#00E5FF]/10 text-blue-600 dark:text-[#00E5FF] border border-blue-600/20 dark:border-[#00E5FF]/20 shadow-sm">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                  )}

                  <div className="space-y-3 flex-grow max-w-[88%]">
                    {/* Chat Bubble Body */}
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white ml-auto max-w-[80%] shadow-md shadow-blue-500/5 font-semibold" 
                        : "bg-slate-100/80 border border-slate-200 dark:bg-[#0C0F1A]/80 dark:border-[#1E2538]/70 dark:text-slate-300 font-medium"
                    }`}>
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* Metric evaluation block */}
                    {msg.scores && (
                      <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#0F1322]/50 border border-slate-200 dark:border-[#1A2035] space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E2538] pb-1.5">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center space-x-1">
                            <BarChart2 className="h-3.5 w-3.5 text-blue-600 dark:text-[#00E5FF]" />
                            <span>AI Financial Evaluation Metrics</span>
                          </span>
                          <span className="text-xs font-black text-blue-600 dark:text-[#00E5FF]">
                            Overall Score: {msg.scores.overall}/100
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3.5">
                          {Object.entries(msg.scores)
                            .filter(([key]) => key !== "overall")
                            .map(([key, val]) => (
                              <div key={key} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 capitalize">
                                  <span>{key} Score</span>
                                  <span>{val}/100</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-[#1E2538] h-1.5 rounded-full overflow-hidden">
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
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                          Verified Citations:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {msg.sources.map((src, srcIdx) => {
                            const uniqueKey = `${i}-${srcIdx}`;
                            const isExpanded = expandedSource === uniqueKey;
                            return (
                              <div 
                                key={srcIdx} 
                                className="border border-slate-200 dark:border-[#1E2538] rounded-xl overflow-hidden bg-white dark:bg-[#0B0F19]/20 text-[11px]"
                              >
                                <button 
                                  type="button"
                                  onClick={() => setExpandedSource(isExpanded ? null : uniqueKey)}
                                  className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-100/50 dark:hover:bg-[#141A2D]/40 transition-colors"
                                >
                                  <span className="flex items-center space-x-2 font-bold text-slate-700 dark:text-slate-300">
                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="truncate max-w-[200px]">{src.metadata.source_file}</span>
                                    <span className="text-slate-400 font-normal text-[10px]">p. {src.metadata.page_number}</span>
                                  </span>
                                  <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 dark:text-[#00E5FF]">
                                    <span>Match: {Math.round(src.score * 100)}%</span>
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="px-3 py-2.5 bg-slate-50/50 dark:bg-[#07090F] border-t border-slate-200 dark:border-[#1E2538]/70 text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
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
            <div className="max-w-3xl mx-auto flex items-center space-x-3 text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-widest animate-pulse pl-12 mt-4">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-[#00E5FF] animate-spin" />
              <span>Scanning databases & formulating financial thesis...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Centered Pill Search Input Bar */}
        <div className="p-4 bg-white dark:bg-[#0A0D18]/50 border-t border-slate-200 dark:border-[#1E2538] backdrop-blur-md">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="max-w-3xl mx-auto relative flex items-center bg-slate-100 dark:bg-[#0C0F1A] border border-slate-250 dark:border-[#1E2538] focus-within:border-blue-600 dark:focus-within:border-[#00E5FF] rounded-2xl px-4 py-2 transition-all shadow-sm focus-within:ring-1 focus-within:ring-blue-600/20 dark:focus-within:ring-[#00E5FF]/20"
          >
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Ask Copilot: 'Should I invest in Netweb?' or 'Compare SJS vs Aeroflex'..." 
              className="flex-grow bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none py-2 px-1 font-semibold placeholder-slate-400 dark:placeholder-slate-500"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="p-2.5 bg-blue-600 dark:bg-[#00E5FF] text-white dark:text-[#080A10] rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center shadow-md dark:shadow-none"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
