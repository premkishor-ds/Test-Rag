"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Sparkles, AlertCircle, Search, ArrowUpRight
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
  "Is this stock undervalued?",
  "What are the risks?",
  "Summarize annual report.",
  "Future growth drivers?",
  "Management guidance?",
  "Compare SJS vs Aeroflex"
];

export default function StockChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Welcome to the **EQUITY.AI Research Terminal**. Ask any qualitative or comparison query on your database stocks (e.g., 'Analyze Netweb' or 'Compare SJS vs Aeroflex') to begin."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversationId
  useEffect(() => {
    setConversationId(Math.random().toString(36).substring(7));
  }, []);

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

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

  // Simple Markdown & Table Formatter
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Split text by lines to parse tables and lists
    const lines = text.split("\n");
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const formattedLines = lines.map((line, idx) => {
      // 1. Headers
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-lg font-black text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-200 dark:border-[#1E2538] pb-1 uppercase tracking-wider">{line.replace("## ", "")}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-black text-blue-600 dark:text-[#00E5FF] mt-4 mb-2 uppercase tracking-wide">{line.replace("### ", "")}</h3>;
      }

      // 2. Table Parsing
      if (line.startsWith("|") && line.endsWith("|")) {
        const parts = line.split("|").map(p => p.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (line.includes("---")) {
          // Separator row, skip
          return null;
        }
        if (!inTable) {
          inTable = true;
          tableHeaders = parts;
          return null;
        } else {
          tableRows.push(parts);
          return null;
        }
      } else if (inTable) {
        // Table finished, render it
        inTable = false;
        const headers = [...tableHeaders];
        const rows = [...tableRows];
        tableHeaders = [];
        tableRows = [];
        return (
          <div key={`table-${idx}`} className="overflow-x-auto my-4 border border-slate-200 dark:border-[#1E2538] rounded-xl">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-[#1E2538] text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {headers.map((h, i) => (
                    <th key={i} className="py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1E2538]/50">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-[#0B0F19]/25 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-4 text-slate-700 dark:text-slate-350">{cell}</td>
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
        return (
          <li key={idx} className="ml-5 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold my-1">
            {line.substring(2)}
          </li>
        );
      }

      // 4. Regular line
      if (line.trim() === "") return <div key={idx} className="h-2"></div>;

      // Bold text formatting inline helper
      const formatBold = (str: string) => {
        const regex = /\*\*(.*?)\*\*/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(str)) !== null) {
          if (match.index > lastIndex) {
            parts.push(str.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="text-slate-900 dark:text-white font-extrabold">{match[1]}</strong>);
          lastIndex = regex.lastIndex;
        }
        if (lastIndex < str.length) {
          parts.push(str.substring(lastIndex));
        }
        return parts.length > 0 ? parts : str;
      };

      return <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold my-1">{formatBold(line)}</p>;
    });

    return <div className="space-y-1">{formattedLines}</div>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[calc(100vh-140px)]">
      {/* Sidebar Panel for prompts/suggested actions */}
      <div className="lg:col-span-1 bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] p-6 rounded-2xl flex flex-col justify-between shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-[#00E5FF]">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">AI Analyst Prompts</span>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Suggested Queries</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Click any pattern to query the active model nodes.</p>
          </div>

          <div className="space-y-2 pt-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 dark:border-[#1A2035] dark:hover:border-[#2D364F] bg-slate-50/50 hover:bg-slate-100 dark:bg-[#0B0F19]/50 dark:hover:bg-[#0E121E]/80 transition-all flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-semibold group"
              >
                <span className="truncate pr-2">{q}</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-600/5 dark:bg-[#00E5FF]/5 border border-blue-600/10 dark:border-[#00E5FF]/10 text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed space-y-2">
          <div className="flex items-center space-x-1.5 text-blue-600 dark:text-[#00E5FF]">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Compliance Notice</span>
          </div>
          <p>
            EQUITY.AI runs probability-based research algorithms. It does not provide guaranteed returns, buy/sell mandates, or retail investment advisory actions.
          </p>
        </div>
      </div>

      {/* Main Conversational Terminal Window */}
      <div className="lg:col-span-3 bg-white border border-slate-200 dark:bg-[#0E121E]/60 dark:border-[#1E2538] rounded-2xl flex flex-col h-[640px] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4]"></div>
        
        {/* Terminal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E2538]/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-blue-600/10 dark:bg-[#00E5FF]/10 text-blue-600 dark:text-[#00E5FF] rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">AI Stock Research Chat</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conversational RAG Node Active</p>
            </div>
          </div>
        </div>

        {/* Message Feeds */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex items-start space-x-4 max-w-[85%] ${msg.role === 'user' ? 'self-end ml-auto flex-row-reverse space-x-reverse' : ''}`}
            >
              <div className={`p-2.5 rounded-xl border flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-slate-100 border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] text-slate-700 dark:text-slate-350'}`}>
                {msg.role === 'user' ? <Search className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />}
              </div>

              <div className="space-y-3">
                <div className={`p-4 rounded-2xl border leading-relaxed text-xs shadow-sm ${msg.role === 'user' ? 'bg-blue-600/5 border-blue-600/10 text-slate-800 dark:bg-[#00E5FF]/5 dark:border-[#00E5FF]/10 dark:text-slate-200 font-bold' : 'bg-slate-50/50 border-slate-200/60 dark:bg-[#0B0F19]/45 dark:border-[#1E2538]/70 dark:text-slate-300 font-semibold'}`}>
                  {renderFormattedText(msg.text)}
                </div>

                {/* Cited Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pl-2 space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Cited Sources:</span>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, srcIdx) => (
                        <div 
                          key={srcIdx} 
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-[#0F1322] border border-slate-200 dark:border-[#1E2538] hover:border-slate-300 dark:hover:border-[#2D364F] text-[10px] font-bold text-slate-600 dark:text-slate-400 transition-colors flex items-center space-x-1 cursor-default"
                          title={src.content}
                        >
                          <span className="truncate max-w-[150px]">{src.metadata.source_file}</span>
                          <span className="opacity-60">• p.{src.metadata.page_number}</span>
                          <span className="text-blue-600 dark:text-[#00E5FF] opacity-90">({Math.round(src.score * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest animate-pulse pl-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-[#00E5FF]" />
              <span>Formulating Structured Investment Thesis...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }} 
          className="p-4 border-t border-slate-200 dark:border-[#1E2538] flex items-center space-x-3 bg-slate-50/50 dark:bg-[#0B0F19]/20"
        >
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask 'Analyze Netweb' or 'Compare SJS vs Aeroflex'..." 
            className="flex-grow bg-white border border-slate-200 dark:bg-[#0B0F19] dark:border-[#1E2538] focus:border-blue-600 dark:focus:border-[#00E5FF] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors font-semibold shadow-inner"
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
