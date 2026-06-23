import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EQUITY.AI | Premium Stock Market RAG",
  description: "Enterprise stock research and local intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <body className="flex flex-col min-h-screen text-slate-200 bg-[#06080F] font-sans antialiased">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-50"></div>
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none -z-50"></div>

        {/* Global Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-[#1A2035] bg-[#080A10]/75 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* Brand Logo */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-2 group">
                  <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-[#00E5FF] to-[#00F5D4] bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                    EQUITY.AI
                  </span>
                  <span className="bg-[#00E5FF]/10 text-[#00E5FF] text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border border-[#00E5FF]/20 uppercase">
                    RAG
                  </span>
                </Link>
              </div>

              {/* Navigation Links */}
              <nav className="hidden md:flex space-x-8">
                <Link href="/" className="text-sm font-semibold tracking-wide text-slate-400 hover:text-[#00E5FF] hover:glow-cyan transition-all">
                  Dashboard
                </Link>
                <Link href="/screener" className="text-sm font-semibold tracking-wide text-slate-400 hover:text-[#00E5FF] hover:glow-cyan transition-all">
                  Screener
                </Link>
                <Link href="/analysis" className="text-sm font-semibold tracking-wide text-slate-400 hover:text-[#00E5FF] hover:glow-cyan transition-all">
                  AI Analysis
                </Link>
                <Link href="/backtest" className="text-sm font-semibold tracking-wide text-slate-400 hover:text-[#00E5FF] hover:glow-cyan transition-all">
                  Backtester
                </Link>
                <Link href="/watchlist" className="text-sm font-semibold tracking-wide text-slate-400 hover:text-[#00E5FF] hover:glow-cyan transition-all">
                  Watchlists
                </Link>
              </nav>

              {/* Infrastructure Node Indicator */}
              <div className="flex items-center space-x-2.5 bg-[#0F1322] border border-[#1E2538] px-3.5 py-1.5 rounded-full shadow-inner shadow-black/40">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Local Node Connected</span>
              </div>

            </div>
          </div>
        </header>

        {/* Page Content Shell */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-[#121727] bg-[#04060B] py-6 text-center text-xs text-slate-500 font-medium tracking-wide">
          <p>© {new Date().getFullYear()} EQUITY.AI Platform. Local Infrastructure Node: Qwen2.5:14B + Nomic-Embed.</p>
        </footer>
      </body>
    </html>
  );
}
