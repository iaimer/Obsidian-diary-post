// AI润色服务

import { hasRequiredPolishTags, parseTagsFromPolished } from '../utils/polishResult';
import {
  DEFAULT_COACH_PROMPT,
  DEFAULT_POLISH_PROMPT,
  normalizePolishPrompt,
  TAGGING_PROMPT
} from '../config/prompts';

interface AIConfig {
  enabled: boolean;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  polishPrompt?: string;
  coachPrompt?: string;
}

// 润色类型
export type PolishType = 'quickNote' | 'reflection' | 'happiness';

interface AITextResponse {
  text: string;
  truncated: boolean;
}

const POLISH_MAX_TOKENS = 2000;
const POLISH_RETRY_INSTRUCTION = `

【重新输出要求】
上一次输出为空、被截断或缺少必选标签。请重新生成，保持简洁，不要输出解释。
第一行只输出 2-3 个标签：#领域 #主题 [#方法]
第二行输出完整润色正文。`;

// 用户控制润色风格，标签判定规则由应用固定附加。
function getPromptByType(_type: PolishType): string {
  let polishPrompt: unknown;
  const saved = localStorage.getItem('diary-ai-config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      polishPrompt = config.polishPrompt;
    } catch {}
  }
  return `${normalizePolishPrompt(polishPrompt)}\n\n${TAGGING_PROMPT}`;
}

// 获取教练提示词
function getCoachPrompt(): string {
  const saved = localStorage.getItem('diary-ai-config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      // 检测旧版提示词（含"第一人称"→ 说明是旧缓存），忽略并使用新默认值
      if (config.coachPrompt && config.coachPrompt.trim() && !config.coachPrompt.includes('第一人称')) {
        return config.coachPrompt;
      }
    } catch {}
  }
  return DEFAULT_COACH_PROMPT;
}

// 判断是否是Claude API
function isClaudeAPI(baseUrl: string): boolean {
  return baseUrl.includes('anthropic.com');
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return content
    .map(block => {
      if (!block || typeof block !== 'object') return '';
      const text = (block as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

// 调用Claude API格式
async function callClaudeAPI(content: string, config: AIConfig, type: PolishType, retry = false): Promise<AITextResponse> {
  const prompt = getPromptByType(type) + (retry ? POLISH_RETRY_INSTRUCTION : '');
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: POLISH_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\n原文：${content}`
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'API调用失败' } }));
    throw new Error(error.error?.message || 'Claude API调用失败');
  }

  const data = await response.json().catch(() => {
    throw new Error('API返回了非JSON内容，请检查API地址配置');
  });
  return {
    text: extractText(data.content),
    truncated: data.stop_reason === 'max_tokens'
  };
}

// 调用OpenAI兼容API格式
async function callOpenAICompatibleAPI(content: string, config: AIConfig, type: PolishType, retry = false): Promise<AITextResponse> {
  const prompt = getPromptByType(type) + (retry ? POLISH_RETRY_INSTRUCTION : '');
  let apiUrl = config.baseUrl;

  if (!apiUrl.includes('/v1') && !apiUrl.endsWith('/chat/completions')) {
    apiUrl = `${apiUrl}/v1/chat/completions`;
  } else if (!apiUrl.endsWith('/chat/completions')) {
    apiUrl = `${apiUrl}/chat/completions`;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: POLISH_MAX_TOKENS,
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: `原文：${content}`
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'API调用失败' } }));
    throw new Error(error.error?.message || 'API调用失败');
  }

  const data = await response.json().catch(() => {
    throw new Error('API返回了非JSON内容，请检查API地址配置');
  });
  const choice = data.choices?.[0];
  return {
    text: extractText(choice?.message?.content),
    truncated: choice?.finish_reason === 'length'
  };
}

// 润色内容
export async function polishContent(content: string, config: AIConfig, type: PolishType = 'quickNote'): Promise<string> {
  if (!config.enabled || !config.baseUrl || !config.apiKey || !config.model) {
    throw new Error('请先在设置页面配置AI API');
  }

  console.log('Polishing with:', config.name, config.model, 'type:', type);

  try {
    const callAPI = (retry = false) => isClaudeAPI(config.baseUrl)
      ? callClaudeAPI(content, config, type, retry)
      : callOpenAICompatibleAPI(content, config, type, retry);

    let result = await callAPI();
    let parsed = parseTagsFromPolished(result.text);

    if (result.truncated || !parsed.content || !hasRequiredPolishTags(parsed.tags)) {
      result = await callAPI(true);
      parsed = parseTagsFromPolished(result.text);
    }

    if (result.truncated) throw new Error('AI润色结果被截断，请重试');
    if (!parsed.content) throw new Error('AI未返回润色正文，请重试');
    if (!hasRequiredPolishTags(parsed.tags)) throw new Error('AI未返回完整标签，请重试');

    return result.text;
  } catch (error) {
    console.error('Polish failed:', error);
    throw error;
  }
}

// 生成荔枝喵说教练反馈
export async function generateLizhiSays(content: string, config: AIConfig): Promise<string> {
  if (!config.enabled || !config.baseUrl || !config.apiKey || !config.model) {
    throw new Error('请先在设置页面配置AI API');
  }

  const prompt = getCoachPrompt();

  try {
    if (isClaudeAPI(config.baseUrl)) {
      const response = await fetch(`${config.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 800,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n今天日记内容：\n${content}`
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'API调用失败' } }));
        throw new Error(error.error?.message || 'Claude API调用失败');
      }

      const data = await response.json().catch(() => {
        throw new Error('API返回了非JSON内容，请检查API地址配置');
      });
      return data.content[0].text.trim();
    } else {
      let apiUrl = config.baseUrl;

      if (!apiUrl.includes('/v1') && !apiUrl.endsWith('/chat/completions')) {
        apiUrl = `${apiUrl}/v1/chat/completions`;
      } else if (!apiUrl.endsWith('/chat/completions')) {
        apiUrl = `${apiUrl}/chat/completions`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 800,
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: `今天日记内容：\n${content}`
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'API调用失败' } }));
        throw new Error(error.error?.message || 'API调用失败');
      }

      const data = await response.json().catch(() => {
        throw new Error('API返回了非JSON内容，请检查API地址配置');
      });
      return data.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error('Generate LizhiSays failed:', error);
    throw error;
  }
}

// 检查AI是否已配置
export function isAIConfigured(): boolean {
  const saved = localStorage.getItem('diary-ai-config');
  if (!saved) return false;

  try {
    const config = JSON.parse(saved);
    return config.enabled && config.baseUrl && config.apiKey && config.model;
  } catch {
    return false;
  }
}

// 获取AI配置
export function getAIConfig(): AIConfig {
  const saved = localStorage.getItem('diary-ai-config');
  if (!saved) {
    return { enabled: false, name: '', baseUrl: '', apiKey: '', model: '', polishPrompt: DEFAULT_POLISH_PROMPT };
  }

  try {
    const config = JSON.parse(saved);
    config.polishPrompt = normalizePolishPrompt(config.polishPrompt);
    return config;
  } catch {
    return { enabled: false, name: '', baseUrl: '', apiKey: '', model: '', polishPrompt: DEFAULT_POLISH_PROMPT };
  }
}
