import React from 'react';

/**
 * FormattedMarkdown Component
 * ----------------------------
 * Precision Markdown & Content Hierarchy Renderer for Nexus AI.
 * 
 * Rules Enforced:
 * 1. Single Unified Subheading Class: ALL subheadings (Program Provider, Target Audience, Format & Commitment,
 *    Additional Benefits, Job Market Growth, Salary Statistics, Network Statistics, Readiness Services, Graduation, etc.)
 *    are rendered through `<h4 className="nexus-subheading">` with 700 bold weight, 18px size, #FFFFFF text color,
 *    24px top margin, and 8px bottom margin. No sub-heading anywhere bypasses it.
 * 2. Single Unified Section Heading Class: ALL main section headings (Section 01 —, Section 02 —, etc.)
 *    are rendered through `<h3 className="nexus-section-heading">` with 24px size, #FFFFFF text color, 32px top margin (LARGEST GAP).
 * 3. Locked 4px Spacing Scale:
 *    - Subheading to Body gap: 8px (mb-2)
 *    - Paragraph / List margin bottom: 16px (mb-4)
 *    - Sub-section top margin before next subheading: 24px (mt-6)
 *    - Section-to-Section transition margin: 32px (mt-8)
 * 4. Zero Raw Control Artifacts: *, **, :*, stray symbol lines, and slashes are stripped cleanly.
 */

// Helper to sanitize inline text and render **bold** strings safely without exposing raw asterisks
function renderCleanInline(text) {
  if (!text || typeof text !== 'string') return null;

  // Pre-clean residual markdown artifacts like ":*", "*", "**" at string boundaries
  let cleaned = text
    .replace(/(\b[a-z]{2,})(iHUB|iHub|IIT|Intellipaat|Page|Module|Section|LPA|CTC|RAG)\b/g, '$1 $2')
    .replace(/(\b[a-zA-Z]{2,})(\d+)/g, '$1 $2')
    .replace(/(\d+)([a-zA-Z]{2,})/g, '$1 $2')
    .replace(/(\bwith)(Intellipaat|iHUB|iHub|IIT|Page)\b/gi, '$1 $2')
    .replace(/(\byear)(in)\b/gi, '$1 $2')
    .replace(/(\brequiring)a\b/gi, '$1 a')
    .replace(/(\bdelivered as)(\d+)/gi, '$1 $2')
    .replace(/(\bsupported on)(Page)\b/gi, '$1 $2')
    .replace(/:\*+$/g, '')
    .replace(/:\*+\s+/g, ': ')
    .replace(/^[\*\•\-\_]+$/g, '')
    .replace(/(\bSECTION\s+\d+)\s*[\/\-\–\—]\s*/gi, '$1: ')
    .replace(/(\bMODULE\s+\d+)\s*[\/\-\–\—]\s*/gi, '$1: ');

  // Parse bold blocks **text**
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const inner = part.slice(2, -2).replace(/:\*+$/g, '').trim();
      // If inner text is longer than 40 characters or starts/contains intro prose phrasing, render as normal text (NOT bold)
      if (
        inner.length > 40 ||
        /\.\s|\?\s|\!\s|,|\bincluding\b|\bprovides\b|\bbased on\b/i.test(inner) ||
        /^(Based|According|The|This|It|We|You|In|Here|Provides)\b/i.test(inner)
      ) {
        return <React.Fragment key={idx}>{inner}</React.Fragment>;
      }
      return (
        <strong key={idx} className="font-semibold text-white">
          {inner}
        </strong>
      );
    }
    // Clean any unclosed or orphan asterisks/tildes
    const safeStr = part.replace(/\*\*/g, '').replace(/\*/g, '').replace(/~~/g, '');
    return <React.Fragment key={idx}>{safeStr}</React.Fragment>;
  });
}

