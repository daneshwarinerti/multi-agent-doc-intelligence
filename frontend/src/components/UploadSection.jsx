import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { getApiUrl } from '../api/config';

export default function UploadSection({ onUploadSuccess, currentDoc }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);
      await executeRealUpload(file);
    }
  };

  const executeRealUpload = async (file) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Get bearer token from localStorage
      const token = localStorage.getItem('docintel_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Document processing failed. Please try again.');
      }

      const data = await res.json();
      setIsUploading(false);

      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err) {
      console.error('Ingestion failed:', err);
      setUploadError(err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full pt-14 bg-surface min-h-[calc(100vh-3.5rem)] text-on-surface select-text flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        
        {/* Centered Upload Dropzone Card */}
        <div className="w-full bg-surface-container-lowest rounded-2xl p-10 shadow-xs border border-surface-container-high/70 flex flex-col items-center text-center relative overflow-hidden transition-all group">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            disabled={isUploading}
            className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          />

          <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary mb-4 group-hover:scale-105 transition-transform shadow-xs">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h2 className="font-serif text-2xl font-semibold text-on-surface tracking-tight mb-1">
            {isUploading ? 'Processing Document...' : 'Upload your document'}
          </h2>
          
          <p className="text-xs text-secondary max-w-md mb-6 leading-relaxed">
            PDF, DOCX, or TXT up to 25 MB
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isUploading}
              className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Browse Files</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Compact Uploading Progress Status */}
          {isUploading && (
            <div className="w-full mt-6 p-3 rounded-xl bg-surface-container-low text-xs text-secondary flex items-center justify-center gap-2 border border-surface-container-high/50 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Extracting content, vector indexing, and generating summaries...</span>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {uploadError && (
          <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Helper Subtext */}
        <p className="text-xs text-secondary text-center max-w-md leading-relaxed">
          Upload a document to generate a summary, extract key insights, and ask grounded questions.
        </p>

        {/* Selected Document Status Card (If already present) */}
        {currentDoc && !isUploading && (
          <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-surface-container-high/70 flex items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center text-primary shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0 text-xs">
                <span className="font-semibold text-on-surface truncate text-sm">
                  {currentDoc.file_name || currentDoc.filename}
                </span>
                <span className="text-secondary text-[11px] font-mono mt-0.5">
                  {currentDoc.page_count || 1} pages • Ready
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1 shrink-0">
              <Check className="w-3.5 h-3.5" />
              <span>Ready</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
