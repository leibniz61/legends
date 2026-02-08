import TurndownService from 'turndown';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Handle Vanilla's quote blocks
turndown.addRule('vanillaQuote', {
  filter: (node) => {
    return node.nodeName === 'BLOCKQUOTE' &&
           (node.classList?.contains('Quote') || node.classList?.contains('UserQuote'));
  },
  replacement: (content) => `> ${content.trim().replace(/\n/g, '\n> ')}\n\n`
});

// Handle Vanilla's spoiler blocks
turndown.addRule('vanillaSpoiler', {
  filter: (node) => {
    return node.nodeName === 'DIV' && node.classList?.contains('Spoiler');
  },
  replacement: (content) => `\n\n**Spoiler:**\n||${content.trim()}||\n\n`
});

// Handle code blocks
turndown.addRule('vanillaCode', {
  filter: (node) => {
    return node.nodeName === 'PRE' ||
           (node.nodeName === 'CODE' && node.parentNode?.nodeName !== 'PRE');
  },
  replacement: (content, node) => {
    if (node.nodeName === 'PRE') {
      return `\n\`\`\`\n${content.trim()}\n\`\`\`\n`;
    }
    return `\`${content}\``;
  }
});

/**
 * Convert Quill Delta JSON to Markdown
 * Quill Delta format: [{"insert":"text","attributes":{...}}, ...]
 */
function quillDeltaToMarkdown(content: string): string {
  try {
    const ops = JSON.parse(content);
    if (!Array.isArray(ops)) return content;

    let markdown = '';

    for (const op of ops) {
      if (typeof op.insert !== 'string') {
        // Handle embeds (images, etc.)
        if (op.insert?.image) {
          markdown += `![image](${op.insert.image})\n`;
        }
        continue;
      }

      let text = op.insert;
      const attrs = op.attributes || {};

      // Apply inline formatting
      if (attrs.bold) text = `**${text}**`;
      if (attrs.italic) text = `*${text}*`;
      if (attrs.strike) text = `~~${text}~~`;
      if (attrs.code) text = `\`${text}\``;
      if (attrs.link) text = `[${text}](${attrs.link})`;

      // Handle block-level formatting (applied to newlines)
      if (text === '\n' && attrs.header) {
        // Previous line should be a header
        const lines = markdown.split('\n');
        const lastLine = lines.pop() || '';
        const prefix = '#'.repeat(attrs.header) + ' ';
        markdown = lines.join('\n') + (lines.length ? '\n' : '') + prefix + lastLine + '\n';
        continue;
      }

      if (text === '\n' && attrs.list) {
        // Previous line should be a list item
        const lines = markdown.split('\n');
        const lastLine = lines.pop() || '';
        const prefix = attrs.list === 'ordered' ? '1. ' : '- ';
        markdown = lines.join('\n') + (lines.length ? '\n' : '') + prefix + lastLine + '\n';
        continue;
      }

      if (text === '\n' && attrs.blockquote) {
        const lines = markdown.split('\n');
        const lastLine = lines.pop() || '';
        markdown = lines.join('\n') + (lines.length ? '\n' : '') + '> ' + lastLine + '\n';
        continue;
      }

      if (text === '\n' && attrs['code-block']) {
        const lines = markdown.split('\n');
        const lastLine = lines.pop() || '';
        markdown = lines.join('\n') + (lines.length ? '\n' : '') + '```\n' + lastLine + '\n```\n';
        continue;
      }

      markdown += text;
    }

    return markdown.trim();
  } catch {
    // Not valid JSON, return as-is
    return content;
  }
}

/**
 * Convert BBCode to HTML (basic conversion for common tags)
 */
function bbcodeToHtml(text: string): string {
  return text
    .replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>')
    .replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>')
    .replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>')
    .replace(/\[s\](.*?)\[\/s\]/gi, '<del>$1</del>')
    .replace(/\[url=([^\]]+)\](.*?)\[\/url\]/gi, '<a href="$1">$2</a>')
    .replace(/\[url\](.*?)\[\/url\]/gi, '<a href="$1">$1</a>')
    .replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" />')
    .replace(/\[quote\](.*?)\[\/quote\]/gis, '<blockquote>$1</blockquote>')
    .replace(/\[quote=([^\]]+)\](.*?)\[\/quote\]/gis, '<blockquote><strong>$1:</strong><br/>$2</blockquote>')
    .replace(/\[code\](.*?)\[\/code\]/gis, '<pre><code>$1</code></pre>')
    .replace(/\[list\](.*?)\[\/list\]/gis, '<ul>$1</ul>')
    .replace(/\[\*\](.*?)(?=\[\*\]|\[\/list\])/gi, '<li>$1</li>')
    .replace(/\[color=([^\]]+)\](.*?)\[\/color\]/gi, '$2') // Strip color tags
    .replace(/\[size=([^\]]+)\](.*?)\[\/size\]/gi, '$2'); // Strip size tags
}

/**
 * Convert Vanilla content to Markdown based on format
 */
export function convertToMarkdown(content: string, format: string): string {
  if (!content) return '';

  const formatLower = format.toLowerCase();

  // Already markdown
  if (formatLower === 'markdown' || formatLower === 'wysiwyg') {
    // Wysiwyg might still have some HTML, so run through turndown
    if (formatLower === 'wysiwyg' || content.includes('<')) {
      return turndown.turndown(content);
    }
    return content;
  }

  // Plain text - just return as-is
  if (formatLower === 'text' || formatLower === 'textex') {
    return content;
  }

  // BBCode - convert to HTML first, then to Markdown
  if (formatLower === 'bbcode') {
    const html = bbcodeToHtml(content);
    return turndown.turndown(html);
  }

  // Rich format is Quill Delta JSON
  if (formatLower === 'rich') {
    // Check if it looks like JSON (Quill Delta)
    if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
      return quillDeltaToMarkdown(content);
    }
    // Otherwise treat as HTML
    return turndown.turndown(content);
  }

  // HTML format - convert via turndown
  if (formatLower === 'html') {
    return turndown.turndown(content);
  }

  // Default: check if it looks like Quill Delta JSON
  if (content.trim().startsWith('[') && content.includes('"insert"')) {
    return quillDeltaToMarkdown(content);
  }

  // Check if it might be HTML
  if (content.includes('<')) {
    return turndown.turndown(content);
  }

  return content;
}

/**
 * Generate sanitized HTML from Markdown
 * Uses the same function as the server
 */
export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml);
}

/**
 * Full conversion pipeline: any format -> markdown -> sanitized HTML
 */
export function convertContent(content: string, format: string): { markdown: string; html: string } {
  const markdown = convertToMarkdown(content, format);
  const html = renderMarkdown(markdown);
  return { markdown, html };
}
