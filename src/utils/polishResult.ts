import { TagConfig } from '../types/tagTypes';
import { getAllTagNames, getDomainTopics, getDomainNames } from '../config/tagSystem';

const LEGACY_IGNORED_TAGS = new Set(['记录']);

export function parseTagsFromPolished(text: string, tagConfig: TagConfig): { content: string; tags: string[] } {
  const known = new Set(getAllTagNames(tagConfig));
  const tags: string[] = [];
  const withoutTags = text.replace(/#([\p{L}\p{N}_-]+)/gu, (match, rawTag: string) => {
    const tag = rawTag.trim();
    if (LEGACY_IGNORED_TAGS.has(tag)) return '';
    if (!known.has(tag)) return match;
    if (!tags.includes(tag)) tags.push(tag);
    return '';
  });

  const content = withoutTags
    .replace(/^\s*(内容|润色后|润色结果|标签)\s*[:：]\s*/gm, '')
    .replace(/(^|\s)[*`_~]+(?=\s|$)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { content, tags };
}

export function hasRequiredPolishTags(tags: string[], tagConfig: TagConfig): boolean {
  const domainNames = getDomainNames(tagConfig);
  const domain = domainNames.find(tag => tags.includes(tag));
  if (!domain) return false;
  const topicNames = getDomainTopics(tagConfig, domain);
  return topicNames.some(tag => tags.includes(tag));
}
