import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GraphCanvas from './components/GraphCanvas';
import DetailsDrawer from './components/DetailsDrawer';
import LegendModal from './components/LegendModal';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [sampleAccounts, setSampleAccounts] = useState([]);
  const [diagnosticSamples, setDiagnosticSamples] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    fetchSampleAccounts();
    fetchDiagnosticSamples();
    // Default initial trace on AIRP10000498
    handleTrace('AIRP10000498');
  }, []);

  const fetchSampleAccounts = async () => {
    try {
      const res = await fetch('/api/sample-accounts?limit=8');
      if (res.ok) {
        const data = await res.json();
        setSampleAccounts(data);
      }
    } catch (err) {
      console.warn('Failed to fetch sample accounts', err);
    }
  };

  const fetchDiagnosticSamples = async () => {
    try {
      const res = await fetch('/api/diagnostics/sample-accounts');
      if (res.ok) {
        const data = await res.json();
        setDiagnosticSamples(data);
      }
    } catch (err) {
      console.warn('Failed to fetch diagnostic sample accounts', err);
    }
  };

  const handleTrace = async (accountNumber) => {
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setSelectedEdge(null);

    try {
      const res = await fetch('/api/trace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_number: accountNumber,
          max_hops: 25,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned status ${res.status}`);
      }

      const data = await res.json();
      setTraceData(data);
    } catch (err) {
      console.error('Trace error:', err);
      setError(err.message || 'Failed to execute transaction trace');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNode = (node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleSelectEdge = (edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0B0F17] text-white">
      {/* Single Sleek Top Navigation Bar */}
      <Navbar
        onTrace={handleTrace}
        loading={loading}
        initialAccount={traceData?.summary?.root_account || 'AIRP10000498'}
        diagnosticSamples={diagnosticSamples}
        verdict={traceData?.verdict}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Graph-First Viewport Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Error State */}
        {error && (
          <div className="absolute inset-0 bg-[#0B0F17]/90 z-40 flex items-center justify-center p-6">
            <div className="bg-red-950/80 border border-red-800 p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto animate-bounce" />
              <h3 className="text-lg font-bold text-white">Trace Failed</h3>
              <p className="text-xs text-red-200 font-mono">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-[#0B0F17]/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <div className="text-sm font-bold text-white font-mono tracking-wide">
              TRACING TEMPORAL GRAPH TRAIL (&le;15m GAPS)...
            </div>
            <div className="text-xs text-blue-400">Scanning 2,000,000+ indexed transaction records</div>
          </div>
        )}

        {/* Graph Canvas (Occupies ~85% of Viewport) */}
        {traceData && traceData.nodes.length > 0 && (
          <GraphCanvas
            nodes={traceData.nodes}
            edges={traceData.edges}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
          />
        )}

        {/* On-Click Off-Canvas Details Drawer */}
        <DetailsDrawer
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          nodes={traceData?.nodes || []}
          edges={traceData?.edges || []}
          onClose={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
          onSelectNode={handleSelectNode}
        />
      </div>

      {/* Architecture & Legend Help Modal */}
      <LegendModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
