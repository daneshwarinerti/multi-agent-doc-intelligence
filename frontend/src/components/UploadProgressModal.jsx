import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, FileText, Upload } from 'lucide-react';

export default function UploadProgressModal({
  isOpen,
  filename,
  step,
  error,
  onClose,
}) {
  if (!isOpen) return null;

  const steps = [
    { key: 1, label: 'Uploading file to server' },
    { key: 2, label: 'Extracting text, tables & page structure' },
    { key: 3, label: 'Creating overlapping embeddings' },
    { key: 4, label: 'Indexing into ChromaDB vector store' },
    { key: 5, label: 'Generating summaries & analytical insights' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Processing Document
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[260px]">
              {filename}
            </p>
          </div>
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Processing Failed</p>
                <p className="mt-1 text-[11px] opacity-90">{error}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Close & Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3 my-2">
            {steps.map((s) => {
              const isDone = step > s.key;
              const isCurrent = step === s.key;

              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-3 p-2.5 rounded-xl text-xs transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium border border-blue-500/30'
                      : isDone
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-600 opacity-60'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex-shrink-0" />
                  )}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
