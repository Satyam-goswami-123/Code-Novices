import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, GitFork, Activity } from 'lucide-react';

export default function VerdictBanner({ verdict, summary }) {
  if (!verdict) return null;

  const isVictim = verdict.verdict_type === 'CONFIRMED VICTIM';
  const isMule = verdict.verdict_type === 'MULE / SUSPECT';
  const isLegit = verdict.verdict_type === 'LEGITIMATE / LOW RISK';

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div
      className={`border-b px-6 py-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shrink-0 transition-all ${
        isVictim
          ? 'bg-gradient-to-r from-blue-950/80 via-slate-900 to-red-950/40 border-blue-800/80'
          : isMule
          ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-red-950/60 border-amber-800/80'
          : 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-gray-900 border-emerald-800/80'
      }`}
    >
      {/* Verdict & Pattern */}
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${
            isVictim
              ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
              : isMule
              ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
              : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
          }`}
        >
          {isVictim ? (
            <ShieldAlert className="w-8 h-8 text-blue-400 animate-pulse" />
          ) : isMule ? (
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          ) : (
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase border shadow-md font-mono ${
                isVictim
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : isMule
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              Verdict: {isLegit ? 'Normal / Low Risk Activity' : verdict.verdict_type}
            </span>
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">
              [Root Account: {summary.root_account}]
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs font-medium text-gray-200">
            <GitFork className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-white">Pattern Detected:</span>
            <span className="text-amber-300 font-mono text-[11px]">{verdict.pattern_detected}</span>
          </div>
        </div>
      </div>

      {/* Confidence Score Meters & Metrics */}
      <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-800">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Victim Probability</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                <div
                  className={`h-full transition-all duration-500 ${isLegit ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${verdict.victim_probability}%` }}
                />
              </div>
              <span className={`font-mono font-bold text-xs ${isLegit ? 'text-emerald-400' : 'text-blue-400'}`}>
                {verdict.victim_probability}%
              </span>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-800 hidden sm:block" />

          <div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Fraud Association</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${verdict.fraud_association}%` }}
                />
              </div>
              <span className="font-mono font-bold text-red-400 text-xs">{verdict.fraud_association}%</span>
            </div>
          </div>
        </div>

        {verdict.flagged_tx_count > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono font-bold shrink-0">
            <Activity className="w-4 h-4 text-red-400 animate-pulse" />
            <span>{verdict.flagged_tx_count} High Risk Txs (&gt;70%)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono font-bold shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>0 High Risk Txs</span>
          </div>
        )}
      </div>
    </div>
  );
}
