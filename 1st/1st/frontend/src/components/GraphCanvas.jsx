import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Plus, Minus, Maximize2, RefreshCw, Camera, Info, Target } from 'lucide-react';

export default function GraphCanvas({ nodes, edges, onSelectNode, onSelectEdge }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  const truncateAccount = (acc) => {
    if (!acc || acc.length <= 10) return acc;
    return `${acc.substring(0, 4)}...${acc.substring(acc.length - 4)}`;
  };

  useEffect(() => {
    if (!containerRef.current || !nodes || nodes.length === 0) return;

    // Build Vis.js Circular Nodes with Glow & Truncated Labels
    const visNodes = new DataSet(
      nodes.map((n) => {
        let bgColor = '#F59E0B'; // Amber for intermediate mules
        let borderColor = '#D97706';
        let nodeSize = 22;
        let roleName = 'INTERMEDIATE MULE';

        if (n.role === 'root') {
          bgColor = '#2563EB'; // Vibrant Blue for root
          borderColor = '#1D4ED8';
          nodeSize = 28;
          roleName = 'QUERIED ROOT (VICTIM)';
        } else if (n.is_cash_out || (n.role === 'terminal' && n.layer_level >= 2)) {
          bgColor = '#EF4444'; // Crimson Red for terminal cash-out
          borderColor = '#DC2626';
          nodeSize = 26;
          roleName = 'TERMINAL CASHOUT NODE';
        } else if (n.in_degree > 0 && n.out_degree === 0 && !n.is_mule) {
          bgColor = '#10B981'; // Emerald Green for clean destination
          borderColor = '#059669';
          nodeSize = 20;
          roleName = 'CLEAN DESTINATION';
        }

        const displayLabel = `${truncateAccount(n.label)}\n(L${n.layer_level})`;

        const titleText = `Account: ${n.id}\nRole: ${roleName}\nLayer: L${n.layer_level}\nReceived: ${formatCurrency(n.total_received)}\nSent: ${formatCurrency(n.total_sent)}`;

        return {
          id: n.id,
          label: displayLabel,
          shape: 'dot',
          size: nodeSize,
          color: {
            background: bgColor,
            border: borderColor,
            highlight: {
              background: '#60A5FA',
              border: '#FFFFFF'
            },
            hover: {
              background: '#93C5FD',
              border: '#FFFFFF'
            }
          },
          borderWidth: 3,
          font: {
            color: '#FFFFFF',
            face: 'Plus Jakarta Sans',
            size: 11,
            bold: true,
            strokeWidth: 4,
            strokeColor: '#0B0F17'
          },
          title: titleText,
          data: n
        };
      })
    );

    // Build Vis.js Curved Edges with Concise "₹Amount • +Gap m" Badges
    const visEdges = new DataSet(
      edges.map((e) => {
        const amountFormatted = formatCurrency(e.amount);
        const timeGapFormatted = e.time_diff_minutes > 0 ? ` • +${e.time_diff_minutes}m` : ' • Hop 1';
        const edgeLabel = `${amountFormatted}${timeGapFormatted}`;

        let edgeColor = '#64748B'; // Muted Slate for low risk (<35%)
        let edgeHighlight = '#94A3B8';
        let edgeWidth = 1.5;

        if (e.risk_level === 'HIGH' || e.risk_score >= 70.0 || e.time_diff_minutes <= 5.0) {
          edgeColor = '#EF4444'; // Red for fast / high-risk hops
          edgeHighlight = '#F87171';
          edgeWidth = 3.0;
        } else if (e.risk_level === 'MEDIUM' || e.risk_score >= 35.0) {
          edgeColor = '#F59E0B'; // Amber for medium risk
          edgeHighlight = '#FBBF24';
          edgeWidth = 2.0;
        }

        const riskFactorsHtml = (e.risk_factors || [])
          .map((rf) => `<li style="margin-bottom: 2px; color: #FCA5A5;">• ${rf}</li>`)
          .join('');

        const tooltipHtml = `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #374151; padding-bottom: 4px; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #60A5FA;">Tx: ${e.id}</span>
              <span style="font-weight: 800; font-size: 11px; padding: 1px 6px; border-radius: 4px; background-color: ${edgeColor}20; color: ${edgeColor}; border: 1px solid ${edgeColor}40;">
                ${e.risk_score}% RISK (${e.risk_level})
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #9CA3AF;">Amount:</span>
              <span style="font-weight: 700; color: #10B981;">${amountFormatted}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #9CA3AF;">Time Delta:</span>
              <span style="font-weight: 700; color: #F59E0B;">+${e.time_diff_minutes} min</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #9CA3AF;">Hop Level:</span>
              <span style="color: #F3F4F6; font-weight: 600;">Hop ${e.hop_level}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #9CA3AF;">Payment Rail:</span>
              <span style="font-weight: 600; color: #A78BFA;">${e.payment_mode}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #9CA3AF;">IP / Device:</span>
              <span style="color: #D1D5DB; font-family: monospace;">${e.ip_address} (${e.device_type})</span>
            </div>
            ${
              riskFactorsHtml
                ? `<div style="margin-top: 6px; font-size: 10px; font-weight: 600; color: #9CA3AF;">
                    Risk Flags:
                    <ul style="margin-top: 2px; padding-left: 0; list-style: none;">${riskFactorsHtml}</ul>
                  </div>`
                : ''
            }
          </div>
        `;

        return {
          id: e.id,
          from: e.source,
          to: e.target,
          label: edgeLabel,
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.85
            }
          },
          color: {
            color: edgeColor,
            highlight: edgeHighlight,
            hover: '#F59E0B'
          },
          width: edgeWidth,
          font: {
            color: '#F9FAFB',
            face: 'JetBrains Mono',
            size: 11,
            strokeWidth: 3,
            strokeColor: '#0B0F17',
            align: 'top'
          },
          title: tooltipHtml,
          smooth: {
            type: 'cubicBezier',
            forceDirection: 'horizontal',
            roundness: 0.4
          },
          data: e
        };
      })
    );

    const options = {
      nodes: {
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.6)',
          size: 12,
          x: 3,
          y: 3
        }
      },
      edges: {
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.4)',
          size: 6
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -70,
          centralGravity: 0.01,
          springLength: 140,
          springConstant: 0.08
        },
        stabilization: {
          enabled: true,
          iterations: 200
        }
      }
    };

    const network = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, options);
    networkRef.current = network;

    // Handle clicks for off-canvas drawer
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0];
        const selectedNodeObj = nodes.find((n) => n.id === clickedNodeId);
        if (selectedNodeObj && onSelectNode) {
          onSelectNode(selectedNodeObj);
        }
      } else if (params.edges.length > 0) {
        const clickedEdgeId = params.edges[0];
        const selectedEdgeObj = edges.find((e) => e.id === clickedEdgeId);
        if (selectedEdgeObj && onSelectEdge) {
          onSelectEdge(selectedEdgeObj);
        }
      }
    });

    return () => {
      network.destroy();
    };
  }, [nodes, edges]);

  const handleZoomIn = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale * 1.3, animation: true });
    }
  };

  const handleZoomOut = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale / 1.3, animation: true });
    }
  };

  const handleFit = () => {
    if (networkRef.current) {
      networkRef.current.fit({ animation: true });
    }
  };

  const handleCenter = () => {
    if (networkRef.current && nodes.length > 0) {
      const rootNode = nodes.find((n) => n.role === 'root') || nodes[0];
      networkRef.current.focus(rootNode.id, { animation: true, scale: 1.0 });
    }
  };

  const togglePhysics = () => {
    if (networkRef.current) {
      const nextState = !physicsEnabled;
      networkRef.current.setOptions({ physics: { enabled: nextState } });
      setPhysicsEnabled(nextState);
    }
  };

  const handleExportPNG = () => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (canvas) {
      const image = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = image;
      a.download = `AegisTrace_${nodes[0]?.id || 'export'}.png`;
      a.click();
    }
  };

  return (
    <div className="relative flex-1 h-full w-full bg-grid-pattern overflow-hidden">
      {/* Vis.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Translucent Control Dock (Bottom-Left) */}
      <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-[#111827]/80 border border-gray-700/60 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl z-20">
        <button
          onClick={handleZoomIn}
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-700/60" />
        <button
          onClick={handleFit}
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors cursor-pointer"
          title="Fit Graph to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleCenter}
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors cursor-pointer"
          title="Center Root Account"
        >
          <Target className="w-4 h-4 text-blue-400" />
        </button>
        <button
          onClick={togglePhysics}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            physicsEnabled ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:bg-gray-800/80'
          }`}
          title={physicsEnabled ? 'Lock Graph Layout' : 'Enable Physics'}
        >
          <RefreshCw className={`w-4 h-4 ${physicsEnabled ? 'animate-spin-slow' : ''}`} />
        </button>
        <button
          onClick={handleExportPNG}
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors cursor-pointer"
          title="Export PNG Screenshot"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Modern Legend Overlay (Bottom-Right) */}
      <div className="absolute bottom-6 right-6 bg-[#111827]/80 border border-gray-700/60 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl z-20 hidden sm:block space-y-2">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400" /> Graph Aesthetics Legend
        </div>
        
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-400 block shadow-sm"></span>
            <span className="text-gray-200 text-[11px] font-medium">Root (Victim)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400 block shadow-sm"></span>
            <span className="text-gray-200 text-[11px] font-medium">Intermediate Mule</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-red-400 block shadow-sm"></span>
            <span className="text-gray-200 text-[11px] font-medium">Terminal Cash-Out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400 block shadow-sm"></span>
            <span className="text-gray-200 text-[11px] font-medium">Clean Node</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] border-t border-gray-800 pt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-red-500 rounded block"></span>
            <span className="text-red-400 font-bold">&le; 5m / High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-amber-500 rounded block"></span>
            <span className="text-amber-400 font-bold">&le; 15m / Medium Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-slate-500 rounded block"></span>
            <span className="text-slate-400 font-bold">Clean Flow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
