import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  FileText,
  RefreshCw,
  Info,
  Shield,
  BookOpen,
  ArrowUp,
  MessageSquare,
  HelpCircle,
  Loader2,
  Copy,
  Check,
  Pencil,
  X,
  ChevronDown,
} from 'lucide-react';
import FormattedMarkdown from './FormattedMarkdown';
import { getApiUrl } from '../api/config';

export default function ChatTab({
  docId,
  currentDoc,
  onOpenSourceViewer,
  onUpdateDebugData,
  isCollapsed = false,
}) {
  const { token } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeCitationPage, setActiveCitationPage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const docName = currentDoc?.file_name || currentDoc?.filename || 'Document.pdf';
  const pageCount = currentDoc?.page_count || 1;
  const activeDocId = currentDoc?.doc_id || docId;

  // Track window scroll position to show/hide Scroll-to-Bottom button
  useEffect(() => {
    const handleScroll = () => {
      const threshold = 180;
      const position = window.innerHeight + window.scrollY;
      const height = document.documentElement.scrollHeight;
      const isBottom = height - position <= threshold;

      isAtBottomRef.current = isBottom;
      setShowScrollBottom(!isBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
    isAtBottomRef.current = true;
  };

  // Load conversation history for current user & document
  useEffect(() => {
    if (!activeDocId || !token) return;

    setHistoryLoading(true);
    fetch(getApiUrl(`/api/conversations/${activeDocId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Fetch conversation failed');
        return res.json();
      })
      .then((data) => {
        setMessages(data.messages || []);
        setHistoryLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load conversation history:', err);
        setMessages([]);
        setHistoryLoading(false);
      });
  }, [activeDocId, token]);

  // Only auto-scroll on new messages IF user was already at bottom!
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendQuestion = async (queryText) => {
    const query = (queryText || input).trim();
    // Strict generation lock & double-click prevention
    if (!query || loading || !activeDocId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsgId = `usr_${Date.now()}`;
    const loadingMsgId = `ai_loading_${Date.now()}`;

    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: query,
    };

    const loadingMsg = {
      id: loadingMsgId,
      sender: 'assistant-loading',
      text: 'Generating answer... searching document & analyzing evidence',
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/ask'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doc_id: activeDocId,
          question: query,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (jErr) {
          throw new Error('Failed to parse API response JSON');
        }

        const text = data.answer || '';
        const isNotFound =
          text.includes('does not provide enough information') ||
          text.includes('does not specify') ||
          text.includes("couldn't find");

        const rawSources = data.sources || [];
        const seenPages = new Set();
        const uniqueSources = [];
        for (const src of rawSources) {
          const p = src.page_num || 1;
          if (!seenPages.has(p)) {
            seenPages.add(p);
            uniqueSources.push({ ...src, page_num: p });
          }
        }

        const finalAiMsg = isNotFound
          ? {
              id: `ai_${Date.now()}`,
              sender: 'assistant-refusal',
              title: 'Information Not Available',
              p1: text,
              p2: 'Strict document grounding policy active.',
            }
          : {
              id: `ai_${Date.now()}`,
              sender: 'assistant',
              text: text,
              sources: uniqueSources,
              is_conversational: Boolean(data.is_conversational || uniqueSources.length === 0),
              has_citations: Boolean(uniqueSources.length > 0),
            };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === loadingMsgId ? finalAiMsg : msg))
        );

        if (onUpdateDebugData) onUpdateDebugData(data);
      } else {
        throw new Error('Ask API call failed');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      const errorMsg = {
        id: `ai_err_${Date.now()}`,
        sender: 'assistant-refusal',
        title: "Processing Issue",
        p1: "Sorry, I couldn't process that question right now. Please try again.",
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === loadingMsgId ? errorMsg : msg))
      );
    } finally {
      setLoading(false);
    }
  };

  const sanitizeMessageText = (text, isConversational) => {
    if (!text) return '';
    let cleaned = text;

    cleaned = cleaned.replace(/(?:\n+|^)\s*(?:\*{0,2}|#{1,6}\s*)(?:Source|Sources|Verified Sources)\*{0,2}[:\s]*[\s\S]*$/gi, '');
    cleaned = cleaned.replace(/\[\s*p{1,2}\.\s*[0-9,\s\-and]+\s*\]/gi, '');
    cleaned = cleaned.replace(/Excerpts from Pages\s+[0-9,\s\-and]+/gi, '');

    if (isConversational) {
      cleaned = cleaned.replace(/^\s*\*{0,2}(?:Answer|Explanation|Source|Sources)\*{0,2}[:\s]*\n?/gim, '');
    }

    return cleaned.strip ? cleaned.strip() : cleaned.trim();
  };

  const handleCopyText = (msgId, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 1500);
  };

  const handleStartEdit = (msgId, initialText) => {
    setEditingMsgId(msgId);
    setEditText(initialText || '');
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditText('');
  };

  const handleConfirmEdit = async (msgId, msgIndex) => {
    const query = editText.trim();
    // Allow editing & saving even while another answer is generating!
    if (!query || !activeDocId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setEditingMsgId(null);
    setEditText('');

    const userMsgId = `usr_${Date.now()}`;
    const loadingMsgId = `ai_loading_${Date.now()}`;

    const newQuestionMsg = {
      id: userMsgId,
      sender: 'user',
      text: query,
    };

    const loadingMsg = {
      id: loadingMsgId,
      sender: 'assistant-loading',
      text: 'Generating answer... searching document & analyzing evidence',
    };

    setMessages((prev) => [...prev.slice(0, msgIndex), newQuestionMsg, loadingMsg]);
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/ask'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doc_id: activeDocId,
          question: query,
          replace_index: msgIndex,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (jErr) {
          throw new Error('Failed to parse API response JSON');
        }

        const text = data.answer || '';
        const isNotFound =
          text.includes('does not provide enough information') ||
          text.includes('does not specify') ||
          text.includes("couldn't find");

        const rawSources = data.sources || [];
        const seenPages = new Set();
        const uniqueSources = [];
        for (const src of rawSources) {
          const p = src.page_num || 1;
          if (!seenPages.has(p)) {
            seenPages.add(p);
            uniqueSources.push({ ...src, page_num: p });
          }
        }

        const finalAiMsg = isNotFound
          ? {
              id: `ai_${Date.now()}`,
              sender: 'assistant-refusal',
              title: 'Information Not Available',
              p1: text,
              p2: 'Strict document grounding policy active.',
            }
          : {
              id: `ai_${Date.now()}`,
              sender: 'assistant',
              text: text,
              sources: uniqueSources,
              is_conversational: Boolean(data.is_conversational || uniqueSources.length === 0),
              has_citations: Boolean(uniqueSources.length > 0),
            };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === loadingMsgId ? finalAiMsg : msg))
        );

        if (onUpdateDebugData) onUpdateDebugData(data);
      } else {
        throw new Error('Ask API call failed');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      const errorMsg = {
        id: `ai_err_${Date.now()}`,
        sender: 'assistant-refusal',
        title: "Processing Issue",
        p1: "Sorry, I couldn't process that question right now. Please try again.",
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === loadingMsgId ? errorMsg : msg))
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleCitationView = (page, snippet) => {
    if (activeCitationPage === page) {
      setActiveCitationPage(null);
    } else {
      setActiveCitationPage(page);
      if (onOpenSourceViewer) {
        onOpenSourceViewer(page, snippet || '');
      }
    }
  };

  const suggestedQuestions = [
    'What is the core summary of this document?',
    'What are the key numerical statistics and metrics mentioned?',
    'What action items or conclusions are highlighted?',
  ];

  return (
    <div className="relative pt-14 w-full min-h-screen bg-[#0B0F17] text-slate-100 select-text pb-64">
      <div className="flex flex-col w-full items-center px-4 sm:px-6">
        <div className="w-full max-w-3xl flex flex-col gap-6 pt-4">
          {/* SINGLE PERSISTENT DOCUMENT CONTEXT HEADER (Does NOT repeat per question) */}
          <div className="flex items-center justify-between py-2 px-4 bg-surface-container-lowest rounded-xl border border-surface-container-high/70 text-xs shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] text-secondary uppercase tracking-wider">DOCUMENT:</span>
                <span className="font-semibold text-on-surface truncate text-xs">{docName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-secondary shrink-0">
              <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Ready
              </span>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="flex flex-col gap-6">
            {historyLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-secondary text-xs font-mono">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span>Restoring Q&A conversation history...</span>
              </div>
            ) : messages.length === 0 ? (
              /* CLEAN INITIAL EMPTY STATE */
              <div className="py-12 px-6 rounded-2xl bg-surface-container-low/40 border border-dashed border-surface-container-high/60 flex flex-col items-center text-center gap-4 my-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="font-serif text-lg font-semibold text-on-surface">
                    Ask questions about your document
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Submit any question below. Answers are strictly grounded in <strong className="text-on-surface">{docName}</strong> with clickable page citations.
                  </p>
                </div>
              </div>
            ) : (
              /* Render User Questions & AI Answers */
              messages.map((msg, idx) => {
                if (msg.sender === 'user') {
                  const isEditing = editingMsgId === msg.id;

                  return (
                    <div key={msg.id} className="flex justify-end w-full group">
                      <div className="flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%] justify-end w-full">
                        {/* Question Action Icon Buttons (Copy & Edit) */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                            <button
                              onClick={() => handleCopyText(msg.id, msg.text)}
                              title="Copy question"
                              className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-surface-container-high transition-colors"
                            >
                              {copiedMsgId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleStartEdit(msg.id, msg.text)}
                              title="Edit question"
                              className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-surface-container-high transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Question Text Bubble or In-Place Edit Textarea */}
                        {isEditing ? (
                          <div className="flex flex-col gap-2 w-full bg-surface-container-lowest p-3 rounded-2xl border border-primary/50 shadow-md">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleConfirmEdit(msg.id, idx);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              rows={2}
                              className="w-full bg-transparent text-xs text-on-surface focus:outline-none resize-none px-1 pt-0.5"
                            />
                            <div className="flex items-center justify-end gap-2 text-[11px] pt-1">
                              <button
                                onClick={handleCancelEdit}
                                className="px-2.5 py-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmEdit(msg.id, idx)}
                                disabled={!editText.trim()}
                                className="px-3 py-1 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <span>Save & Submit</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-surface-container-high text-on-surface px-4 py-2.5 rounded-2xl rounded-tr-xs text-xs font-medium leading-relaxed">
                            <p>{msg.text}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Generating State: Oval shape containing pulsing ... dots
                if (msg.sender === 'assistant-loading') {
                  return (
                    <div key={msg.id} className="flex items-start gap-3 w-full">
                      <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-surface-container-high border border-surface-container-high/70 shadow-xs">
                        <div className="flex items-center gap-1.5 py-0.5">
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (msg.sender === 'assistant-refusal') {
                  return (
                    <div key={msg.id} className="flex items-start gap-3 w-full">
                      <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 gap-3">
                        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-surface-container-high/70 flex items-start gap-3 text-xs">
                          <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm text-on-surface">{msg.title}</span>
                            <p className="text-on-surface-variant leading-relaxed">{msg.p1}</p>
                            {msg.p2 && <p className="text-secondary text-[11px] leading-relaxed pt-1">{msg.p2}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Standard AI Response (Conversational vs Grounded Document)
                const isConversational = Boolean(msg.is_conversational || !msg.sources || msg.sources.length === 0);
                const cleanedText = sanitizeMessageText(msg.text || msg.intro, isConversational);

                return (
                  <div key={msg.id} className="flex items-start gap-3 w-full group">
                    <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 gap-3 text-xs">
                      <FormattedMarkdown content={cleanedText} />

                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        {/* Verified Sources Pill Row: Render ONLY for grounded document questions */}
                        {!isConversational ? (
                          msg.sources && msg.sources.length > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-secondary">Verified Sources:</span>
                              {Array.from(new Map(msg.sources.map(s => [s.page_num || 1, s])).values())
                                .sort((a, b) => (a.page_num || 0) - (b.page_num || 0))
                                .map((src, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => toggleCitationView(src.page_num, src.text)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-secondary hover:text-on-surface font-mono text-[10px] border border-surface-container-high/60 transition-colors"
                                  >
                                    <BookOpen className="w-3 h-3 text-primary" />
                                    <span>Page {src.page_num || 1}</span>
                                  </button>
                                ))}
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 italic">Source page not available</span>
                          )
                        ) : <div />}

                        {/* Assistant Answer Copy Action Button */}
                        <button
                          onClick={() => handleCopyText(msg.id, cleanedText)}
                          title="Copy answer"
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-surface-container-high transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-[11px] shrink-0"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-mono text-[10px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="font-mono text-[10px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Bottom Clearance Spacer to Prevent Fixed Input Bar Overlap */}
            <div className="h-32 w-full shrink-0" />
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          title="Scroll to latest message"
          className="fixed bottom-24 right-8 z-40 p-2.5 rounded-full bg-[#1C2536] hover:bg-[#242F45] text-primary hover:text-white shadow-2xl border border-[#232D3F] backdrop-blur-md transition-all duration-200 animate-bounce hover:animate-none flex items-center justify-center cursor-pointer"
        >
          <ChevronDown className="w-5 h-5 text-primary" />
        </button>
      )}

      {/* Floating Composer Bar with Strict Generation Lock */}
      <div
        className={`fixed bottom-0 right-0 flex flex-col items-center px-4 pb-4 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/95 to-transparent pt-6 pointer-events-none z-30 select-text transition-all ${
          isCollapsed ? 'left-14' : 'left-64'
        }`}
      >
        <div className="w-full max-w-3xl pointer-events-auto flex flex-col gap-2">
          <div className="w-full bg-surface-container-lowest rounded-2xl p-2.5 shadow-lg border border-surface-container-high/70 flex flex-col gap-2 focus-within:shadow-xl transition-all">
            <textarea
              value={input}
              disabled={loading} // Disabled during active generation (Requirement 17)
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (loading) return; // Strict Enter key lock during generation (Requirement 16)
                  handleSendQuestion();
                }
              }}
              placeholder={
                loading
                  ? 'Generating answer...'
                  : `Ask a question about ${docName}...`
              }
              rows={1}
              className="w-full bg-transparent text-xs text-on-surface placeholder:text-secondary focus:outline-none resize-none px-2 pt-1 max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-secondary px-2 py-0.5 rounded bg-surface-container-low">
                  User Isolated Grounding
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSendQuestion()}
                  disabled={loading || !input.trim()} // Strict Send Button Lock (Requirement 14 & 15)
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="text-center font-mono text-[10px] text-secondary">
            Grounded Q&A: Answers are strictly derived from indexed document excerpts.
          </div>
        </div>
      </div>
    </div>
  );
}