// Known category subheadings
const KNOWN_SUBHEADINGS = [
  'answer',
  'explanation',
  'source',
  'sources',
  'core modules',
  'general datasets & industries',
  'general datasets and industries',
  'key focus projects',
  'applied projects',
  'program provider',
  'target audience',
  'format & commitment',
  'format and commitment',
  'additional benefits',
  'career support',
  'placement & career support',
  'placement and career support',
  'readiness services',
  'graduation',
  'curriculum',
  'eligibility',
  'fees & benefits',
  'fees and benefits',
  'key metrics',
  'key takeaways',
  'strategic themes',
  'action items',
  'placement assistance',
  'capstone projects',
  'faculty & mentors',
  'admission process',
  'pedagogy',
  'job market growth',
  'salary statistics',
  'network statistics',
  'industry outlook',
  'market demand'
];

function isSubheadingText(text) {
  if (!text || typeof text !== 'string') return false;

  const raw = text.trim();
  const clean = raw
    .replace(/^[\•\-\*#]+\s*/, '')
    .replace(/:\*+$/g, '')
    .replace(/:$/, '')
    .replace(/\*\*/g, '')
    .trim();

  if (!clean) return false;

  // Do NOT classify field labels like Program Name, Program Duration, Course Name as subheadings
  if (/^(Program Name|Course Name|Program Duration|Campus Immersion|Campus Immersion Duration|Program Title)\b/i.test(clean)) {
    return false;
  }

  // Intro sentences or prose ending with punctuation / verbs / "including" are PARAGRAPH TEXT, NOT SUBHEADINGS!
  if (
    clean.endsWith('.') ||
    clean.endsWith('?') ||
    clean.endsWith('!') ||
    clean.endsWith(',') ||
    clean.includes('. ') ||
    /^(Based|According|The|This|It|You|They|In|Here|Provides|Offers)\b/i.test(clean) ||
    /\b(provides|includes|offers|consists|covers|requires|delivers|features|contains)\b/i.test(clean)
  ) {
    return false;
  }

  // Check if line starts with a Field Label followed by a colon
  const labelMatch = raw.match(/^(?:\*\*|#+)?\s*([A-Za-z0-9\s\&\,\-\–\—\(\)]+?)(?:\*\*)?\s*:\s*(.*)$/);
  if (labelMatch) {
    const labelTitle = labelMatch[1].replace(/\*\*/g, '').trim();
    if (labelTitle.length > 1 && labelTitle.length < 40) {
      return true;
    }
  }

  // 1. Explicit markdown headings (# Heading) or short bold titles (**Heading**)
  if (raw.startsWith('#') || (raw.startsWith('**') && raw.endsWith('**') && clean.length < 40)) {
    return true;
  }

  // 2. Lines ending with colon (e.g. "Placement & Career Support:")
  if (raw.endsWith(':') || clean.endsWith(':')) {
    return true;
  }

  // 3. Known category keywords (Exact match or with colon)
  const cleanLower = clean.toLowerCase();
  if (KNOWN_SUBHEADINGS.some(k => cleanLower === k || cleanLower === k + ':' || cleanLower.startsWith(k + ':'))) {
    return true;
  }

  return false;
}

// Pre-pass sanitizer: cleans raw text line by line before structural parsing
function preSanitizeContent(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return '';

  // Unpack inline horizontal lists cleanly WITHOUT splitting on hyphens within words (e.g. "one-year", "1-year", "soft-skill", "AI-Based")
  let normalized = rawContent
    .replace(/(\d+\.\s+[^\n]+?)(?=\s+\d+\.\s+)/g, '$1\n')
    .replace(/([^\n])(\s+[\•]\s+)/g, '$1\n$2')
    .replace(/([^\n])(\s+[\-\*]\s+(?=[A-Z0-9"'\•]))/g, '$1\n$2');

  const lines = normalized.split('\n');
  const sanitizedLines = [];

  for (let line of lines) {
    let trimmed = line.trim();

    // Remove stray standalone artifact lines like "-", "**", "*", "_", "~~", ":"
    if (/^[\-\*\•\_\~\:\s]+$/.test(trimmed)) {
      continue;
    }

    // Strip trailing formatting artifacts like ":*", "*", "**"
    trimmed = trimmed.replace(/:\*+$/g, '').replace(/:\s*\*+$/g, '');

    // Format Section and Module titles with a colon separator (e.g. SECTION 01 / Executive Overview -> Section 01: Executive Overview)
    if (/^SECTION\s+\d+/i.test(trimmed) || /^MODULE\s+\d+/i.test(trimmed)) {
      trimmed = trimmed
        .replace(/^SECTION\s+(\d+)\s*[\/\:\-\–\—]+\s*/i, 'Section $1: ')
        .replace(/^MODULE\s+(\d+)\s*[\/\:\-\–\—]+\s*/i, 'Module $1: ');
    }

    // If a line starts with a bullet but matches a Subheading/Category title, STRIP the bullet prefix!
    if (/^[\•\-\*]\s+/.test(trimmed)) {
      const withoutBullet = trimmed.replace(/^[\•\-\*]\s+/, '');
      if (isSubheadingText(withoutBullet)) {
        trimmed = withoutBullet;
      }
    }

    sanitizedLines.push(trimmed);
  }

  return sanitizedLines.join('\n');
}

// Parse markdown table block into structured table element
function renderTable(tableLines) {
  const cleanLines = tableLines.map(l => l.trim()).filter(l => l.startsWith('|'));
  if (cleanLines.length < 2) return null;

  const parseRow = (rowStr) =>
    rowStr
      .split('|')
      .slice(1, -1)
      .map(cell => cell.replace(/:\*+$/g, '').replace(/\*+/g, '').trim());

  const headers = parseRow(cleanLines[0]);
  let startIdx = 1;
  if (cleanLines[1] && cleanLines[1].includes('---')) {
    startIdx = 2;
  }

  const rows = cleanLines.slice(startIdx).map(parseRow);

  return (
    <div key={Math.random()} className="my-4 w-full overflow-x-auto rounded-xl border border-[#232D3F] bg-[#0E131F] shadow-lg">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#151C28] border-b border-[#232D3F] text-slate-300 font-mono">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">
                {renderCleanInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#232D3F]/60 text-slate-200">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[#1C2536]/50 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2.5 font-normal">
                  {renderCleanInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FormattedMarkdown({ content, className = '' }) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Pass 1: Pre-sanitize raw content
  const sanitizedText = preSanitizeContent(content);
  const lines = sanitizedText.split('\n');

  // Pass 2: Classify blocks into structured nodes
  const blocks = [];
  let currentTableLines = [];
  let currentListItems = [];
  let currentListType = null;
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        blocks.push({ type: 'paragraph', content: text });
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      blocks.push({ type: currentListType, items: [...currentListItems] });
      currentListItems = [];
      currentListType = null;
    }
  };

  const flushTable = () => {
    if (currentTableLines.length > 0) {
      blocks.push({ type: 'table', lines: [...currentTableLines] });
      currentTableLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table Detection
    if (trimmed.startsWith('|')) {
      flushParagraph();
      flushList();
      currentTableLines.push(trimmed);
      continue;
    } else if (currentTableLines.length > 0) {
      flushTable();
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // 1. Level 1: Main Section Structural Labels ONLY (Answer, Explanation, Source)
    const cleanHeader = trimmed
      .replace(/^#+\s*/, '')
      .replace(/^\*+\s*/, '')
      .replace(/\*+$/, '')
      .replace(/:\*+$/g, '')
      .replace(/:$/, '')
      .trim();

    if (
      /^(Answer|Explanation|Source|Sources|Verified Sources)$/i.test(cleanHeader) ||
      trimmed.startsWith('# ') ||
      /^Section\s+\d+/i.test(trimmed) ||
      /^SECTION\s+\d+/i.test(trimmed) ||
      /^MODULE\s+\d+/i.test(trimmed) ||
      /^(EXECUTIVE OVERVIEW|FULL BREAKDOWN|EXECUTIVE SUMMARY|DETAILED ANALYSIS)$/i.test(cleanHeader)
    ) {
      flushParagraph();
      flushList();

      let headingText = cleanHeader;
      if (/^Section\s+\d+/i.test(trimmed) || /^SECTION\s+\d+/i.test(trimmed)) {
        headingText = trimmed
          .replace(/^#+\s*/, '')
          .replace(/^SECTION\s+(\d+)\s*[\/\:\-\–\—]+\s*/i, 'Section $1: ')
          .trim();
      }

      blocks.push({ type: 'heading-l1', text: headingText });
      continue;
    }

    // 2. Level 2: Category Headings (## Category Title)
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      const catText = trimmed.replace(/^##+\s*/, '').replace(/\*\*/g, '').replace(/:\*+$/g, '').trim();
      blocks.push({ type: 'heading-l2', text: catText });
      continue;
    }

    // 3. Level 3: Specific Item Headings (### Item Title)
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      const itemText = trimmed.replace(/^###+\s*/, '').replace(/\*\*/g, '').replace(/:\*+$/g, '').trim();
      blocks.push({ type: 'heading-l3', text: itemText });
      continue;
    }

    // 4. Subheadings & Field Labels (e.g., "Program Provider: Offered...", "Target Audience: Undergraduates...")
    if (isSubheadingText(trimmed)) {
      flushParagraph();
      flushList();

      // Check if line contains a title label followed by colon description (e.g. "Program Provider: Offered...", "Target Audience: Undergraduates...")
      const labelMatch = trimmed.match(/^(?:\*\*|#+)?\s*([A-Za-z0-9\s\&\,\-\–\—\(\)]+?)(?:\*\*)?\s*:\s*(.*)$/);
      if (labelMatch && labelMatch[2] && labelMatch[2].length > 0) {
        const title = labelMatch[1].replace(/\*\*/g, '').replace(/:\*+$/g, '').trim();
        let desc = labelMatch[2].replace(/:\*+$/g, '').trim();
        if (desc.startsWith('**') && desc.endsWith('**') && desc.length > 4) {
          desc = desc.slice(2, -2).trim();
        }
        // Push Level 2 Category first, followed by description Paragraph
        blocks.push({ type: 'heading-l2', text: title });
        blocks.push({ type: 'paragraph', content: desc });
      } else {
        const cleanSubheading = trimmed
          .replace(/\*\*/g, '')
          .replace(/^[\•\-\*]\s*/, '')
          .replace(/:\*+$/g, '')
          .replace(/:$/, '')
          .trim();
        blocks.push({ type: 'heading-l2', text: cleanSubheading });
      }
      continue;
    }

    // 5. Vertical Bullet Items (- item, * item, • item)
    const bulletMatch = trimmed.match(/^[\•\-\*]\s+(.+)/);
    if (bulletMatch) {
      flushParagraph();
      if (currentListType && currentListType !== 'bullet') {
        flushList();
      }
      currentListType = 'bullet';
      
      const itemContent = bulletMatch[1].replace(/:\*+$/g, '').trim();
      
      // Check if bullet item is a Project entry with Title and Description
      let projMatch = itemContent.match(/^(\*\*[^*]+\*\*)\s*:?\s*(.+)/);
      if (!projMatch) {
        projMatch = itemContent.match(/^([^:]+?):\s*(.+)/);
      }
      if (projMatch && projMatch[1].replace(/\*\*/g, '').length < 75) {
        const cleanTitle = projMatch[1].replace(/\*\*/g, '').replace(/:\*+$/g, '').replace(/:$/, '').trim();
        const cleanDesc = projMatch[2].replace(/^[\*\:\s]+/, '').replace(/:\*+$/g, '').trim();
        currentListItems.push({
          type: 'project',
          title: cleanTitle,
          desc: cleanDesc
        });
      } else {
        currentListItems.push({
          type: 'simple',
          text: itemContent
        });
      }
      continue;
    }

    // 6. Vertical Numbered Items (1. item, 2. item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      flushParagraph();
      if (currentListType && currentListType !== 'numbered') {
        flushList();
      }
      currentListType = 'numbered';
      currentListItems.push({ num: numMatch[1], text: numMatch[2].replace(/:\*+$/g, '').trim() });
      continue;
    }

    if (currentListType) {
      flushList();
    }

    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushTable();

  return (
    <div className={`nexus-content-body max-w-3xl ${className}`}>
      {blocks.map((block, index) => {
        // LEVEL 1: Main Section Structural Labels ONLY (Answer, Explanation, Source)
        if (block.type === 'heading-l1' || block.type === 'heading') {
          const lowerText = (block.text || '').toLowerCase().trim();
          const isBlueLabel = lowerText === 'answer' || lowerText === 'explanation';
          const isMutedLabel = lowerText === 'source' || lowerText === 'sources' || lowerText === 'verified sources';

          return (
            <div key={index} className="mt-5 mb-2 pt-2 border-t border-[#232D3F]/60 first:border-t-0 first:pt-0 first:mt-0">
              <h3 className={`nexus-heading-l1 text-base sm:text-lg font-bold tracking-tight ${
                isBlueLabel ? 'nexus-label-blue' : isMutedLabel ? 'nexus-label-muted text-sm font-semibold' : 'nexus-label-white'
              }`}>
                {renderCleanInline(block.text)}
              </h3>
            </div>
          );
        }

        // LEVEL 2: Inner Category Heading (## Category Title) - Standard White Body Text
        if (block.type === 'heading-l2' || block.type === 'subheading') {
          return (
            <h4 key={index} className="nexus-heading-l2 text-base font-bold text-white mt-4 mb-1.5">
              {renderCleanInline(block.text)}
            </h4>
          );
        }

        // LEVEL 3: Specific Item Heading (### Item Title) - Standard Off-White Body Text
        if (block.type === 'heading-l3') {
          return (
            <h5 key={index} className="nexus-heading-l3 text-sm font-semibold text-slate-200 mt-2.5 mb-1">
              {renderCleanInline(block.text)}
            </h5>
          );
        }

        // Compact Bullet List
        if (block.type === 'bullet') {
          return (
            <ul key={index} className="space-y-3 mt-1.5 mb-3 pl-0.5">
              {block.items.map((item, itemIdx) => {
                if (item.type === 'project') {
                  const cleanTitleText = (item.title || '').replace(/:$/, '').trim();
                  return (
                    <li key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                      <div>
                        <strong className="font-semibold text-white mr-1.5">
                          {renderCleanInline(cleanTitleText)}:
                        </strong>
                        <span className="text-slate-300">
                          {renderCleanInline(item.desc)}
                        </span>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                    <span className="leading-relaxed">{renderCleanInline(item.text)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Compact Numbered List
        if (block.type === 'numbered') {
          return (
            <ol key={index} className="space-y-2 mt-1 mb-4 pl-1">
              {block.items.map((item, itemIdx) => {
                const cleanItemText = (item.text || '').replace(new RegExp('^' + item.num + '[\\.:]\\s*'), '');
                return (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 py-0.5">
                    <span className="font-mono text-xs font-bold text-slate-300 shrink-0 min-w-[20px] pt-0.5">
                      {item.num}.
                    </span>
                    <span className="leading-normal">{renderCleanInline(cleanItemText)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // Tables
        if (block.type === 'table') {
          return renderTable(block.lines);
        }

        // Body Paragraphs
        if (block.type === 'paragraph') {
          return (
            <p key={index} className="nexus-body-text">
              {renderCleanInline(block.content)}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}
