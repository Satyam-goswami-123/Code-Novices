import React from 'react';
import { ShieldAlert, Database, Cpu, HelpCircle } from 'lucide-react';

export default function Header({ stats, onOpenHelp }) {
  return (
    <header className="h-16 border-b border-gray-800 bg-[#0F172A]/80 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
          <ShieldAlert className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg tracking-tight text-white font-sans">
              AEGIS<span className="text-blue-500 font-light">TRACE</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-mono">
              2M+ ENGINE
            </span>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">
            Forensic Financial Trail Intelligence &amp; Mule Chain Detection
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {stats && (
          <div className="hidden md:flex items-center gap-6 px-4 py-1.5 bg-gray-900/80 border border-gray-800 rounded-lg text-xs font-mono">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">Dataset:</span>
              <span className="text-emerald-400 font-semibold">2,000,000 Rows</span>
            </div>
            <div className="w-px h-3 bg-gray-800" />
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">Constraint:</span>
              <span className="text-amber-400 font-semibold">&le; 15m Gap</span>
            </div>
          </div>
        )}

        <button
          onClick={onOpenHelp}
          className="p-2 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-lg transition-colors"
          title="System Architecture & Legend"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
