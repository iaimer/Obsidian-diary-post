// AI润色服务

interface AIConfig {
  enabled: boolean;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

// 润色提示词
const POLISH_PROMPT = `你是一个日记润色助手。请将用户输入的简短日记内容进行润色扩写，并自动添加合适的标签。

【润色规则】
1. 生动化扩写：用比喻、拟人或反差修辞让表达鲜活，但不脑补环境描写和心理活动。
2. 事实零增补：严格遵守原文的时间、地点、人物和逻辑，绝不添加未提及的内容。
3. 拒绝代写总结：禁止在末尾加AI风格感悟（如"生活真美好"、"很有意义"）。
4. 口语化与去官腔：用"薅羊毛、撒个欢、白忙活"等接地气词汇，替代"进行了、开展了、由于"等公文词汇。
5. 简短有节奏：多用短句，适当加语气词（呀、呢、嘛），像跟老友聊天。

【标签规则】必须添加三层标签，格式为：内容 #领域 #能力 #方法

⚠️ 重要：必须包含2个必选标签 + 0-1个可选标签，总共2-3个标签！

第一层：领域层（必选1个）
#亲子 #育儿 #工作 #学习 #阅读 #技术

第二层：能力层（必选1个，必须根据领域严格选择对应的能力标签）
- 亲子/育儿领域：#情绪管理 #表达能力 #语言发育 #成长观察 #自信心 #自主探索
- 工作领域：#任务执行 #沟通协作 #问题解决 #决策能力 #效率管理
- 学习领域：#理解能力 #记忆能力 #专注力 #学习迁移
- 阅读领域：#信息提取 #理解深度 #批判思维
- 技术领域：#系统理解 #调试能力 #架构理解 #实现能力

第三层：方法层（可选0-1个）
#反思 #方法论 #问题分析 #记录

【领域判断优先级】
1. 涉及孩子/亲子互动 → #亲子 或 #育儿
2. 涉及工作/职业/实验/检测 → #工作
3. 涉及学习/知识/技能 → #学习
4. 涉及阅读/书籍 → #阅读
5. 涉及工具/代码/AI/Obsidian → #技术

请直接输出润色后的内容和标签，格式示例：
今天带娃去公园撒了个欢，跑得满头大汗呀。 #亲子 #自主探索 #记录

注意：每个输出必须包含 #领域 和 #能力 两个标签，不可遗漏！`;

// 判断是否是Claude API
function isClaudeAPI(baseUrl: string): boolean {
  return baseUrl.includes('anthropic.com');
}

// 调用Claude API格式
async function callClaudeAPI(content: string, config: AIConfig): Promise<string> {
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `${POLISH_PROMPT}\n\n原文：${content}`
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'API调用失败' } }));
    throw new Error(error.error?.message || 'Claude API调用失败');
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

// 调用OpenAI兼容API格式
async function callOpenAICompatibleAPI(content: string, config: AIConfig): Promise<string> {
  // 构建完整的API URL
  let apiUrl = config.baseUrl;

  // 如果baseUrl不包含/v1，自动添加
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
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: POLISH_PROMPT
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

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// 润色内容
export async function polishContent(content: string, config: AIConfig): Promise<string> {
  if (!config.enabled || !config.baseUrl || !config.apiKey || !config.model) {
    throw new Error('请先在设置页面配置AI API');
  }

  console.log('Polishing with:', config.name, config.model);

  try {
    // 根据baseUrl判断API格式
    if (isClaudeAPI(config.baseUrl)) {
      return await callClaudeAPI(content, config);
    } else {
      // 其他API使用OpenAI兼容格式
      return await callOpenAICompatibleAPI(content, config);
    }
  } catch (error) {
    console.error('Polish failed:', error);
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
    return { enabled: false, name: '', baseUrl: '', apiKey: '', model: '' };
  }

  try {
    return JSON.parse(saved);
  } catch {
    return { enabled: false, name: '', baseUrl: '', apiKey: '', model: '' };
  }
}