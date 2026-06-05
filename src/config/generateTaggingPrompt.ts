import { TagConfig } from '../types/tagTypes';
import { addHash } from './tagSystem';

export function generateTaggingPrompt(tagConfig: TagConfig): string {
  const domainLines = tagConfig.domains
    .filter(d => d.topics.length > 0)
    .map(d => {
      const topics = d.topics
        .map(t => `${addHash(t.name)}${t.description ? `（${t.description}）` : ''}`)
        .join(' ');
      return `- ${addHash(d.name)}${d.description ? `（${d.description}）` : ''}：${topics}`;
    })
    .join('\n');

  const domainNames = tagConfig.domains
    .filter(d => d.topics.length > 0)
    .map(d => addHash(d.name))
    .join(' ');

  const methodNames = tagConfig.methods.map(m => addHash(m.name)).join(' ');
  const methodLines = tagConfig.methods.length > 0
    ? tagConfig.methods.map(m => `- ${addHash(m.name)}${m.description ? `：${m.description}` : ''}`).join('\n')
    : '无';

  return `【固定标签规则】
输出必须包含：润色正文 + 1个领域标签 + 1个对应主题标签 + 0-1个方法标签。

领域：${domainNames}

主题：
${domainLines}

可选方法：${methodNames || '无'}

方法说明：
${methodLines}

判定顺序：
1. 先判断记录所属的人生场景，再选择主题。动作词不能反过来决定领域。
2. 只从上方列出的标签中选择，不要创造新标签，也不要使用已删除或未列出的标签。
3. 领域优先看人生场景；主题必须从所选领域下面的主题中选择。
4. 如果多个领域都可能成立，优先选择最能解释“这条记录为什么重要”的场景。
5. 方法标签只在内容明显包含反思、方法、问题分析或回忆等处理方式时添加；普通日常记录不要勉强添加。
6. 缺少明确场景证据时，选择说明最接近日常、生活或兜底含义的领域和主题。

请直接输出润色后的正文和标签，不要解释判定过程。
注意：普通日常记录只添加领域和主题，不要添加 #记录。`;
}
