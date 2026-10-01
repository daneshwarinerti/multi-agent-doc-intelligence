import React, { useState, useEffect } from 'react';
import { X, Search, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, Loader2 } from 'lucide-react';
import { getApiUrl } from '../api/config';

export default function DocumentViewer({
  docId,
  filename,
  targetPage = 1,
  highlightText = '',
  onClose,
}) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(targetPage);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    setCurrentPage(targetPage);
  }, [targetPage]);

  useEffect(() => {
    async function fetchChunks() {
      if (!docId) return;
      setLoading(true);
      try {
        const response = await fetch(getApiUrl(`/api/document/${docId}/chunks`));
        if (response.ok) {
          const data = await response.json();
          setChunks(data.chunks || []);
        }
      } catch (err) {
        console.error('Failed to fetch document chunks:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchChunks();
  }, [docId]);

  // Group chunks by page number
  const pageMap = {};
  chunks.forEach((c) => {
    const pageNum = c.page_num || 1;
    if (!pageMap[pageNum]) pageMap[pageNum] = [];
    pageMap[pageNum].push(c);
  });

  const totalPages = Math.max(1, ...Object.keys(pageMap).map(Number));
  const currentPageChunks = pageMap[currentPage] || [];

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-colors">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {filename || 'Document Viewer'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 text-xs">
        {/* Search inside doc */}
        <div className="relative flex-1 max-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search in page..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-md border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
          />
        </div>

        {/* Page Prev/Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs font-semibold px-2">
            {currentPage}/{totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel(Math.max(75, zoomLevel - 15))}
            className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-medium text-slate-400">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))}
            className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Document Page Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs">Loading page content...</p>
          </div>
        ) : currentPageChunks.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No text available for Page {currentPage}.</p>
          </div>
        ) : (
          currentPageChunks.map((chunk, idx) => {
            const isHighlighted = highlightText && chunk.text.includes(highlightText.substring(0, 30));
            return (
              <div
                key={idx}
                className={`p-5 rounded-xl border transition-all shadow-sm ${
                  isHighlighted
                    ? 'bg-amber-500/10 border-amber-500/40 text-slate-900 dark:text-slate-100 ring-2 ring-amber-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                }`}
                style={{ fontSize: `${(zoomLevel / 100) * 14}px` }}
              >
                <div className="flex items-center justify-between mb-2 text-[10px] text-slate-400 font-mono border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <span>CHUNK #{chunk.chunk_index}</span>
                  {isHighlighted && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold rounded uppercase">
                      Cited Evidence Match
                    </span>
                  )}
                </div>
                <p className="leading-relaxed whitespace-pre-line font-sans">
                  {chunk.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
