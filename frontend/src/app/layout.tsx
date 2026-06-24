import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Outfit } from "next/font/google";
import ThemeToggle from "./components/ThemeToggle";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EQUITY.AI | Premium Stock Market RAG & AI Intelligence",
  description: "Enterprise-grade stock market research, quantitative filters, and local PDF retrieval engine driven by local LLMs (Qwen2.5 & Nomic-Embed). Optimized for asset allocation, modern portfolio analytics, and financial RAG query resolutions.",
  keywords: [
    "Stock Market RAG", 
    "Equity AI", 
    "Financial LLMs", 
    "Modern Portfolio Theory optimization", 
    "Quantitative screener", 
    "Financial statement RAG search", 
    "Stock intelligence command center", 
    "Asset allocation analyzer"
  ],
  authors: [{ name: "Equity.AI Core Architect" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://equity-ai-rag.local",
    title: "EQUITY.AI | Stock RAG & AI Intelligence Command Center",
    description: "Connect quantitative filters with local reports using local LLMs. Track net value and backtest models.",
    siteName: "Equity.AI Platform",
  },
  twitter: {
    card: "summary_large_image",
    title: "EQUITY.AI | Stock RAG & AI Intelligence",
    description: "Enterprise-grade stock market research and local PDF retrieval engine.",
  },
};

import Sidebar from "./Sidebar";
import NotificationBell from "./components/NotificationBell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured JSON-LD Data for Generative Engine Optimization (GEO) & SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Equity.AI RAG Platform",
    "operatingSystem": "All Platforms",
    "applicationCategory": "FinanceApplication",
    "description": "High-fidelity local intelligence and financial RAG platform designed for quantitative screens, stock comparison, and portfolio optimization via Modern Portfolio Theory.",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Natural Language stock database querying via RAG Chat",
      "Quantitative metric filter screener",
      "MPT portfolio optimization and Sharpe weighing",
      "Yahoo Finance ticker price and metric synchronization",
      "Audit trail operations center"
    ]
  };

  return (
    <html lang="en" className={`${outfit.variable}`} suppressHydrationWarning>
      <head>
        {/* Structured Data for Generative Engine Discovery */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* FOUC Prevention script for theme class loading */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body suppressHydrationWarning className="flex text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#06080F] font-sans antialiased transition-colors duration-200 min-h-screen">
        <Sidebar />
        
        <div className="flex-grow flex flex-col min-h-screen overflow-y-auto">
          {/* Global Navigation Header */}
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 dark:border-[#1A2035] dark:bg-[#080A10]/75 backdrop-blur-md transition-colors duration-200 shadow-sm">
            <div className="px-8">
              <div className="flex items-center justify-between h-16">
                
                {/* Brand Logo */}
                <div className="flex items-center">
                  <Link href="/" className="flex items-center space-x-2 group">
                    <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#00F5D4] bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                      EQUITY.AI
                    </span>
                    <span className="bg-blue-600/10 text-blue-600 dark:bg-[#00E5FF]/10 dark:text-[#00E5FF] text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border border-blue-600/20 dark:border-[#00E5FF]/20 uppercase">
                      RAG
                    </span>
                  </Link>
                </div>

                {/* Right: Theme Toggle & Node Status */}
                <div className="flex items-center space-x-4">
                  {/* Infrastructure Node Indicator */}
                  <div className="hidden sm:flex items-center space-x-2.5 bg-slate-100 dark:bg-[#0F1322] border border-slate-200 dark:border-[#1E2538] px-3.5 py-1.5 rounded-full shadow-inner">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">Node Connected</span>
                  </div>

                  {/* Notification Bell Dropdown */}
                  <NotificationBell />

                  {/* Theme Toggle Button */}
                  <ThemeToggle />
                </div>


              </div>
            </div>
          </header>

          {/* Page Content Shell */}
          <main className="flex-grow px-8 py-8 relative">
            {children}
          </main>

          {/* Global Footer */}
          <footer className="border-t border-slate-200 dark:border-[#121727] bg-white dark:bg-[#04060B] py-6 text-center text-xs text-slate-500 font-medium tracking-wide transition-colors duration-200">
            <p>© {new Date().getFullYear()} EQUITY.AI Platform. Local Infrastructure Node: Qwen2.5:14B + Nomic-Embed.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}

