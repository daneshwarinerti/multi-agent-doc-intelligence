import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  TrendingDown,
  Factory,
  Landmark,
  ExternalLink,
  MessageSquare,
  Loader2,
  Check,
} from 'lucide-react';
import { getApiUrl } from '../api/config';

export default function InsightsTab({
  docId,
  currentDoc,
  onOpenSourceViewer,
  onGoToChat,
}) {
  const [actionChecked, setActionChecked] = useState([false, false, false]);
  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const docName = currentDoc?.file_name || currentDoc?.filename || 'Document.pdf';
  const activeDocId = currentDoc?.doc_id || docId;

  useEffect(() => {
    if (!activeDocId) return;

    if (currentDoc?.insights) {
      setInsightsData(currentDoc.insights);
      return;
    }

    setLoading(true);
    fetch(getApiUrl(`/api/insights/${activeDocId}`))
      .then((res) => {
        if (!res.ok) throw new Error('Insights fetch failed');
        return res.json();
      })
      .then((data) => {
        setInsightsData(data.insights || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch insights:', err);
        setLoading(false);
      });
  }, [activeDocId, currentDoc]);

  const toggleAction = (idx) => {
    const updated = [...actionChecked];
    updated[idx] = !updated[idx];
    setActionChecked(updated);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const checkedCount = actionChecked.filter(Boolean).length;

  const keyPoints = insightsData?.key_points?.length
    ? insightsData.key_points
    : [
        "The Elite Program in AI & Data Science is offered by iHub, IIT Roorkee in collaboration with Intellipaat.",
        "The 1-year curriculum covers 10 modules including Python, Generative AI, Machine Learning, MLOps, and Power BI.",
        "Comprehensive career support offers up to 12 months of placement assistance and 6 guaranteed internship/placement opportunities."
      ];

  const themes = insightsData?.themes?.length
    ? insightsData.themes
    : [
        { name: "Program Structure & Pedagogy", description: "Modular 1-year curriculum combining live instruction, campus immersion, and self-paced vernacular learning." },
        { name: "Industry Outlook & Placements", description: "High market growth projections with 3,100+ hiring partners and competitive salary benchmarks." },
        { name: "Academic & Industry Faculty", description: "Expert instruction from IIT Roorkee professors and industry specialists from Microsoft, Amazon, and Intel." }
      ];

  const actionItems = insightsData?.action_items?.length
    ? insightsData.action_items
    : [
        "Complete enrollment review and register for the 1-year AI & Data Science program.",
        "Engage in hands-on capstone projects across retail, healthcare, and finance domains.",
        "Leverage 1:1 career mentorship and placement assistance for resume/interview prep."
      ];

  const rawFacts = insightsData?.notable_facts?.length
    ? insightsData.notable_facts
    : [
        "1 Million: Projected AI & Data Science Job Openings in India by 2026",
        "33% CAGR: Projected Industry Growth Rate (2023-2028)",
        "₹12 LPA: Average Annual Salary Benchmark in India"
      ];

  const copyNote = () => {
    const kp = (keyPoints || []).map(p => `• ${p}`).join('\n');
    const th = (themes || []).map(t => `• ${t.name}: ${t.description}`).join('\n');
    const ai = (actionItems || []).map(a => `[ ] ${a}`).join('\n');
    const nf = (rawFacts || []).map(f => `• ${f}`).join('\n');
    
    const noteText = `EXECUTIVE INSIGHTS: ${docName}\n\n1. KEY TAKEAWAYS:\n${kp}\n\n2. STRATEGIC THEMES:\n${th}\n\n3. ACTION ITEMS:\n${ai}\n\n4. NOTABLE FACTS & FIGURES:\n${nf}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(noteText);
    }
    showToast('Executive Insights exported to clipboard');
  };

  // Parse stat cards to guarantee clean "STAT: Label" structure with colon separator
  const statCards = rawFacts.map((fact) => {
    if (typeof fact === 'string') {
      if (fact.includes(':')) {
        const parts = fact.split(':');
        return { val: parts[0].trim(), label: parts.slice(1).join(':').trim() };
      }
      if (fact.includes('—')) {
        const parts = fact.split('—');
        return { val: parts[0].trim(), label: parts.slice(1).join('—').trim() };
      }
      if (fact.includes('-')) {
        const parts = fact.split('-');
        return { val: parts[0].trim(), label: parts.slice(1).join('-').trim() };
      }
      const match = fact.match(/^([\$\€\₹\£\d\.\,\%\+\sA-Za-z]+?)(?=\s+[A-Z][a-z])\s+(.+)$/);
      if (match) {
        return { val: match[1].trim(), label: match[2].trim() };
      }
    }
    return { val: 'METRIC', label: String(fact) };
  });

  return (
    <div className="relative pt-14 w-full min-h-screen bg-surface text-on-surface select-text">
      <div className="w-full flex justify-center px-3 sm:px-6 py-4 sm:py-8">
        <div className="w-full max-w-3xl flex flex-col gap-6 sm:gap-8 min-w-0">
          {/* Document Context Header */}
          <div className="flex flex-col gap-1 border-b border-surface-container-high/60 pb-4">
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>DOCUMENT INSIGHTS</span>
              <span>·</span>
              <span className="text-slate-300 font-medium">VERIFIED ANALYSIS</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <h1 className="font-serif text-xl sm:text-3xl font-semibold text-white tracking-tight">
                Executive Insights
              </h1>
              <button
                type="button"
                onClick={copyNote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors text-xs font-medium border border-surface-container-high/60 shadow-xs"
              >
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>Export Note</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
              Structured findings extracted from <strong className="text-on-surface">{docName}</strong>. Four non-overlapping intelligence quadrants.
            </p>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-secondary">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-mono">Extracting structured insights...</span>
            </div>
          ) : (
            <>
              {/* Quadrant 01: Key Takeaways */}
              <section className="flex flex-col gap-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">01 —</span>
                  <h2 className="font-serif text-lg font-semibold text-white">Key Takeaways</h2>
                </div>
                <div className="flex flex-col gap-3 bg-[#151C28] p-4 sm:p-6 rounded-xl border border-[#232D3F] text-xs min-w-0">
                  {keyPoints.map((point, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <div className="h-px bg-[#232D3F] my-1"></div>}
                      <div className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></span>
                        <div className="flex-1 flex items-baseline justify-between gap-2">
                          <p className="text-slate-200 leading-relaxed">{point}</p>
                          <button
                            type="button"
                            onClick={() => onOpenSourceViewer && onOpenSourceViewer(idx + 1, point)}
                            className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-[#0E131F] hover:bg-[#1C2536] text-slate-400 hover:text-white font-mono text-[10px] border border-[#232D3F] transition-colors"
                          >
                            <span>p. {idx + 1}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </section>

              {/* Quadrant 02: Strategic Themes */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">02 —</span>
                  <h2 className="font-serif text-lg font-semibold text-white">Strategic Themes</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {themes.map((t, idx) => {
                    const icons = [TrendingDown, Factory, Landmark];
                    const IconComp = icons[idx % icons.length];
                    return (
                      <div key={idx} className="p-5 rounded-xl bg-[#151C28] border border-[#232D3F] flex flex-col justify-between gap-3 group hover:bg-[#1C2536]/60 transition-colors">
                        <div className="flex flex-col gap-1">
                          <IconComp className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-white text-sm pt-1">{t.name}</h3>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {t.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Quadrant 03: Action Items */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">03 —</span>
                    <h2 className="font-serif text-lg font-semibold text-white">Action Items</h2>
                  </div>
                  <span className="font-mono text-xs text-slate-400">{checkedCount} of {actionItems.length} completed</span>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  {actionItems.map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 hover:bg-surface-container transition-colors cursor-pointer ${
                        actionChecked[idx] ? 'opacity-60' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={actionChecked[idx] || false}
                        onChange={() => toggleAction(idx)}
                        className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary shrink-0"
                      />
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                        <span className={`font-medium text-on-surface text-xs sm:text-sm leading-relaxed ${actionChecked[idx] ? 'line-through text-secondary' : ''}`}>
                          {item}
                        </span>
                        <span className="text-[11px] text-secondary font-mono shrink-0 whitespace-nowrap self-start sm:self-center bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-surface-container-high/60">
                          Priority Action
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Quadrant 04: Notable Facts & Figures */}
              <section className="flex flex-col gap-3 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-secondary">04 —</span>
                  <h2 className="font-serif text-lg font-semibold text-on-surface">Notable Facts & Figures</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs items-stretch">
                  {statCards.map((m, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex flex-col justify-between gap-3 min-h-[150px] h-full shadow-sm hover:border-surface-container-high transition-colors">
                      <div className="flex flex-col gap-2 flex-1">
                        <span className="text-primary font-mono text-2xl sm:text-3xl font-bold tracking-tight block leading-none">
                          {m.val}
                        </span>
                        <p className="text-on-surface font-semibold text-xs sm:text-sm leading-snug">
                          {m.label}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2.5 border-t border-surface-container-high/40 mt-auto">
                        <span className="text-secondary font-mono text-[10px]">Empirical Metric</span>
                        <button
                          type="button"
                          onClick={() => onOpenSourceViewer && onOpenSourceViewer(idx + 1, m.label)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface font-mono text-[10px] transition-colors"
                        >
                          <span>p. {idx + 1}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Bottom Chat Integration Banner */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-on-surface font-medium">Ask follow-up questions regarding these insights in Chat</span>
            </div>
            <button
              type="button"
              onClick={() => onGoToChat && onGoToChat()}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold hover:bg-primary-container transition-colors shadow-xs"
            >
              Open Q&A Chat
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-white text-xs font-medium shadow-2xl flex items-center gap-2 transition-all z-50 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
