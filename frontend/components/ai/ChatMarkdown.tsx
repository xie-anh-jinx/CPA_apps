"use client";
/**
 * ChatMarkdown — renderer Markdown ringan & aman (tanpa dangerouslySetInnerHTML)
 * untuk jawaban LLM. Mendukung: paragraf, heading, list (bullet / bernomor),
 * tabel GFM, code block, `inline code`, **bold**, *italic*, dan [link](https://).
 */
import React from "react";
import C3ChatChart from "./C3ChatChart";

const INLINE_RE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\(([^)\s]+)\))|(\*[^*\s\n][^*\n]*\*)|(_[^_\s\n][^_\n]*_)/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const key = `${keyPrefix}-${i++}`;
    const tok = m[0];
    if (m[1]) out.push(<code key={key} className="aic-md-code">{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={key}>{renderInline(tok.slice(2, -2), key)}</strong>);
    else if (m[3]) {
      const label = tok.slice(1, tok.indexOf("]("));
      const href = m[4] || tok.slice(tok.indexOf("](") + 2, -1);
      const isPresentation = /\.html(\?.*)?$/i.test(href) || label.toLowerCase().includes("presentasi");
      const isDownload = !isPresentation && (/\.(pdf|xlsx|csv|zip)(\?.*)?$/i.test(href) || (href.includes("/download/") && !label.toLowerCase().includes("buka")));

      if (isPresentation) {
        out.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="aic-md-presentation-btn font-bold inline-flex items-center gap-2 px-3.5 py-1.5 my-1.5 rounded-lg text-amber-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 border border-amber-500/50 transition-all cursor-pointer text-sm shadow-md hover:shadow-lg active:scale-95"
            style={{ textDecoration: "none" }}
            title="Klik untuk membuka slide presentasi interaktif di tab baru"
          >
            <span className="text-base">🖥️</span>
            <span>{label}</span>
            <span className="text-[10px] tracking-wider uppercase bg-amber-900/15 text-amber-950 font-black px-1.5 py-0.5 rounded">SLIDE DECK</span>
          </a>
        );
      } else {
        out.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            download={isDownload ? true : undefined}
            className="aic-md-link font-semibold inline-flex items-center gap-1.5 px-3 py-1 my-1 rounded-md text-sky-500 hover:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all cursor-pointer text-sm shadow-sm"
          >
            {isDownload && <span>📥</span>}
            <span>{label}</span>
          </a>
        );
      }
    } else out.push(<em key={key}>{renderInline(tok.slice(1, -1), key)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const splitRow = (l: string) =>
  l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

function renderBlocks(text: string, keyPrefix: string): React.ReactNode[] {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let k = 0;
  const key = () => `${keyPrefix}-b${k++}`;

  const flushPara = () => {
    if (!para.length) return;
    const kk = key();
    blocks.push(
      <p key={kk}>
        {para.map((l, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(l, `${kk}-${i}`)}
          </React.Fragment>
        ))}
      </p>
    );
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      flushPara();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      const kk = key();
      blocks.push(
        <div key={kk} className={`aic-md-h aic-md-h${heading[1].length}`}>
          {renderInline(heading[2], kk)}
        </div>
      );
      continue;
    }

    // Tabel GFM
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara();
      const head = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(splitRow(lines[i++]));
      i--;
      const kk = key();
      blocks.push(
        <div key={kk} className="aic-md-table-wrap">
          <table className="aic-md-table">
            <thead>
              <tr>
                {head.map((h, hi) => (
                  <th key={hi}>{renderInline(h, `${kk}-h${hi}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci}>{renderInline(c, `${kk}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // List
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      flushPara();
      const isOrdered = !!ordered;
      const re = isOrdered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*•]\s+(.*)$/;
      const items: string[] = [];
      while (i < lines.length) {
        const m = re.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      i--;
      const kk = key();
      const children = items.map((it, ii) => <li key={ii}>{renderInline(it, `${kk}-${ii}`)}</li>);
      blocks.push(isOrdered ? <ol key={kk}>{children}</ol> : <ul key={kk}>{children}</ul>);
      continue;
    }

    para.push(line);
  }
  flushPara();
  return blocks;
}

export default function ChatMarkdown({ content }: { content: string }) {
  // Pisahkan code fence ``` terlebih dahulu (fence yang belum ditutup tetap dirender saat streaming)
  const parts = content.split(/```/);
  return (
    <div className="aic-md">
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          const nl = part.indexOf("\n");
          const lang = nl > -1 ? part.slice(0, nl).trim().toLowerCase() : "";
          const code = nl > -1 ? part.slice(nl + 1) : part;

          // Render interactive C3.js chart for c3 / c3js code blocks
          if (lang === "c3" || lang === "c3js" || lang === "c3-chart") {
            return <C3ChatChart key={idx} code={code} />;
          }

          return (
            <pre key={idx} className="aic-md-pre" data-lang={lang || undefined}>
              <code>{code.replace(/\n$/, "")}</code>
            </pre>
          );
        }
        return <React.Fragment key={idx}>{renderBlocks(part, `p${idx}`)}</React.Fragment>;
      })}
    </div>
  );
}
