import React, { useState } from 'react';
import { FileText, ChevronRight, Award, X, Sparkles } from 'lucide-react';
import { Citation } from '../store/chatStore';

interface CitationCardProps {
  citation: Citation;
  index: number;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Confidence color utility
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.7) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (conf >= 0.4) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-brand-400 bg-brand-500/10 border-brand-500/20';
  };

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="glass-panel glass-card-hover border border-slate-800 hover:border-brand-500/30 p-3 rounded-xl flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 border border-brand-500/20 group-hover:bg-brand-600 group-hover:text-white transition-all">
            <span className="text-xs font-bold font-sans">[{index}]</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate pr-2">{citation.filename}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Page {citation.page}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-600"></span>
              <span className="font-medium">Chunk Ref</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {citation.confidence !== 0 && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getConfidenceColor(citation.confidence)}`}>
              <Award size={10} />
              {(citation.confidence * 100).toFixed(0)}% Match
            </span>
          )}
          <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-200 transition-colors" />
        </div>
      </div>

      {/* Expanded Citation Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass-panel-brand rounded-2xl overflow-hidden shadow-glass border border-brand-500/25 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-600/15 text-brand-400 border border-brand-500/20">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Source Citation [{index}]</h3>
                  <p className="text-xs text-slate-400">{citation.filename}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60">Page {citation.page}</span>
                {citation.confidence !== 0 && (
                  <span className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${getConfidenceColor(citation.confidence)}`}>
                    <Sparkles size={11} />
                    Reranker Score: {citation.confidence}
                  </span>
                )}
              </div>
              
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grounding Snippet</span>
                <div className="p-4 rounded-xl bg-dark-900/60 border border-slate-800/80 text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line italic">
                  &ldquo;{citation.snippet}&rdquo;
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-dark-950/60 border-t border-slate-850 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white shadow-glass-brand transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default CitationCard;
