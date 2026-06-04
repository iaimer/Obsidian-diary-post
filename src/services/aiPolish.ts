// AI润色服务

import { hasRequiredPolishTags, parseTagsFromPolished } from '../utils/polishResult';

interface AIConfig {
  enabled: boolean;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  polishPrompt?: string;
  coachPrompt?: string;
}

// 默认润色提示词
const DEFAULT_POLISH_PROMPT = `你是一个日记润色助手。请将用户输入的内容进行润色，并自动添加合适的标签。

【润色规则】
1. 尊重事实零增补：严格遵守原文的每一个事实细节，绝不添加任何未提及的人物、事件、地点、时间或具体信息。
2. 适度修辞：可以适当使用比喻、拟人等修辞手法让表达更生动，但只能基于原文已有的信息进行修辞化处理。
3. 轻微扩写：可以做一点点扩写（1-2句），但只能是对原文氛围或情绪的自然延伸，不可编造新事实。
4. 拒绝代写总结：禁止在末尾加任何AI风格感悟、建议或总结。
5. 保持原意：保留原文的核心表达和语气风格。

【扩写边界示例】
原文：带娃去公园玩。
✅ 合理扩写：带娃去公园撒了个欢，跑得满头大汗。（基于"玩"的氛围延伸）
❌ 过度扩写：带娃去公园玩，阳光明媚，草地上蝴蝶飞舞...（添加了未提及的阳光、蝴蝶、草地细节）

【标签规则】必须添加三层标签，格式为：内容 #领域 #能力 #方法

⚠️ 重要：必须包含2个必选标签 + 0-1个可选标签，总共2-3个标签！

第一层：领域层（必选1个）
#亲子 #育儿 #工作 #学习 #阅读 #技术 #生活

第二层：能力层（必选1个，必须根据领域严格选择对应的能力标签）
- 亲子/育儿领域：#情绪管理 #表达能力 #语言发育 #成长观察 #自信心 #自主探索
- 工作领域：#任务执行 #沟通协作 #问题解决 #决策能力 #效率管理
- 学习领域：#理解能力 #记忆能力 #专注力 #学习迁移
- 阅读领域：#信息提取 #理解深度 #批判思维
- 技术领域：#系统理解 #调试能力 #架构理解 #实现能力
- 生活领域：#健康管理 #财务管理 #生活整理 #兴趣探索 #日常记录

第三层：方法层（可选0-1个）
#反思 #方法论 #问题分析 #记录 #回忆

【领域判断优先级】
1. 涉及孩子/亲子互动 → #亲子 或 #育儿
2. 涉及日常生活/健康/睡眠/情绪/财务/兴趣/饮食 → #生活（不明确归属日常的优先归入此类）
3. 涉及工作/职业/实验/检测 → #工作
4. 涉及学习/知识/技能 → #学习
5. 涉及阅读/书籍 → #阅读
6. 涉及工具/代码/AI/Obsidian → #技术

请直接输出润色后的内容和标签，格式示例：
半夜醒来翻来覆去睡不着。 #生活 #健康管理 #记录
带娃去公园撒了个欢，跑得满头大汗。 #亲子 #自主探索 #记录

注意：每个输出必须包含 #领域 和 #能力 两个标签，不可遗漏！`;

// 默认教练提示词
const DEFAULT_COACH_PROMPT = `你是一个理性的人生教练。基于当天日记内容，输出 250-300 字的分析。用第三人称"你"视角。

按以下结构输出，模块间空行分隔：

📌 模式识别
今天的行为模式或思维惯性

⚠️ 矛盾指出
温和指出言行不一致的地方

🎯 行动建议
明天可做的具体小改进

💬 暖心鼓励
注入一点情绪价值，以激励用户持续改进的勇气

铁律：
- 总字数严格 250-300 字，不超出、不偷懒
- 只基于原文，不编造
- 教练口吻，客观直接，不说教`;

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
第一行只输出 2-3 个标签：#领域 #能力 [#方法]
第二行输出完整润色正文。`;

// 检测缓存提示词是否过期（缺 #生活 等新标签则回退到默认）
function isPromptStale(prompt: string): boolean {
  return !prompt.includes('#生活') || !prompt.includes('#回忆');
}

// 获取润色提示词（优先使用用户自定义，但过期缓存自动降级）
function getPromptByType(_type: PolishType): string {
  const saved = localStorage.getItem('diary-ai-config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      if (config.polishPrompt && config.polishPrompt.trim() && !isPromptStale(config.polishPrompt)) {
        return config.polishPrompt;
      }
    } catch {}
  }
  return DEFAULT_POLISH_PROMPT;
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
    if (!config.polishPrompt) {
      config.polishPrompt = DEFAULT_POLISH_PROMPT;
    }
    return config;
  } catch {
    return { enabled: false, name: '', baseUrl: '', apiKey: '', model: '', polishPrompt: DEFAULT_POLISH_PROMPT };
  }
}
