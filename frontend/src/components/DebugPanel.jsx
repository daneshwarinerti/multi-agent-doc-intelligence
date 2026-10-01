import React from 'react';
import { X, Bug, Database, Cpu, Clock, Layers } from 'lucide-react';

export default function DebugPanel({ debugData, onClose }) {
  if (!debugData) return null;

  const { question, answer, sources, latency_ms, debug_info } = debugData;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col font-mono text-xs">
      {/* Debug Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-amber-400 uppercase tracking-wider text-xs">
            RAG Developer Debug Inspection
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Debug Stats Bar */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="p-2 bg-slate-900 border border-slate-800 rounded">
          <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-blue-400" />
          <span className="text-slate-400 block text-[10px]">LATENCY</span>
          <span className="font-bold text-blue-300">{latency_ms || 0} ms</span>
        </div>
        <div className="p-2 bg-slate-900 border border-slate-800 rounded">
          <Layers className="w-3.5 h-3.5 mx-auto mb-1 text-purple-400" />
          <span className="text-slate-400 block text-[10px]">RETRIEVED</span>
          <span className="font-bold text-purple-300">{sources?.length || 0} chunks</span>
        </div>
        <div className="p-2 bg-slate-900 border border-slate-800 rounded">
          <Cpu className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
          <span className="text-slate-400 block text-[10px]">MODEL</span>
          <span className="font-bold text-emerald-300 text-[10px] truncate block">
            {debug_info?.model || 'gemini-3.5'}
          </span>
        </div>
      </div>

      {/* Debug Details Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-300">
        {/* User Query */}
        <div>
          <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold block mb-1">
            User Query
          </span>
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-slate-200">
            "{question}"
          </div>
        </div>

        {/* Vector Retrieval Stats */}
        <div>
          <span className="text-[10px] text-purple-400 uppercase tracking-wider font-bold block mb-1">
            Retrieved Chunks & Vector Distance
          </span>
          <div className="space-y-2">
            {sources && sources.length > 0 ? (
              sources.map((src, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-purple-300 border-b border-slate-800/80 pb-1">
                    <span>RANK #{idx + 1} | PAGE {src.page_num || src.page || 1}</span>
                    <span className="text-amber-400 font-bold">
                      distance: {src.distance ?? 0.42}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed mt-1">
                    "{src.text || src.content}"
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic text-[11px]">No vector chunks retrieved.</p>
            )}
          </div>
        </div>

        {/* System Prompt Context */}
        <div>
          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block mb-1">
            Model Answer Response
          </span>
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-slate-300 whitespace-pre-line leading-relaxed">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
