import React, { useState, useEffect } from 'react';
import { Shipment, Disruption } from '../types';
import { analyzeSupplyChainRisks } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ShieldAlert, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  shipments: Shipment[];
  disruptions: Disruption[];
}

export const RiskAnalysis: React.FC<Props> = ({ shipments, disruptions }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const result = await analyzeSupplyChainRisks(shipments, disruptions);
    setAnalysis(result);
    setLoading(false);
  };

  useEffect(() => {
    runAnalysis();
  }, [shipments, disruptions]);

  return (
    <div className="h-full flex flex-col glass-panel p-6 bg-card/40">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-accent" />
          <h2 className="font-serif italic text-lg">AI Risk Intelligence</h2>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={loading}
          className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-accent" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-40 gap-4 opacity-40"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-accent"
                  animate={{ x: [-48, 48] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em]">Analyzing Transit Data...</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest opacity-40">
          <span>System Status</span>
          <span className="text-risk-low">Active Monitoring</span>
        </div>
      </div>
    </div>
  );
};
