import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Share2,
  Check,
} from 'lucide-react';

export default function Navbar({
  activeTab = 'summary',
  setActiveTab,
  currentDoc,
  isCollapsed = false,
}) {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState('');

  const docName = currentDoc?.file_name || currentDoc?.filename || 'No Document Selected';
  const pageCount = currentDoc?.page_count || 1;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    showToast('Share link copied to clipboard');
  };

  const navItems = [
    { id: 'summary', label: 'Summary' },
    { id: 'insights', label: 'Insights' },
    { id: 'qa', label: 'Q&A Chat' },
    { id: 'upload', label: 'Ingest' },
  ];

  return (
    <header
      className={`fixed top-0 right-0 z-40 bg-[#0B0F17]/90 backdrop-blur-xl border-b border-[#232D3F] shadow-md select-none transition-all ${
        isCollapsed ? 'left-14' : 'left-64'
      }`}
    >
      <div className="h-14 w-full px-6 flex items-center justify-between gap-4">
        {/* Left Document Indicator */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-xs md:max-w-md">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs text-slate-200 font-medium truncate" title={docName}>
            {docName}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#151C28] text-slate-300 font-mono font-medium border border-[#232D3F] shrink-0 flex items-center gap-1.5">
            <span>{pageCount} {pageCount === 1 ? 'pg' : 'pgs'}</span>
            <span>·</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Ready</span>
          </span>
        </div>

        {/* Center Nav Switcher Tabs */}
        <nav className="flex items-center gap-1 bg-[#0E131F] p-1 rounded-xl border border-[#232D3F] text-xs">
          {navItems.map((item) => {
            const isActive = activeTab === item.id || (activeTab === 'chat' && item.id === 'qa');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-1.5 rounded-lg transition-all font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-[#151C28] text-white font-semibold shadow-xs border border-[#232D3F]'
                    : 'text-slate-400 hover:text-white hover:bg-[#151C28]/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-[#151C28] hover:text-white transition-colors border border-transparent hover:border-[#232D3F]"
            title="Share Session Link"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium shadow-2xl flex items-center gap-2 transition-all z-50 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </header>
  );
}
