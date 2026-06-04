import { useState, useEffect } from 'react';
import {
  DEFAULT_COACH_PROMPT,
  DEFAULT_POLISH_PROMPT,
  normalizePolishPrompt
} from '../../config/prompts';
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
      polishPrompt: normalizePolishPrompt(config.polishPrompt),
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
