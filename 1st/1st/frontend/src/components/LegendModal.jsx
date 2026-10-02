import React from 'react';
import { X, ShieldAlert, Cpu, Database, Network, Clock, CheckCircle2 } from 'lucide-react';

export default function LegendModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-gray-200 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
              <ShieldAlert className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Forensic Transaction Tracing Guide</h2>
              <p className="text-xs text-gray-400">AEGIS Engine Architecture &amp; Traversal Rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Core Architecture */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> 1. DuckDB + FastAPI High Performance Engine
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            The dataset consists of <strong className="text-white">2,000,000+ banking transactions</strong>. On server startup, data is indexed in DuckDB with composite b-tree indexes on <code className="text-blue-400">Sender_Account</code>, <code className="text-blue-400">Receiver_Account</code>, and <code className="text-blue-400">Timestamp</code> to deliver sub-millisecond query performance.
          </p>
        </div>

        {/* 15-Minute Hop Rule */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> 2. Strict 15-Minute Hop Traversal Condition
          </h3>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Hop 1:</strong> All outgoing transactions originating directly from the Root Account.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Hop N+1:</strong> For incoming transaction to Node X at <code className="text-amber-300">Timestamp_in</code>, downstream transfer from X to Y must occur where:
                <div className="font-mono text-amber-300 font-bold mt-1 bg-gray-950 p-2 rounded border border-gray-800">
                  Timestamp_out &ge; Timestamp_in AND Timestamp_out &le; Timestamp_in + 15 MINUTES
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Node Roles */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <Network className="w-4 h-4" /> 3. Node Classifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-blue-950/30 border border-blue-800/50 p-3 rounded-xl">
              <div className="font-bold text-blue-400 flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span> Root Account
              </div>
              <p className="text-[11px] text-gray-300">The seed or origin account initiated in the trace search.</p>
            </div>
            <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded-xl">
              <div className="font-bold text-amber-400 flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> Intermediate Mule
              </div>
              <p className="text-[11px] text-gray-300">Pass-through account relaying funds within the 15-min window.</p>
            </div>
            <div className="bg-red-950/30 border border-red-800/50 p-3 rounded-xl">
              <div className="font-bold text-red-400 flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span> Terminal Node
              </div>
              <p className="text-[11px] text-gray-300">Destination account where fund movement stops at the hop limit.</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
