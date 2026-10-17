"use client";
/**
 * ChatMarkdown — renderer Markdown ringan & aman (tanpa dangerouslySetInnerHTML)
 * untuk jawaban LLM. Mendukung: paragraf, heading, list (bullet / bernomor),
 * tabel GFM, code block, `inline code`, **bold**, *italic*, dan [link](https://).
 */
import React from "react";

const INLINE_RE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\((https?:\/\/[^\s)]+)\))|(\*[^*\s\n][^*\n]*\*)|(_[^_\s\n][^_\n]*_)/g;

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
      out.push(
        <a key={key} href={m[4]} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );
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
          const lang = nl > -1 ? part.slice(0, nl).trim() : "";
          const code = nl > -1 ? part.slice(nl + 1) : part;
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
