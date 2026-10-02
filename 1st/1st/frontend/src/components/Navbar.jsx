import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Play, Loader2, Sparkles, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Navbar({ onTrace, loading, initialAccount = '', diagnosticSamples = null, verdict, onOpenHelp }) {
  const [accountNumber, setAccountNumber] = useState(initialAccount);

  useEffect(() => {
    if (initialAccount) {
      setAccountNumber(initialAccount);
    }
  }, [initialAccount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accountNumber.trim() || loading) return;
    onTrace(accountNumber.trim());
  };

  const handleDemoClick = (acc) => {
    setAccountNumber(acc);
    onTrace(acc);
  };

  const isVictim = verdict?.verdict_type === 'CONFIRMED VICTIM';
  const isMule = verdict?.verdict_type === 'MULE / SUSPECT';

  return (
    <header className="h-16 bg-[#0F172A]/90 backdrop-blur-md border-b border-gray-800 px-6 flex items-center justify-between gap-4 z-30 shrink-0">
      {/* Left: App Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-lg tracking-tight text-white font-sans">
            Aegis<span className="text-blue-500 font-normal">Trace</span>
          </span>
        </div>
      </div>

      {/* Center: Search Bar & Demo Pills */}
      <div className="flex items-center gap-3 flex-1 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4 text-blue-500" />
            </div>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Search Account ID (e.g. AIRP10000498, HDFC10000336)..."
              className="w-full pl-9 pr-4 py-1.5 bg-gray-900/90 border border-gray-700/70 rounded-xl text-white placeholder-gray-500 font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !accountNumber.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Trace</span>
          </button>
        </form>

        {/* 3 Quick Demo Pills */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
          {diagnosticSamples?.high_risk?.[0] && (
            <button
              type="button"
              onClick={() => handleDemoClick(diagnosticSamples.high_risk[0].account_number)}
              className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 font-mono text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="High Risk Reconverging Mule Ring"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>High Risk</span>
            </button>
          )}

          {diagnosticSamples?.medium_risk?.[0] && (
            <button
              type="button"
              onClick={() => handleDemoClick(diagnosticSamples.medium_risk[0].account_number)}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Medium Risk Multi-Hop Pass-Through"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Medium Risk</span>
            </button>
          )}

          {diagnosticSamples?.low_risk?.[0] && (
            <button
              type="button"
              onClick={() => handleDemoClick(diagnosticSamples.low_risk[0].account_number)}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Low Risk Clean Disbursement"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Low Risk</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Status Verdict Pill & Help Button */}
      <div className="flex items-center gap-3 shrink-0">
        {verdict && (
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono border flex items-center gap-2 shadow-md ${
              isVictim
                ? 'bg-red-950/80 text-red-300 border-red-800/80'
                : isMule
                ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
            }`}
          >
            {isVictim ? (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>High Risk Mule Ring</span>
              </>
            ) : isMule ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Suspicious Activity</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Low Risk / Normal Flow</span>
              </>
            )}
          </div>
        )}

        <button
          onClick={onOpenHelp}
          className="p-1.5 text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 rounded-xl transition-colors cursor-pointer"
          title="Architecture & Legend"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
