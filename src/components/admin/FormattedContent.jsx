import React from "react";

// Parses inline bold (**text**) and italic (*text*)
function formatInlineText(text) {
  if (!text || typeof text !== "string") return "";
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

// Normalizes inline points inside a single paragraph into distinct lines
// so that bullets (•, -, *, ✓) and numbered sequences (1., 2.) are rendered layer by layer.
function normalizePoints(raw) {
  if (!raw || typeof raw !== "string") return [];
  const rawLines = raw.split(/\r?\n/);
  const result = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push("");
      continue;
    }

    // Check if line contains inline bullet separators (e.g. "Intro • Point 1 • Point 2")
    if (/[•▪▫►▸]/.test(trimmed)) {
      const parts = trimmed.split(/\s+[•▪▫►▸]\s+/);
      if (parts.length > 1) {
        if (parts[0]) {
          const first = parts[0].trim();
          result.push(first);
        }
        for (let p = 1; p < parts.length; p++) {
          const sub = parts[p].trim();
          if (sub) {
            result.push(`• ${sub}`);
          }
        }
        continue;
      }
    }

    // Check if line contains inline numbered points (e.g. "1. First 2. Second 3. Third")
    const numMatches = [...trimmed.matchAll(/(?:^|\s+)(\d+)[\.\)]\s+/g)];
    if (numMatches.length >= 2) {
      const prefix = trimmed.slice(0, numMatches[0].index).trim();
      if (prefix) result.push(prefix);

      for (let m = 0; m < numMatches.length; m++) {
        const cur = numMatches[m];
        const next = numMatches[m + 1];
        const start = cur.index + cur[0].length;
        const end = next ? next.index : trimmed.length;
        const body = trimmed.slice(start, end).trim();
        if (body) {
          result.push(`${cur[1]}. ${body}`);
        }
      }
      continue;
    }

    result.push(trimmed);
  }

  return result;
}

/**
 * FormattedContent
 * Automatically detects paragraphs, numbered points (1., 2.), bullet points (-, *, •, ✓),
 * and headings (e.g. "Highlights:") in description text and renders them layer-by-layer.
 */
export default function FormattedContent({ text, className = "", textColor = "text-slate-700" }) {
  if (!text || typeof text !== "string") return null;

  const lines = normalizePoints(text);
  const blocks = [];
  let currentList = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
    const bulletMatch = trimmed.match(/^([•\-\*\+▪▫✓✔►▸→]|--)\s+(.+)$/);
    const isHeading =
      /^[A-Za-z0-9\s&/'"—–-]{2,45}:$/.test(trimmed) ||
      /^#{1,4}\s+(.+)$/.test(trimmed);

    if (numMatch) {
      if (!currentList || currentList.type !== "numbered") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "numbered", items: [] };
      }
      currentList.items.push({ num: numMatch[1], content: numMatch[2] });
    } else if (bulletMatch) {
      if (!currentList || currentList.type !== "bullet") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "bullet", items: [] };
      }
      currentList.items.push({ icon: bulletMatch[1], content: bulletMatch[2] });
    } else if (isHeading) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      const headingText = trimmed.replace(/^#{1,4}\s+/, "");
      blocks.push({ type: "heading", content: headingText });
    } else {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: "paragraph", content: trimmed });
    }
  }

  if (currentList) blocks.push(currentList);

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          return (
            <h4
              key={idx}
              className="text-xs font-bold uppercase tracking-wider text-slate-800 pt-2 first:pt-0"
            >
              {formatInlineText(block.content)}
            </h4>
          );
        }

        if (block.type === "bullet") {
          return (
            <ul key={idx} className="space-y-2 my-2.5">
              {block.items.map((item, itemIdx) => (
                <li
                  key={itemIdx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/90 hover:bg-slate-100/90 border border-slate-100 transition-colors"
                >
                  <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className={`text-xs sm:text-sm ${textColor} leading-relaxed min-w-0`}>
                    {formatInlineText(item.content)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "numbered") {
          return (
            <ol key={idx} className="space-y-2 my-2.5">
              {block.items.map((item, itemIdx) => (
                <li
                  key={itemIdx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100/70 transition-colors"
                >
                  <span className="px-1.5 py-0.5 rounded-md bg-[#1565C0] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 min-w-[22px]">
                    {String(item.num).padStart(2, "0")}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-800 leading-relaxed min-w-0">
                    {formatInlineText(item.content)}
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className={`text-xs sm:text-sm ${textColor} leading-relaxed`}>
            {formatInlineText(block.content)}
          </p>
        );
      })}
    </div>
  );
}
