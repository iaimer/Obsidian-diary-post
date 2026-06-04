import { useState, useEffect } from 'react';
import { SettingsToggle } from './SettingsToggle';

export const AI_CONFIG_KEY = 'diary-ai-config';

export interface AIConfig {
  enabled: boolean;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  polishPrompt: string;
  coachPrompt: string;
}

export const DEFAULT_POLISH_PROMPT = `你是一个日记润色助手。请将用户输入的内容进行润色，并自动添加合适的标签。

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
带娃去公园撒了个欢，跑得满头大汗。 #亲子 #自主探索 #记录

注意：每个输出必须包含 #领域 和 #能力 两个标签，不可遗漏！`;

export const DEFAULT_COACH_PROMPT = `你是一个理性的人生教练。基于当天日记内容，输出 250-300 字的分析。用第三人称"你"视角。

按以下结构输出，模块间空行分隔：

📌 模式识别
今天的行为模式或思维惯性

⚠️ 矛盾指出
温和指出言行不一致的地方

🎯 行动建议
明天可做的具体小改进

💬 暖心鼓励
注入一点情绪价值，给继续记录、持续改进的勇气

铁律：
- 总字数严格 250-300 字，不超出、不偷懒
- 只基于原文，不编造
- 教练口吻，客观直接，不说教`;

const presets = [
  { name: 'Claude API', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6-20250514' },
  { name: 'OpenAI API', baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: 'Moonshot', baseUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
  { name: '本地Ollama', baseUrl: 'http://localhost:11434', model: 'qwen2.5:7b' },
];

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return getAIDefaults();
    const config = JSON.parse(raw);
    return {
      enabled: config.enabled ?? false,
      name: config.name ?? '',
      baseUrl: config.baseUrl ?? '',
      apiKey: config.apiKey ?? '',
      model: config.model ?? '',
      polishPrompt: config.polishPrompt || DEFAULT_POLISH_PROMPT,
      coachPrompt: (config.coachPrompt && !config.coachPrompt.includes('第一人称'))
        ? config.coachPrompt
        : DEFAULT_COACH_PROMPT,
    };
  } catch {
    return getAIDefaults();
  }
}

export function getAIDefaults(): AIConfig {
  return { enabled: false, name: '', baseUrl: '', apiKey: '', model: '', polishPrompt: DEFAULT_POLISH_PROMPT, coachPrompt: DEFAULT_COACH_PROMPT };
}

interface Props {
  onDirtyChange?: (dirty: boolean) => void;
}

export function SettingsAI({ onDirtyChange }: Props) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig);
  const [saved, setSaved] = useState<AIConfig>(loadAIConfig);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(saved);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
      setSaved({ ...config });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 min-h-[44px]">
          <span className="text-sm text-gray-700 dark:text-gray-200">启用 AI 润色</span>
          <SettingsToggle
            checked={config.enabled}
            onChange={v => setConfig({ ...config, enabled: v })}
            label={config.enabled ? '禁用 AI 润色' : '启用 AI 润色'}
          />
        </div>
      </div>

      {config.enabled && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">快速选择预设</label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setConfig({ ...config, name: p.name, baseUrl: p.baseUrl, model: p.model })}
                    className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <FormRow label="服务名称">
              <input
                type="text" value={config.name}
                onChange={e => setConfig({ ...config, name: e.target.value })}
                placeholder="例如：Claude API"
                className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </FormRow>
            <FormRow label="API 地址 (Base URL)" divider>
              <input
                type="text" value={config.baseUrl}
                onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="https://api.example.com"
                className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Claude API用 api.anthropic.com，OpenAI兼容API用 api.openai.com/v1</p>
            </FormRow>
            <FormRow label="API Key" divider>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'} value={config.apiKey}
                  onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="输入API Key..."
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px] flex-1"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded-lg"
                >
                  {showKey ? '隐藏' : '显示'}
                </button>
              </div>
              {config.apiKey && (
                <button
                  onClick={() => { if (confirm('确定要清除API Key吗？')) setConfig({ ...config, apiKey: '' }); }}
                  className="text-xs text-red-500 dark:text-red-400 mt-1.5"
                >
                  清除API Key
                </button>
              )}
            </FormRow>
            <FormRow label="模型名称" divider>
              <input
                type="text" value={config.model}
                onChange={e => setConfig({ ...config, model: e.target.value })}
                placeholder="例如：gpt-4o-mini、claude-sonnet-4-6..."
                className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </FormRow>
            {config.name && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500">当前配置：{config.name} | {config.model}</p>
              </div>
            )}
          </div>

        </>
      )}

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      )}
    </div>
  );
}

function FormRow({ label, children, divider }: { label: string; children: React.ReactNode; divider?: boolean }) {
  return (
    <>
      <div className="px-4 py-3">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
        {children}
      </div>
      {divider && <div className="border-t border-gray-100 dark:border-gray-700" style={{ borderTopWidth: '0.5px' }} />}
    </>
  );
}
