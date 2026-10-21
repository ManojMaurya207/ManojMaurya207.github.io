import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import gradle from 'highlight.js/lib/languages/gradle';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

for (const [name, language] of Object.entries({ bash, cpp, css, gradle, java, javascript, json, kotlin, python, sql, swift, xml, yaml })) {
  hljs.registerLanguage(name, language);
}
hljs.registerAliases(['sh', 'shell'], { languageName: 'bash' });
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'typescript'], { languageName: 'javascript' });
hljs.registerAliases(['html', 'svg'], { languageName: 'xml' });

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

function renderCodeBlock(code, languageName) {
  const language = String(languageName || '').toLowerCase();
  const isPlainText = ['text', 'plaintext', 'txt', 'nohighlight'].includes(language);
  const isKnownLanguage = Boolean(language && hljs.getLanguage(language));
  const highlighted = isKnownLanguage
    ? hljs.highlight(code, { language, ignoreIllegals: true })
    : isPlainText
      ? { value: escapeHtml(code) }
      : hljs.highlightAuto(code);
  const label = (language || highlighted.language || 'text').toUpperCase();
  const className = isKnownLanguage ? language : isPlainText ? '' : highlighted.language;
  const codeHtml = highlighted.value || escapeHtml(code);
  return `<div class="markdown-code-block"><div class="markdown-code-header"><span class="mono">${escapeHtml(label)}</span><button type="button" class="markdown-copy-code" data-copy-code aria-label="Copy code" title="Copy code">Copy</button></div><pre><code${className ? ` class="hljs language-${escapeHtml(className)}"` : ' class="hljs"'}>${codeHtml}</code></pre></div>`;
}

export function setupCodeCopy(root) {
  if (!root || root.dataset.codeCopyEvents) return;
  root.dataset.codeCopyEvents = 'true';
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-copy-code]');
    if (!button || !root.contains(button)) return;
    const code = button.closest('.markdown-code-block')?.querySelector('pre code')?.textContent ?? '';
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = 'Copied!';
      button.setAttribute('aria-label', 'Code copied');
    } catch {
      button.textContent = 'Copy failed';
      button.setAttribute('aria-label', 'Could not copy code');
    }
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.textContent = original;
      button.setAttribute('aria-label', 'Copy code');
    }, 1600);
  });
}

function renderInlineMarkdown(source) {
  const tokens = [];
  const stash = html => `\u0000${tokens.push(html) - 1}\u0000`;
  let text = String(source ?? '');

  text = text.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));
  text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi, (_, alt, url) => stash(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy">`));
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/gi, (_, label, url) => {
    const external = /^https?:/i.test(url);
    return stash(`<a href="${escapeHtml(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`);
  });

  text = escapeHtml(text)
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>');

  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] ?? '');
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function isList(line) { return /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line); }
function isRule(line) { return /^\s*(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line); }
function isFence(line) { return /^\s*```/.test(line); }
function isHeading(line) { return /^\s{0,3}#{1,6}\s+/.test(line); }
function isQuote(line) { return /^\s*>/.test(line); }

export function renderMarkdown(source) {
  const lines = String(source ?? '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }

    const fence = line.match(/^\s*```([\w+-]*)\s*$/);
    if (fence) {
      const code = [];
      index++;
      while (index < lines.length && !isFence(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      blocks.push(renderCodeBlock(code.join('\n'), fence[1]));
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      index++;
      continue;
    }

    if (isRule(line)) { blocks.push('<hr>'); index++; continue; }

    if (isQuote(line)) {
      const quote = [];
      while (index < lines.length && isQuote(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ''));
      blocks.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`);
      continue;
    }

    if (index + 1 < lines.length && line.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(splitTableRow(lines[index++]));
      const head = headers.map(cell => `<th>${renderInlineMarkdown(cell)}</th>`).join('');
      const body = rows.map(row => `<tr>${headers.map((_, column) => `<td>${renderInlineMarkdown(row[column] || '')}</td>`).join('')}</tr>`).join('');
      blocks.push(`<div class="markdown-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }

    if (isList(line)) {
      const first = line.match(/^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/);
      const ordered = Boolean(first?.[2]);
      const type = ordered ? 'ol' : 'ul';
      const start = ordered && Number(first[2]) > 1 ? ` start="${Number(first[2])}"` : '';
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/);
        if (!item || Boolean(item[2]) !== ordered) break;
        const task = item[3].match(/^\[([ xX])\]\s+(.*)$/);
        items.push(task
          ? `<li class="task-list-item"><input type="checkbox" disabled${task[1].trim() ? ' checked' : ''}>${renderInlineMarkdown(task[2])}</li>`
          : `<li>${renderInlineMarkdown(item[3])}</li>`);
        index++;
      }
      blocks.push(`<${type}${start}>${items.join('')}</${type}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index++;
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index];
      const startsTable = index + 1 < lines.length && next.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1]);
      if (isFence(next) || isHeading(next) || isRule(next) || isQuote(next) || isList(next) || startsTable) break;
      paragraph.push(next.trim());
      index++;
    }
    blocks.push(`<p>${paragraph.map(renderInlineMarkdown).join('<br>')}</p>`);
  }

  return blocks.join('\n');
}
