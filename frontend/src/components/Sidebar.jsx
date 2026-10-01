import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Plus,
  FileText,
  MessageSquare,
  FolderOpen,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ChevronUp,
  X,
} from 'lucide-react';

export default function Sidebar({
  documents = [],
  currentDoc,
  onSelectDoc,
  onOpenUploadModal,
  activeTab,
  setActiveTab,
  isCollapsed = false,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
}) {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const userName = user?.name && user.name.toLowerCase() !== user.email?.toLowerCase()
    ? user.name
    : (user?.email ? user.email.split('@')[0] : 'User');

  const avatarText = user?.name && user.name.toLowerCase() !== user.email?.toLowerCase()
    ? user.name.slice(0, 2)
    : (user?.email ? user.email.slice(0, 2) : 'US');

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
        ></div>
      )}

      {/* Desktop Collapsed Bar */}
      {isCollapsed && !isMobileOpen && (
        <aside className="fixed left-0 top-0 h-full w-14 bg-[#0E131F] z-50 hidden md:flex flex-col items-center justify-between py-4 border-r border-[#232D3F] select-none">
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-lg text-slate-400 hover:bg-[#151C28] hover:text-white transition-colors"
              title="Expand Sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="p-2 rounded-lg bg-primary text-white hover:bg-primary-container transition-colors shadow-xs"
              title="New Document"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Full Sidebar (Mobile Overlay & Desktop Sidebar) */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-[#0E131F] z-[60] flex flex-col justify-between py-4 px-3 border-r border-[#232D3F] shadow-xl select-none transition-all duration-300 ${
          isMobileOpen
            ? 'translate-x-0'
            : isCollapsed
            ? '-translate-x-full md:hidden'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg tracking-tight text-white font-semibold">
                Nexus AI
              </span>
            </div>
            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-[#151C28] hover:text-white transition-colors md:hidden"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed && setIsCollapsed(true)}
              className="w-8 h-8 rounded-lg hidden md:flex items-center justify-center text-slate-400 hover:bg-[#151C28] hover:text-white transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

        {/* New Document Button */}
        <div className="px-1">
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#151C28] text-white border border-[#232D3F] shadow-xs hover:bg-[#1C2536] transition-all group"
          >
            <span className="flex items-center gap-2 text-xs font-semibold">
              <Plus className="w-4 h-4 text-primary" />
              New Document
            </span>
            <span className="font-mono text-[10px] text-slate-400 bg-[#0E131F] px-1.5 py-0.5 rounded border border-[#232D3F]">⌘N</span>
          </button>
        </div>

        {/* Real Documents Navigation */}
        <div className="flex flex-col gap-1 px-1">
          <div className="px-2 pt-1 flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Documents
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#151C28] text-slate-300 border border-[#232D3F]">
              {documents.length}
            </span>
          </div>

          <nav className="flex flex-col gap-1 text-xs max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-[#151C28]/40 border border-dashed border-[#232D3F] my-2 text-slate-400 text-[11px]">
                <FileText className="w-5 h-5 mx-auto mb-1 text-slate-500 opacity-60" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              documents.map((doc) => {
                const filename = doc.file_name || doc.filename || 'document.pdf';
                const isSelected = currentDoc && (currentDoc.doc_id === doc.doc_id || currentDoc.file_name === filename);

                return (
                  <button
                    key={doc.doc_id || filename}
                    type="button"
                    onClick={() => onSelectDoc && onSelectDoc(doc)}
                    title={filename}
                    className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left group overflow-hidden ${
                      isSelected
                        ? 'bg-[#151C28] text-white font-medium border border-[#232D3F] shadow-xs'
                        : 'text-slate-400 hover:bg-[#151C28]/60 hover:text-slate-200'
                    }`}
                  >
                    <FileText className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isSelected ? 'text-primary' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-xs font-medium text-slate-200">{filename}</span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <span>{doc.page_count || 1} pgs</span>
                        <span>·</span>
                        <span>{doc.created_at ? String(doc.created_at).slice(0, 10) : 'Ready'}</span>
                      </span>
                    </div>
                  </button>
                );
              })
            )}

            <div className="h-px bg-[#232D3F] my-2"></div>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('chat')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                activeTab === 'chat' || activeTab === 'qa'
                  ? 'bg-[#151C28] text-white font-semibold border border-[#232D3F]'
                  : 'text-slate-400 hover:bg-[#151C28]/60 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="truncate flex-1">Multi-agent Research Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('library')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                activeTab === 'library'
                  ? 'bg-[#151C28] text-white font-semibold border border-[#232D3F]'
                  : 'text-slate-400 hover:bg-[#151C28]/60 hover:text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0 text-slate-400" />
              <span className="truncate flex-1">Document Library</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User Profile Footer Area with Popover Dropdown */}
      <div ref={profileMenuRef} className="relative px-1 pt-2 border-t border-[#232D3F] flex flex-col gap-1.5">
        {/* Profile Popover Menu - Logout appears inside here when clicking username */}
        {showProfileMenu && (
          <div className="absolute bottom-16 left-1 right-1 bg-[#151C28] border border-[#232D3F] rounded-xl shadow-2xl p-2.5 flex flex-col gap-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col px-2.5 py-1.5 bg-[#0E131F] rounded-lg border border-[#232D3F]/60">
              <span className="text-xs font-semibold text-white truncate">
                {userName}
              </span>
            </div>
            <div className="h-px bg-[#232D3F] my-0.5"></div>
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false);
                logout();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* User Profile Row - Click toggles popover menu; NO direct logout button next to username */}
        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-full p-2.5 rounded-xl bg-[#0E131F] border border-[#232D3F] flex items-center justify-between gap-2.5 hover:bg-[#151C28] transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/30 uppercase">
            {avatarText}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs text-slate-200 font-semibold truncate leading-tight group-hover:text-white">
              {userName}
            </span>
          </div>
          <ChevronUp className={`w-4 h-4 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  </>
);
}
