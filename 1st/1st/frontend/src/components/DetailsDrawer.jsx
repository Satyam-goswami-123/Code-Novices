import React, { useState } from 'react';
import { X, Copy, Check, ArrowRight, ShieldAlert, CreditCard, Laptop, Globe, Layers, Activity } from 'lucide-react';

export default function DetailsDrawer({ selectedNode, selectedEdge, nodes, edges, onClose, onSelectNode }) {
  const [copiedText, setCopiedText] = useState('');

  if (!selectedNode && !selectedEdge) return null;

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amt);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  return (
    <aside className="fixed top-16 right-0 bottom-0 w-full md:w-[420px] bg-[#111827]/95 border-l border-gray-800 backdrop-blur-xl flex flex-col z-40 shadow-2xl transition-all duration-300">
      {/* Drawer Header with Close Button */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0F172A]/80 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h2 className="font-bold text-sm text-white">Forensic Details Card</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
          title="Dismiss Drawer (✕)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Node Detail Card */}
        {selectedNode && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-900/90 border border-gray-800 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Account Profile</span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase border ${
                    selectedNode.role === 'root'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : selectedNode.is_cash_out
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : selectedNode.in_degree > 0 && selectedNode.out_degree === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {selectedNode.role === 'root'
                    ? 'ROOT (VICTIM)'
                    : selectedNode.is_cash_out
                    ? 'TERMINAL CASHOUT'
                    : selectedNode.in_degree > 0 && selectedNode.out_degree === 0
                    ? 'CLEAN NODE'
                    : 'INTERMEDIATE MULE'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-mono text-lg font-extrabold text-white">{selectedNode.id}</div>
                  <div className="text-xs text-gray-400 font-mono">IFSC: {selectedNode.ifsc || 'N/A'}</div>
                </div>
                <button
                  onClick={() => handleCopy(selectedNode.id)}
                  className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-xl border border-gray-700 transition-colors"
                  title="Copy Full Account ID"
                >
                  {copiedText === selectedNode.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Received</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                    {formatCurrency(selectedNode.total_received)}
                  </div>
                </div>
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Forwarded</div>
                  <div className="font-mono font-bold text-red-400 text-sm mt-0.5">
                    {formatCurrency(selectedNode.total_sent)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edge Detail Card */}
        {selectedEdge && (
          <div className="space-y-4">
            <div
              className={`p-4 border rounded-2xl space-y-3 shadow-lg ${
                selectedEdge.risk_level === 'HIGH'
                  ? 'bg-red-950/40 border-red-800/60'
                  : selectedEdge.risk_level === 'MEDIUM'
                  ? 'bg-amber-950/40 border-amber-800/60'
                  : 'bg-emerald-950/40 border-emerald-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Transaction Link</span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                    selectedEdge.risk_level === 'HIGH'
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : selectedEdge.risk_level === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {selectedEdge.risk_score}% RISK ({selectedEdge.risk_level})
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-gray-950/70 p-2.5 rounded-xl border border-gray-800/70">
                <button
                  onClick={() => onSelectNode && onSelectNode(nodes.find(n => n.id === selectedEdge.source))}
                  className="hover:underline text-blue-400 font-bold"
                >
                  {selectedEdge.source}
                </button>
                <ArrowRight className="w-4 h-4 text-gray-500" />
                <button
                  onClick={() => onSelectNode && onSelectNode(nodes.find(n => n.id === selectedEdge.target))}
                  className="hover:underline text-emerald-400 font-bold"
                >
                  {selectedEdge.target}
                </button>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="font-mono text-white font-semibold">{selectedEdge.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatCurrency(selectedEdge.amount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Time Delta:</span>
                  <span className="font-mono text-amber-400 font-bold">+{selectedEdge.time_diff_minutes} minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Payment Rail:</span>
                  <span className="font-mono text-purple-400 font-semibold">{selectedEdge.payment_mode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Timestamp:</span>
                  <span className="font-mono text-gray-200">{selectedEdge.timestamp}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Device &amp; IP:</span>
                  <span className="font-mono text-gray-300">{selectedEdge.device_type} ({selectedEdge.ip_address})</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
