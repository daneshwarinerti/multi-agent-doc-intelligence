import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LibraryTab from './components/LibraryTab';
import UploadSection from './components/UploadSection';
import SummaryTab from './components/SummaryTab';
import InsightsTab from './components/InsightsTab';
import ChatTab from './components/ChatTab';
import DocumentViewer from './components/DocumentViewer';
import DebugPanel from './components/DebugPanel';
import UploadProgressModal from './components/UploadProgressModal';
import { Loader2, UploadCloud } from 'lucide-react';
import { getApiUrl } from './api/config';

function AppContent() {
  const { isAuthenticated, token, loading: authLoading, user } = useAuth();

  const [activeTab, setActiveTab] = useState('summary');
  const [documents, setDocuments] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Viewer State for PDF/Citation inspection
  const [viewerState, setViewerState] = useState({ isOpen: false, page: 3, text: '' });
  const [debugMode, setDebugMode] = useState(false);
  const [latestDebugData, setLatestDebugData] = useState(null);

  // Upload Ingestion Progress Modal
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ step: 1, filename: '', error: null });

  const fetchDocumentsList = async () => {
    if (!token) return;
    try {
      const response = await fetch(getApiUrl('/api/documents'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const userDocs = data.documents || [];
        setDocuments(userDocs);
        if (userDocs.length > 0) {
          setCurrentDoc((prev) => {
            if (!prev) return userDocs[0];
            const exists = userDocs.find((d) => d.doc_id === prev.doc_id);
            return exists || userDocs[0];
          });
        } else {
          setCurrentDoc(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch document list:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchDocumentsList();
    } else {
      setDocuments([]);
      setCurrentDoc(null);
    }
  }, [isAuthenticated, token, user?.user_id]);

  const handleUploadSuccess = (docData) => {
    setCurrentDoc(docData);
    fetchDocumentsList();
    setIsUploading(false);
    setActiveTab('summary');
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document from your account?')) return;
    try {
      const res = await fetch(getApiUrl(`/api/document/${docId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      const updated = documents.filter((d) => d.doc_id !== docId);
      setDocuments(updated);
      if (currentDoc && currentDoc.doc_id === docId) {
        setCurrentDoc(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleOpenSourceViewer = (pageNum, textSnippet) => {
    setViewerState({
      isOpen: true,
      page: pageNum || 3,
      text: textSnippet || '',
    });
  };

  // Auth Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0F17] flex flex-col items-center justify-center text-slate-400 font-sans gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs font-mono">Restoring session & user state...</span>
      </div>
    );
  }

  // Unauthenticated -> Show Login / Signup Screen
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-surface text-on-surface font-sans antialiased flex flex-col select-text">
      {/* Fixed Collapsible Left Sidebar */}
      <Sidebar
        documents={documents}
        currentDoc={currentDoc}
        onSelectDoc={(doc) => {
          setCurrentDoc(doc);
          setActiveTab('summary');
          setIsMobileOpen(false);
        }}
        onOpenUploadModal={() => {
          setActiveTab('upload');
          setIsMobileOpen(false);
        }}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Top Fixed Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentDoc={currentDoc}
        isCollapsed={isSidebarCollapsed}
        onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
      />

      {/* Main View Area Offset by Sidebar */}
      <main className={`flex-1 w-full max-w-full min-w-0 min-h-[calc(100vh-3.5rem)] transition-all pl-0 ${
        isSidebarCollapsed ? 'md:pl-14' : 'md:pl-64'
      }`}>
        {/* Intentional Empty State when No Document is Selected */}
        {(!currentDoc || documents.length === 0) && activeTab !== 'upload' ? (
          <div className="pt-20 px-8 flex flex-col items-center justify-center text-center gap-4 min-h-[70vh]">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary shadow-xs">
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <div className="flex flex-col gap-1 max-w-md">
              <h2 className="font-serif text-2xl font-normal text-on-surface tracking-tight">
                No document selected
              </h2>
              <p className="text-xs text-secondary leading-relaxed">
                Upload or select a document to get started with summaries, key insights, and grounded Q&A.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('upload')}
              className="mt-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>+ Upload Document</span>
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'library' && (
              <LibraryTab
                documents={documents}
                currentDoc={currentDoc}
                onSelectDoc={(doc) => {
                  setCurrentDoc(doc);
                  setActiveTab('summary');
                }}
                onOpenUpload={() => setActiveTab('upload')}
                onDeleteDoc={handleDeleteDoc}
                onOpenSummary={() => setActiveTab('summary')}
              />
            )}

            {activeTab === 'upload' && (
              <UploadSection
                onUploadSuccess={handleUploadSuccess}
                currentDoc={currentDoc}
              />
            )}

            {activeTab === 'summary' && currentDoc && (
              <SummaryTab
                docId={currentDoc?.doc_id}
                currentDoc={currentDoc}
                onOpenSourceViewer={handleOpenSourceViewer}
                onGoToChat={() => setActiveTab('qa')}
              />
            )}

            {activeTab === 'insights' && currentDoc && (
              <InsightsTab
                docId={currentDoc?.doc_id}
                currentDoc={currentDoc}
                onOpenSourceViewer={handleOpenSourceViewer}
                onGoToChat={() => setActiveTab('qa')}
                onGoToUpload={() => setActiveTab('upload')}
              />
            )}

            {(activeTab === 'qa' || activeTab === 'chat') && currentDoc && (
              <ChatTab
                docId={currentDoc?.doc_id}
                currentDoc={currentDoc}
                onOpenSourceViewer={handleOpenSourceViewer}
                onUpdateDebugData={setLatestDebugData}
                isCollapsed={isSidebarCollapsed}
              />
            )}
          </>
        )}
      </main>

      {/* Source Citation Viewer Drawer */}
      {viewerState.isOpen && (
        <DocumentViewer
          docId={currentDoc?.doc_id}
          filename={currentDoc?.file_name || currentDoc?.filename || 'Document.pdf'}
          targetPage={viewerState.page || 1}
          onClose={() => setViewerState({ isOpen: false, page: 1, text: '' })}
        />
      )}

      {/* Developer Debug Mode Panel */}
      {debugMode && (
        <DebugPanel
          debugData={latestDebugData}
          onClose={() => setDebugMode(false)}
        />
      )}

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={isUploading}
        filename={uploadProgress.filename}
        step={uploadProgress.step}
        error={uploadProgress.error}
        onClose={() => setIsUploading(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
