import React from 'react';
import { Network, ArrowRightLeft, DollarSign, Layers, Zap, AlertCircle, ShieldAlert } from 'lucide-react';

export default function StatsHeader({ summary, nodes, edges, verdict }) {
  if (!summary) return null;

  const rootCount = nodes.filter(n => n.role === 'root').length;
  const muleCount = nodes.filter(n => n.role === 'intermediate' || n.is_mule).length;
  const terminalCount = nodes.filter(n => n.role === 'terminal' || n.is_cash_out).length;

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div className="bg-[#0F172A] border-b border-gray-800 px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-xs shrink-0">
      <div className="flex items-center gap-6 shrink-0">
        {/* Total Traced Volume */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Total Volume Traced</div>
            <div className="font-bold font-mono text-emerald-400 text-sm">{formatCurrency(summary.total_volume_traced)}</div>
          </div>
        </div>

        <div className="w-px h-6 bg-gray-800" />

        {/* Nodes Breakdown */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400">
            <Network className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Graph Nodes Breakdown</div>
            <div className="font-bold font-mono text-white flex items-center gap-1.5 text-xs">
              <span className="text-blue-400">{rootCount} Root</span> •
              <span className="text-amber-400">{muleCount} Mules</span> •
              <span className="text-red-400">{terminalCount} Cash-out</span>
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-gray-800" />

        {/* Layer Breakdown Pills */}
        {verdict?.layer_breakdown && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-md text-purple-400">
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Layer Hierarchy</div>
              <div className="flex items-center gap-1 mt-0.5">
                {Object.entries(verdict.layer_breakdown).map(([layer, count]) => (
                  <span
                    key={layer}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                      layer.includes('Cashout')
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    {layer}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="w-px h-6 bg-gray-800" />

        {/* Unlimited Hops Depth */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-400">
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Sequential Hops</div>
            <div className="font-bold font-mono text-amber-400 text-xs">
              {summary.total_edges} Txs across {summary.max_depth_reached} Hops
            </div>
          </div>
        </div>
      </div>

      {/* Execution Speed */}
      <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded-lg border border-gray-800 shrink-0">
        <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
        <span className="text-[11px] text-gray-400">Query Time:</span>
        <span className="font-mono text-yellow-400 font-bold text-xs">{summary.execution_time_ms} ms</span>
      </div>
    </div>
  );
}
