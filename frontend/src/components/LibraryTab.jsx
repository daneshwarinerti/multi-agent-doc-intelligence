import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  ArrowUpRight,
  Download,
  Trash2,
  ShieldCheck,
  Zap,
  Info,
  X,
  RefreshCw,
} from 'lucide-react';

export default function LibraryTab({
  documents = [],
  currentDoc,
  onSelectDoc,
  onOpenUpload,
  onDeleteDoc,
  onOpenSummary,
}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  const filteredDocs = documents.filter((doc) => {
    const title = (doc.file_name || doc.filename || '').toLowerCase();
    const category = (doc.category || '').toLowerCase();
    const matchesQuery = title.includes(searchQuery.toLowerCase()) || category.includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || doc.category === filter;
    return matchesQuery && matchesFilter;
  });

  const promptDeleteDoc = (doc) => {
    setDocToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (docToDelete && onDeleteDoc) {
      onDeleteDoc(docToDelete.doc_id || docToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setDocToDelete(null);
  };

  const totalPages = documents.reduce((acc, d) => acc + (d.page_count || 1), 0);

  return (
    <div className="w-full pt-16 bg-surface min-h-screen text-on-surface">
      <div className="w-full px-8 py-6 flex flex-col gap-6">
        {/* Simplified Header & Selected Document Highlight */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          {/* Main Header Card (8 Cols) */}
          <div className="col-span-12 xl:col-span-8 flex flex-col justify-between bg-surface-container-lowest p-8 rounded-xl shadow-xs relative overflow-hidden border border-surface-container-high/70">
            <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-primary-fixed/30 via-surface-container-low/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none blur-2xl"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-outline text-xs">
                <span className="uppercase tracking-wider font-semibold font-mono">Workspace</span>
                <span className="w-1 h-1 rounded-full bg-outline"></span>
                <span className="text-emerald-500 font-medium font-mono">Ready</span>
              </div>
              <h1 className="font-headline-lg text-3xl font-display text-on-surface tracking-tight mt-1">
                Document Library
              </h1>
              <p className="font-body-lg text-base text-secondary max-w-2xl mt-1">
                Your uploaded documents and their analysis.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-6 pt-6 mt-6 border-t border-surface-container-high/60">
              <div className="flex flex-col">
                <span className="text-xs text-outline font-medium">Documents</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-headline-md font-semibold text-on-surface">{documents.length}</span>
                  <span className="text-xs text-secondary font-medium">Available</span>
                </div>
                <span className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Indexed · Ready
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs text-outline font-medium">Total Pages</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-headline-md font-semibold text-on-surface">{totalPages}</span>
                  <span className="text-xs text-secondary font-medium">Pages</span>
                </div>
                <span className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Source-grounded answers
                </span>
              </div>
            </div>
          </div>

          {/* Selected Document Highlight Card (4 Cols) */}
          <div className="col-span-12 xl:col-span-4 bg-surface-container-low p-8 rounded-xl flex flex-col justify-between shadow-xs border border-surface-container-high/70 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs text-outline uppercase font-semibold">Selected Document</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold tracking-wide border border-emerald-500/30">
                Ready
              </span>
            </div>

            <div className="flex flex-col gap-1 my-4">
              <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                <FileText className="w-4 h-4" />
                <span>Active File</span>
              </div>
              <h2 className="text-xl font-headline-sm font-semibold text-on-surface truncate">
                {currentDoc ? (currentDoc.file_name || currentDoc.filename) : 'No Document Selected'}
              </h2>
              <p className="text-xs text-secondary leading-relaxed mt-1">
                {currentDoc ? `${currentDoc.page_count || 1} pages · Ready for Q&A and analysis` : 'Upload or select a document from the library to view analysis.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container-high/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300 font-medium">Grounded Q&A</span>
              </div>
              <button
                disabled={!currentDoc}
                onClick={() => onOpenSummary && onOpenSummary()}
                className="px-4 py-1.5 rounded bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs inline-flex items-center gap-1 disabled:opacity-40"
              >
                <span>Open</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar & Operations */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-surface-container-high/70">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 absolute left-3 top-3 text-outline pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by title..."
                className="w-full h-10 pl-9 pr-20 rounded bg-surface-container-low text-on-surface placeholder:text-outline text-xs border border-surface-container-high focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: `All Documents (${documents.length})` },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFilter(p.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-primary text-on-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => onOpenUpload && onOpenUpload()}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Upload Document</span>
            </button>
          </div>
        </div>

        {/* Document Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container-high/70 overflow-hidden flex flex-col">
          {/* Table Header */}
          <div className="grid grid-cols-12 px-6 py-3.5 bg-surface-container-low text-outline text-[11px] uppercase tracking-wider font-semibold items-center border-b border-surface-container-high/60">
            <div className="col-span-6">Document</div>
            <div className="col-span-2">Pages</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right pr-2">Action</div>
          </div>

          {/* Table Body Rows */}
          <div className="flex flex-col divide-y divide-surface-container-high/40">
            {filteredDocs.length === 0 ? (
              <div className="p-12 text-center text-secondary">
                <FileText className="w-10 h-10 mx-auto mb-2 text-outline opacity-50" />
                <h3 className="text-base font-semibold text-on-surface">No documents uploaded yet</h3>
                <p className="text-xs text-outline mt-1 max-w-sm mx-auto">
                  Click "+ Upload Document" above to add your first document.
                </p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const filename = doc.file_name || doc.filename || 'Document.pdf';
                const pages = doc.page_count || doc.pages || 1;
                const isSelected = currentDoc && (currentDoc.doc_id === doc.doc_id || currentDoc.file_name === filename);

                return (
                  <div
                    key={doc.doc_id || filename}
                    onClick={() => onSelectDoc && onSelectDoc(doc)}
                    className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-surface-container-low/40 transition-colors cursor-pointer relative ${
                      isSelected ? 'bg-secondary-container/20' : ''
                    }`}
                  >
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}

                    {/* Document Name */}
                    <div className="col-span-6 flex items-center gap-3 pr-4 min-w-0">
                      <div className="w-10 h-10 rounded bg-blue-500/10 text-primary flex items-center justify-center flex-shrink-0 shadow-xs border border-primary/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-on-surface truncate">
                            {filename}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold tracking-wide inline-flex items-center gap-1 border border-primary/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pages */}
                    <div className="col-span-2 flex items-center text-xs text-slate-300 font-medium">
                      <span>{pages} {pages === 1 ? 'page' : 'pages'}</span>
                    </div>

                    {/* Status Indicator */}
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Ready
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDoc && onSelectDoc(doc);
                          onOpenSummary && onOpenSummary();
                        }}
                        className="px-3.5 py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promptDeleteDoc(doc);
                        }}
                        className="p-1.5 rounded hover:bg-error-container text-outline hover:text-error transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-surface-container-high/70">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <button onClick={() => setIsDeleteModalOpen(false)} className="p-1 text-outline hover:text-on-surface rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-on-surface">Delete Document?</h3>
              <p className="text-xs text-secondary mt-1">
                Are you sure you want to delete <strong className="text-on-surface font-medium">{docToDelete?.file_name || docToDelete?.filename || 'document.pdf'}</strong>? This action will remove the document from your library.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded bg-surface-container-low text-on-surface text-xs font-medium">
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded bg-error text-on-error text-xs font-semibold shadow-xs">
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
