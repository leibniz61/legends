import { marked, type TokenizerExtension, type RendererExtension } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Custom extension for @mentions
const mentionExtension: TokenizerExtension & RendererExtension = {
  name: 'mention',
  level: 'inline',
  start(src: string) {
    return src.indexOf('@');
  },
  tokenizer(src: string) {
    // Match @username (3-30 chars, alphanumeric, underscore, hyphen)
    const match = /^@([a-zA-Z0-9_-]{3,30})/.exec(src);
    if (match) {
      return {
        type: 'mention',
        raw: match[0],
        username: match[1],
      };
    }
    return undefined;
  },
  renderer(token) {
    const username = (token as unknown as { username: string }).username;
    return `<a href="/u/${username}" class="mention">@${username}</a>`;
  },
};

// Configure marked with mention extension
marked.use({ extensions: [mentionExtension] });

export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  // Sanitize but allow mention links and image sizing
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['class', 'width', 'height'],
  });
}

// Extract @mentions from markdown content
export function extractMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_-]{3,30})/g;
  const matches = [...content.matchAll(mentionRegex)];
  // Return unique usernames (deduplicated)
  return [...new Set(matches.map((m) => m[1]))];
}
