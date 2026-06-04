import { TAG_SYSTEM } from '../config/tags';

const KNOWN_TAGS = new Set<string>([
  ...TAG_SYSTEM.domain,
  ...TAG_SYSTEM.method,
  ...Object.values(TAG_SYSTEM.capability).flat()
]);

export function parseTagsFromPolished(text: string): { content: string; tags: string[] } {
  const tags: string[] = [];
  const withoutTags = text.replace(/#([\p{L}\p{N}_-]+)/gu, (match, rawTag: string) => {
    const tag = rawTag.trim();
    if (!KNOWN_TAGS.has(tag)) return match;
    if (!tags.includes(tag)) tags.push(tag);
    return '';
  });

  const content = withoutTags
    .replace(/^\s*(内容|润色后|润色结果|标签)\s*[:：]\s*/gm, '')
    .replace(/(^|\s)[*`_~]+(?=\s|$)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    content,
    tags
  };
}

export function hasRequiredPolishTags(tags: string[]): boolean {
  const domain = TAG_SYSTEM.domain.find(tag => tags.includes(tag));
  return Boolean(domain && TAG_SYSTEM.capability[domain].some(tag => tags.includes(tag)));
}
