import React, { useState, useEffect } from 'react';
import { Search, Play, Sparkles, Loader2, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function SearchBar({ onTrace, loading, initialAccount = '', sampleAccounts = [], diagnosticSamples = null }) {
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

  return (
    <div className="bg-[#111827] border-b border-gray-800 p-4 shrink-0 shadow-lg z-10 space-y-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* Account Number Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5 text-blue-500" />
          </div>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Enter Sender Account Number (e.g. AIRP10000498, HDFC10000336)..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-900 border border-gray-700/70 rounded-xl text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            required
          />
        </div>

        {/* Trace Button */}
        <button
          type="submit"
          disabled={loading || !accountNumber.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Tracing Trail...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Trace Trail</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Test / Demo Scenarios Pill Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 border-t border-gray-800/60">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-400 font-bold flex items-center gap-1 text-[11px] shrink-0 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Risk Scenario Demos:
          </span>

          {diagnosticSamples?.high_risk && diagnosticSamples.high_risk.length > 0 && (
            <button
              type="button"
              onClick={() => handleDemoClick(diagnosticSamples.high_risk[0].account_number)}
              className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reconverging Mule Ring Tree (High Risk >70%)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>🔴 High Risk Demo ({diagnosticSamples.high_risk[0].account_number})</span>
            </button>
          )}

          {diagnosticSamples?.medium_risk && diagnosticSamples.medium_risk.length > 0 && (
            <button
              type="button"
              onClick={() => handleDemoClick(diagnosticSamples.medium_risk[0].account_number)}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Multi-Hop Pass-Through (Medium Risk 35%-70%)"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>🟧 Medium Risk Demo ({diagnosticSamples.medium_risk[0].account_number})</span>
            </button>
          )}

          {diagnosticSamples?.low_risk && diagnosticSamples.low_risk.length > 0 && (
            <button
              type="button"
              onClick={() => handleDemoClick(diagnosticSamples.low_risk[0].account_number)}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Single-Hop / Isolated Disbursement (Low Risk <35%)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>🟢 Low Risk Demo ({diagnosticSamples.low_risk[0].account_number})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
