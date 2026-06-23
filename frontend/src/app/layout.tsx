import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Stock Market RAG Platform",
  description: "Next-generation Stock Market Research & RAG Analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen text-slate-200 bg-darkBg">
        {/* Navbar */}
        <header className="sticky top-0 z-50 border-b border-darkBorder bg-darkBg/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-cyanAccent to-tealAccent bg-clip-text text-transparent">
                    EQUITY.AI
                  </span>
                  <span className="bg-cyanAccent/10 text-cyanAccent text-[10px] font-semibold px-2 py-0.5 rounded-full border border-cyanAccent/20">
                    RAG
                  </span>
                </Link>
              </div>

              {/* Navigation Links */}
              <nav className="flex space-x-8">
                <Link href="/" className="text-sm font-medium text-slate-300 hover:text-cyanAccent transition-colors">
                  Dashboard
                </Link>
                <Link href="/screener" className="text-sm font-medium text-slate-300 hover:text-cyanAccent transition-colors">
                  Screener
                </Link>
                <Link href="/analysis" className="text-sm font-medium text-slate-300 hover:text-cyanAccent transition-colors">
                  AI Analysis
                </Link>
                <Link href="/backtest" className="text-sm font-medium text-slate-300 hover:text-cyanAccent transition-colors">
                  Backtester
                </Link>
                <Link href="/watchlist" className="text-sm font-medium text-slate-300 hover:text-cyanAccent transition-colors">
                  Watchlists
                </Link>
              </nav>

              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-slate-400 font-medium">Local Node Connected</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-darkBorder bg-[#070A11] py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} EQUITY.AI Platform. Local models: Qwen2.5:14B + Nomic-Embed-Text.</p>
        </footer>
      </body>
    </html>
  );
}
