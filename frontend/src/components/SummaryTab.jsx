import React, { useState, useEffect } from 'react';
import {
  FileText,
  BookOpen,
  Copy,
  Download,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import FormattedMarkdown from './FormattedMarkdown';
import { getApiUrl } from '../api/config';

export default function SummaryTab({
  docId,
  currentDoc,
  onOpenSourceViewer,
  onGoToChat,
}) {
  const [mode, setMode] = useState('short'); // 'short' or 'detailed'
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const docName = currentDoc?.file_name || currentDoc?.filename || 'Uploaded Document';
  const pageCount = currentDoc?.page_count || 1;
  const activeDocId = currentDoc?.doc_id || docId;

  useEffect(() => {
    if (!activeDocId) return;

    if (currentDoc?.concise_summary && currentDoc?.detailed_summary) {
      setSummaryData({
        concise_summary: currentDoc.concise_summary,
        detailed_summary: currentDoc.detailed_summary,
      });
      return;
    }

    setLoading(true);
    fetch(getApiUrl(`/api/summary/${activeDocId}`))
      .then((res) => {
        if (!res.ok) throw new Error('Summary fetch failed');
        return res.json();
      })
      .then((data) => {
        setSummaryData({
          concise_summary: data.concise_summary,
          detailed_summary: data.detailed_summary,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch summary:', err);
        setLoading(false);
      });
  }, [activeDocId, currentDoc]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const conciseText = summaryData?.concise_summary || currentDoc?.concise_summary || 'No concise summary available for this document.';
  const detailedText = summaryData?.detailed_summary || currentDoc?.detailed_summary || 'No detailed breakdown available for this document.';

  const currentSummaryText = mode === 'short' ? conciseText : detailedText;

  const copySummaryText = () => {
    const header = `${docName} (${mode === 'short' ? 'Executive Summary' : 'Detailed Breakdown'})\n\n`;
    navigator.clipboard?.writeText(header + currentSummaryText);
    showToast('Summary copied to clipboard');
  };

  const exportText = () => {
    const header = `${docName} (${mode === 'short' ? 'Executive Summary' : 'Detailed Breakdown'})\n\n`;
    const blob = new Blob([header + currentSummaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docName.replace(/\.[^/.]+$/, '')}_${mode}_summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to structure summary text into paragraphs and key highlights
  const renderStructuredSummary = (text, isShort) => {
    if (!text) return null;

    const paragraphs = text.split('\n\n').filter(Boolean);

    return (
      <div className="flex flex-col gap-6">
        {paragraphs.map((p, idx) => {
          const trimmed = p.trim();
          // Detect bullet point blocks
          if (trimmed.includes('•') || trimmed.includes('\n-') || trimmed.startsWith('-')) {
            const lines = trimmed.split('\n').map(l => l.replace(/^[•\-\*\d\.]+\s*/, '').trim()).filter(Boolean);
            return (
              <div key={idx} className="flex flex-col gap-2 pt-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Key Highlights</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {lines.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 bg-[#0E131F]/60 p-2.5 rounded-lg border border-[#232D3F]">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          // Section Header detection for detailed mode
          if (!isShort && (trimmed.startsWith('SECTION') || trimmed.startsWith('MODULE') || trimmed.startsWith('#'))) {
            return (
              <h3 key={idx} className="font-serif text-lg font-semibold text-white tracking-tight border-b border-[#232D3F] pb-1 pt-2">
                {trimmed.replace(/^#+\s*/, '')}
              </h3>
            );
          }

          return (
            <p key={idx} className="text-slate-200 text-sm leading-relaxed">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative pt-14 w-full min-h-screen bg-[#0B0F17] text-slate-100 select-text">
      <div className="w-full flex justify-center px-3 sm:px-6 py-4 sm:py-8">
        <div className="w-full max-w-3xl flex flex-col gap-6 min-w-0">

          {/* Document Header & User-Friendly Status */}
          <header className="flex flex-col gap-2 pb-4 border-b border-[#232D3F]">
            <h1
              className="font-serif text-xl sm:text-3xl font-semibold text-white tracking-tight leading-snug break-words sm:truncate"
              title={docName}
            >
              {docName}
            </h1>

            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 pt-0.5">
              <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready
              </span>
            </div>
          </header>

          {/* Executive Summary Header & Toggle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#232D3F]">
            <div>
              <h2 className="font-serif text-lg sm:text-2xl font-semibold text-white tracking-tight">
                Executive Summary
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                An overview of the key information extracted from your document.
              </p>
            </div>

            {/* Pill Toggle Control */}
            <div className="inline-flex p-1 bg-[#0E131F] rounded-full border border-[#232D3F] text-xs shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMode('short')}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                  mode === 'short'
                    ? 'bg-[#151C28] text-white font-semibold shadow-xs border border-[#232D3F]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Short Summary
              </button>
              <button
                type="button"
                onClick={() => setMode('detailed')}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                  mode === 'detailed'
                    ? 'bg-[#151C28] text-white font-semibold shadow-xs border border-[#232D3F]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Detailed Breakdown
              </button>
            </div>
          </div>

          {/* Elevated Dark Summary Card */}
          <article className="flex flex-col gap-6 w-full min-w-0">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-mono">Loading analysis summary...</span>
              </div>
            ) : (
              <div className="p-4 sm:p-6 md:p-8 rounded-2xl bg-[#151C28] border border-[#232D3F] shadow-xl text-slate-200 text-sm leading-relaxed w-full max-w-full min-w-0 overflow-hidden">
                <FormattedMarkdown content={currentSummaryText} />
              </div>
            )}
          </article>

          {/* Action Footer */}
          <footer className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#232D3F] text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copySummaryText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#151C28] transition-colors border border-transparent hover:border-[#232D3F]"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy summary</span>
              </button>
              <button
                type="button"
                onClick={exportText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#151C28] transition-colors border border-transparent hover:border-[#232D3F]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export as text</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onGoToChat && onGoToChat()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-xs transition-all shadow-md"
            >
              <span>Ask questions in Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </footer>

        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-white text-xs font-medium shadow-2xl flex items-center gap-2 transition-all z-50">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
