"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Sparkles, AlertCircle, Search, ArrowUpRight, 
  Trash2, FileText, ChevronDown, ChevronUp, BarChart2, CheckCircle2, User
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

const SUGGESTED_QUESTIONS = [
  "Should I invest in Netweb?",
  "Summarize Aeroflex latest annual report.",
  "Compare SJS vs Aeroflex.",
  "What are the risks in Knowledge Marine?",
  "What is the expected CAGR of Netweb?"
];

export default function StockChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [expandedSource, setExpandedSource] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversationId
  useEffect(() => {
    setConversationId(Math.random().toString(36).substring(7));
  }, []);

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);
    setExpandedSource(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/stock-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          conversationId: conversationId
        })
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev, 
        { 
          role: "assistant", 
          text: data.answer,
          sources: data.sources || [],
          scores: data.scores || undefined
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Failed to fetch response. Please verify Ollama and backend connection." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(Math.random().toString(36).substring(7));
    setExpandedSource(null);
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
          <h2 key={`h2-${idx}`} className="text-sm font-extrabold text-slate-900 dark:text-white mt-5 mb-2 border-b border-slate-105 dark:border-[#1E2538] pb-1 uppercase tracking-wider">
            {line.replace("## ", "")}
          </h2>
        );
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${idx}`} className="text-xs font-bold text-blue-600 dark:text-[#00E5FF] mt-4 mb-1.5 uppercase tracking-wide">
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
          <div key={`table-${idx}`} className="overflow-x-auto my-3 border border-slate-200 dark:border-[#1E2538] rounded-xl shadow-sm">
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
                      <td key={cIdx} className="py-2 px-3 text-slate-700 dark:text-slate-350">{cell}</td>
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
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
      {/* Sidebar with suggested prompts */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
        {/* Info & suggested queries */}
        <div className="bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4]"></div>
          <div className="space-y-5">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-[#00E5FF]">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">AI Agent Prompts</span>
            </div>
            
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Suggested Stock Analysis</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                Choose a pre-defined research prompt to run deep financial RAG analysis.
              </p>
            </div>

            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-350 dark:border-[#1A2035] dark:hover:border-[#2D364F] bg-slate-50/50 hover:bg-slate-100 dark:bg-[#0B0F19]/50 dark:hover:bg-[#0E121E]/80 transition-all flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium group"
                >
                  <span className="truncate pr-2">{q}</span>
                  <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-[#00E5FF] group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Regulatory disclaimer */}
        <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-[#0E121E]/30 border border-slate-200 dark:border-[#1E2538] text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed space-y-2">
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 font-bold">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Compliance Disclaimer</span>
          </div>
          <p>
            This terminal runs local RAG LLM model queries based on loaded corporate PDFs. All scores and comparative insights are informational and do not represent professional financial advice.
          </p>
        </div>
      </div>

      {/* Main Terminal Chat Area */}
      <div className="flex-grow bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl flex flex-col h-[650px] shadow-sm relative overflow-hidden">
        {/* Terminal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E2538]/70 flex items-center justify-between bg-slate-50/50 dark:bg-[#080A10]/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/10 dark:bg-[#00E5FF]/10 text-blue-600 dark:text-[#00E5FF] rounded-xl">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Stock Research Terminal</h2>
              <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest flex items-center space-x-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>Active • local RAG engine ready</span>
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-[#1C233D] rounded-lg transition-colors flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider"
              title="Clear current session"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Message Feed Container */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin bg-slate-50/20 dark:bg-transparent">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="p-4 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4] text-white dark:text-[#080A10] rounded-2xl shadow-lg shadow-blue-500/10">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Start Your Investment Query</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Ask conversational questions about listed stocks, compare performance parameters, or review risks. The agent reads uploaded filings to summarize insights.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  onClick={() => handleSend("Should I invest in Netweb?")}
                  className="px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-[#00E5FF] bg-blue-600/5 dark:bg-[#00E5FF]/5 hover:bg-blue-600/10 dark:hover:bg-[#00E5FF]/10 border border-blue-600/10 dark:border-[#00E5FF]/10 rounded-lg transition-colors"
                >
                  Analyze Netweb
                </button>
                <button
                  onClick={() => handleSend("Compare SJS vs Aeroflex")}
                  className="px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-[#00E5FF] bg-blue-600/5 dark:bg-[#00E5FF]/5 hover:bg-blue-600/10 dark:hover:bg-[#00E5FF]/10 border border-blue-600/10 dark:border-[#00E5FF]/10 rounded-lg transition-colors"
                >
                  Compare Tickers
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex items-start space-x-3.5 max-w-[85%] ${
                  msg.role === "user" ? "self-end ml-auto flex-row-reverse space-x-reverse" : ""
                }`}
              >
                {/* Avatar Icon */}
                <div className={`p-2 rounded-xl flex-shrink-0 shadow-sm border ${
                  msg.role === "user" 
                    ? "bg-blue-600 border-blue-700 text-white" 
                    : "bg-slate-100 border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-blue-600 dark:text-[#00E5FF]"
                }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>

                <div className="space-y-3 flex-grow">
                  {/* Chat Bubble Body */}
                  <div className={`p-4 rounded-2xl border text-xs shadow-sm ${
                    msg.role === "user" 
                      ? "bg-blue-600/5 border-blue-600/10 text-slate-850 dark:bg-[#00E5FF]/5 dark:border-[#00E5FF]/10 dark:text-slate-200 font-semibold" 
                      : "bg-slate-50 border-slate-200 dark:bg-[#0B0F19]/60 dark:border-[#1A2035]/85 dark:text-slate-300 font-medium"
                  }`}>
                    {renderFormattedText(msg.text)}
                  </div>

                  {/* Render Visual Metric Scores if returned */}
                  {msg.scores && (
                    <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-[#0F1322]/50 border border-slate-200 dark:border-[#1A2035] space-y-3">
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

                  {/* Cited Sources with dropdown/expand action */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pl-1 space-y-2">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                        Evidence Reference Sources:
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {msg.sources.map((src, srcIdx) => {
                          const isExpanded = expandedSource === srcIdx;
                          return (
                            <div 
                              key={srcIdx} 
                              className="border border-slate-200 dark:border-[#1E2538] rounded-lg overflow-hidden bg-slate-50/50 dark:bg-[#0B0F19]/30 transition-all text-[11px]"
                            >
                              <button 
                                type="button"
                                onClick={() => setExpandedSource(isExpanded ? null : srcIdx)}
                                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-100/50 dark:hover:bg-[#141A2D]/40 transition-colors"
                              >
                                <span className="flex items-center space-x-2 font-bold text-slate-700 dark:text-slate-350">
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
                                <div className="px-3 py-2.5 bg-white dark:bg-[#07090F] border-t border-slate-200 dark:border-[#1E2538]/70 text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
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
            ))
          )}

          {loading && (
            <div className="flex items-center space-x-3 text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-widest animate-pulse pl-2 mt-4">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-[#00E5FF] animate-spin" />
              <span>Formulating Structured Investment Thesis...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }} 
          className="p-4 border-t border-slate-200 dark:border-[#1E2538] flex items-center space-x-3 bg-slate-50/50 dark:bg-[#080A10]/20"
        >
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask 'Analyze Netweb' or 'Compare SJS vs Aeroflex'..." 
            className="flex-grow bg-white border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] focus:border-blue-600 dark:focus:border-[#00E5FF] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors font-semibold shadow-sm focus:ring-1 focus:ring-blue-600/30 dark:focus:ring-[#00E5FF]/20"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="p-3 bg-blue-600 dark:bg-[#00E5FF] text-white dark:text-[#080A10] rounded-xl font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center shadow-md dark:shadow-none"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
