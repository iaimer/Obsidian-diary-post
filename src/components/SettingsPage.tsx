import { useState } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { resetDataService } from '../services/dataService';
import { CollapsibleSection } from './CollapsibleSection';
import { DarkIcon, LightIcon, SettingsIcon } from './Icons';
import { HabitConfigEditModal } from './HabitConfigEditModal';
import { HabitConfig } from '../types';
import { getShanghaiDateString } from '../utils/date';
import packageInfo from '../../package.json';

// AI配置存储键
const AI_CONFIG_KEY = 'diary-ai-config';

interface AIConfig {
  enabled: boolean;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  polishPrompt: string;
  coachPrompt: string;
}

// 默认润色规则
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
注入一点情绪价值，给继续记录、持续改进的勇气

铁律：
- 总字数严格 250-300 字，不超出、不偷懒
- 只基于原文，不编造
- 教练口吻，客观直接，不说教`;

// 默认配置
const defaultAIConfig: AIConfig = {
  enabled: false,
  name: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  polishPrompt: DEFAULT_POLISH_PROMPT,
  coachPrompt: DEFAULT_COACH_PROMPT
};

// 获取保存的配置
function getSavedAIConfig(): AIConfig {
  const saved = localStorage.getItem(AI_CONFIG_KEY);
  if (saved) {
    try {
      const config = JSON.parse(saved);
      if (!config.polishPrompt) {
        config.polishPrompt = DEFAULT_POLISH_PROMPT;
      }
      if (!config.coachPrompt || config.coachPrompt.includes('第一人称')) {
        config.coachPrompt = DEFAULT_COACH_PROMPT;
      }
      return config;
    } catch {
      return defaultAIConfig;
    }
  }
  return defaultAIConfig;
}

// 预设模板
const presets = [
  { name: 'Claude API', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6-20250514' },
  { name: 'OpenAI API', baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: 'Moonshot', baseUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
  { name: '本地Ollama', baseUrl: 'http://localhost:11434', model: 'qwen2.5:7b' },
];

export function SettingsPage() {
  const [aiConfig, setAIConfig] = useState<AIConfig>(getSavedAIConfig());
  const [promptTab, setPromptTab] = useState<'polish' | 'coach'>('polish');
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'failed'>('none');
  const [imageSaving, setImageSaving] = useState(false);

  // 习惯配置编辑状态
  const [editingHabit, setEditingHabit] = useState<HabitConfig | null>(null);
  const [showHabitModal, setShowHabitModal] = useState(false);

  // 远程API配置
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const apiUrl = useDiaryStore(state => state.apiUrl);
  const apiToken = useDiaryStore(state => state.apiToken);
  const darkMode = useDiaryStore(state => state.darkMode);
  const themePreference = useDiaryStore(state => state.themePreference);
  const setRemoteMode = useDiaryStore(state => state.setRemoteMode);
  const setApiConfig = useDiaryStore(state => state.setApiConfig);
  const setThemePreference = useDiaryStore(state => state.setThemePreference);

  // 习惯配置
  const habitConfigs = useDiaryStore(state => state.habitConfigs);
  const addHabitConfig = useDiaryStore(state => state.addHabitConfig);
  const updateHabitConfig = useDiaryStore(state => state.updateHabitConfig);
  const removeHabitConfig = useDiaryStore(state => state.removeHabitConfig);
  const resetHabitConfigs = useDiaryStore(state => state.resetHabitConfigs);

  // 图片压缩配置（本地编辑状态）
  const imageConfigStore = useDiaryStore(state => state.imageConfig);
  const setImageConfig = useDiaryStore(state => state.setImageConfig);
  const [imageDraft, setImageDraft] = useState(imageConfigStore);
  
  const handleTestConnection = async () => {
    if (!apiUrl || !apiToken) {
      alert('请先填写API地址和Token');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('none');

    try {
      // 使用实际的 API 端点测试连接（获取今天的日记）
      const dateStr = getShanghaiDateString();

      // 确保 apiUrl 不包含 /api/v1
      const cleanUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

      const response = await fetch(`${cleanUrl}/api/v1/diary/${dateStr}`, {
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setConnectionStatus('success');
        // 连接成功后自动启用远程模式
        if (!remoteMode) {
          setRemoteMode(true);
          setApiConfig(cleanUrl, apiToken);
          resetDataService();
        }
      } else if (response.status === 401) {
        setConnectionStatus('failed');
        console.error('Token invalid');
      } else {
        // 其他错误（如日记不存在）也视为连接成功
        setConnectionStatus('success');
        if (!remoteMode) {
          setRemoteMode(true);
          setApiConfig(cleanUrl, apiToken);
          resetDataService();
        }
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
      alert('设置已保存');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSave = async () => {
    setImageSaving(true);
    try {
      setImageConfig(imageDraft);
      alert('图片设置已保存');
    } finally {
      setImageSaving(false);
    }
  };

  const handleClearApiKey = () => {
    if (confirm('确定要清除API Key吗？')) {
      setAIConfig({ ...aiConfig, apiKey: '' });
    }
  };

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setAIConfig({
      ...aiConfig,
      name: preset.name,
      baseUrl: preset.baseUrl,
      model: preset.model
    });
  };

  // 习惯配置处理
  const handleAddHabit = () => {
    setEditingHabit(null);
    setShowHabitModal(true);
  };

  const handleEditHabit = (config: HabitConfig) => {
    setEditingHabit(config);
    setShowHabitModal(true);
  };

  const handleSaveHabit = (config: HabitConfig) => {
    if (editingHabit) {
      // 编辑现有习惯
      updateHabitConfig(config.id, config);
    } else {
      // 添加新习惯
      const maxOrder = habitConfigs.reduce((max, c) => Math.max(max, c.order), 0);
      addHabitConfig({ ...config, order: maxOrder + 1 });
    }
    setShowHabitModal(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = (id: string) => {
    if (confirm('确定要删除这个习惯吗？')) {
      removeHabitConfig(id);
    }
  };

  const handleToggleHabitEnabled = (id: string, enabled: boolean) => {
    updateHabitConfig(id, { enabled });
  };

  const handleResetHabits = () => {
    if (confirm('确定要恢复默认习惯配置吗？')) {
      resetHabitConfigs();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="safe-top bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 pb-3 sticky top-0 z-10 border-b border-gray-100/50 dark:border-gray-700/50">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 inline-flex items-center gap-2"><SettingsIcon /> 设置</h1>
          <button
            onClick={() => {
              const next: Record<string, 'dark' | 'light' | 'system'> = {
                dark: 'light',
                light: 'system',
                system: 'dark'
              };
              setThemePreference(next[themePreference]);
            }}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
            title={
              themePreference === 'dark' ? '深色模式 · 点击切换' :
              themePreference === 'light' ? '浅色模式 · 点击切换' : '跟随系统 · 点击切换'
            }
          >
            {themePreference === 'dark' ? <DarkIcon /> :
             themePreference === 'light' ? <LightIcon /> :
             darkMode ? <DarkIcon /> : <LightIcon />}
            {themePreference === 'system' && (
              <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-indigo-500 dark:text-indigo-400 bg-white dark:bg-gray-800 rounded-full leading-none px-0.5">
                A
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 pb-[80px] max-w-xl mx-auto">

        {/* 习惯管理 */}
        <CollapsibleSection title="🏃 习惯管理">
          <div className="space-y-2">
            {/* 习惯列表 */}
            {habitConfigs.sort((a, b) => a.order - b.order).map(config => (
              <div
                key={config.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{config.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {config.type === 'number' ? `数值型 · 目标 ${config.goal}${config.unit || ''}` : '勾选型'}
                      {!config.enabled && ' · 已禁用'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 启用/禁用开关 */}
                  <button
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                    onClick={() => handleToggleHabitEnabled(config.id, !config.enabled)}
                    title={config.enabled ? '禁用' : '启用'}
                  >
                    {config.enabled ? (
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 12.5L11 15.5L16 9.5" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 15L9 9.00001M15 9L9.00001 15" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                  </button>
                  {/* 编辑按钮 */}
                  <button
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                    onClick={() => handleEditHabit(config)}
                    title="编辑"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16.4745 5.40801L18.5917 7.52524M17.8358 3.54289L12.1086 9.27005C11.8131 9.56562 11.6116 9.94206 11.5296 10.3519L11 13L13.6481 12.4704C14.0579 12.3884 14.4344 12.1869 14.7299 11.8914L20.4571 6.16423C21.181 5.44037 21.181 4.26676 20.4571 3.5429C19.7332 2.81904 18.5596 2.81903 17.8358 3.54289Z" />
                      <path d="M19 15V18C19 19.1046 18.1046 20 17 20H6C4.89543 20 4 19.1046 4 18V7C4 5.89543 4.89543 5 6 5H9" />
                    </svg>
                  </button>
                  {/* 删除按钮 */}
                  <button
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => handleDeleteHabit(config.id)}
                    title="删除"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" />
                      <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" />
                      <path d="M2 6H22" />
                      <path d="M10 11V16" />
                      <path d="M14 11V16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                onClick={handleAddHabit}
              >
                + 添加新习惯
              </button>
              <button
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={handleResetHabits}
              >
                恢复默认
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* 远程API配置 */}
        <CollapsibleSection title="🌐 远程API设置">
          {/* 模式选择 */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remoteMode}
                onChange={(e) => {
                  setRemoteMode(e.target.checked);
                  resetDataService();
                }}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">启用远程模式（手机访问Mac mini API）</span>
            </label>
          </div>

          {remoteMode && (
            <>
              {/* API地址 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">API地址</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  placeholder="https://obsidian.femkits.org"
                  value={apiUrl.replace(/\/api\/v1\/?$/, '')}  // 显示时移除 /api/v1
                  onChange={(e) => {
                    // 保存时自动移除末尾的 /api/v1
                    let url = e.target.value.trim();
                    url = url.replace(/\/api\/v1\/?$/, '');
                    setApiConfig(url, apiToken);
                    resetDataService();
                  }}
                />
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  基础地址（不包含 /api/v1），例如：https://obsidian.femkits.org
                </div>
              </div>

              {/* API Token */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">API Token</label>
                <div className="flex gap-2">
                  <input
                    type={showApiToken ? 'text' : 'password'}
                    className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    placeholder="输入Token..."
                    value={apiToken}
                    onChange={(e) => {
                      setApiConfig(apiUrl, e.target.value);
                      resetDataService();
                    }}
                  />
                  <button
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300"
                    onClick={() => setShowApiToken(!showApiToken)}
                  >
                    {showApiToken ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>

              {/* 连接状态提示 */}
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded mb-3">
                当前模式：远程API | {apiUrl || '未配置地址'}
              </div>

              {/* 测试连接按钮 */}
              <button
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 mb-2"
                onClick={handleTestConnection}
                disabled={testingConnection || !apiUrl || !apiToken}
              >
                {testingConnection ? '测试中...' : '测试连接'}
              </button>

              {/* 连接状态显示 */}
              {connectionStatus === 'success' && (
                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-2 rounded flex items-center gap-1">
                  <span>✅</span> 连接成功！API Server 正常运行
                </div>
              )}
              {connectionStatus === 'failed' && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded flex items-center gap-1">
                  <span>❌</span> 连接失败，请检查API地址和Token
                </div>
              )}
            </>
          )}
        </CollapsibleSection>

        {/* AI润色设置 */}
        <CollapsibleSection title="🤖 AI润色引擎">
          {/* 启用开关 */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aiConfig.enabled}
                onChange={(e) => setAIConfig({ ...aiConfig, enabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">启用AI润色</span>
            </label>
          </div>

          {aiConfig.enabled && (
            <>
              {/* 预设模板 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">快速选择预设</label>
                <div className="flex flex-wrap gap-1">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-500"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 名称 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">服务名称</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  placeholder="例如：Claude API、本地模型..."
                  value={aiConfig.name}
                  onChange={(e) => setAIConfig({ ...aiConfig, name: e.target.value })}
                />
              </div>

              {/* Base URL */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">API地址 (Base URL)</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  placeholder="https://api.example.com"
                  value={aiConfig.baseUrl}
                  onChange={(e) => setAIConfig({ ...aiConfig, baseUrl: e.target.value })}
                />
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Claude API用 api.anthropic.com，OpenAI兼容API用 api.openai.com/v1
                </div>
              </div>

              {/* API Key */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">API Key</label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    placeholder="输入API Key..."
                    value={aiConfig.apiKey}
                    onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                  />
                  <button
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '隐藏' : '显示'}
                  </button>
                </div>
                {aiConfig.apiKey && (
                  <button
                    className="text-xs text-red-500 dark:text-red-400 mt-2 hover:underline"
                    onClick={handleClearApiKey}
                  >
                    清除API Key
                  </button>
                )}
              </div>

              {/* 模型名称 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">模型名称</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  placeholder="例如：gpt-4o-mini、claude-sonnet-4-6..."
                  value={aiConfig.model}
                  onChange={(e) => setAIConfig({ ...aiConfig, model: e.target.value })}
                />
              </div>

              {/* 当前配置显示 */}
              {aiConfig.name && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded mb-4">
                  当前配置：{aiConfig.name} | {aiConfig.model}
                </div>
              )}

              {/* 提示词规则 */}
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <button
                    className={`text-xs px-3 py-1 rounded-full ${
                      promptTab === 'polish'
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setPromptTab('polish')}
                  >
                    润色规则
                  </button>
                  <button
                    className={`text-xs px-3 py-1 rounded-full ${
                      promptTab === 'coach'
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setPromptTab('coach')}
                  >
                    教练提示词
                  </button>
                </div>
                {promptTab === 'polish' ? (
                  <>
                    <textarea
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                      placeholder="自定义润色规则..."
                      rows={10}
                      value={aiConfig.polishPrompt || DEFAULT_POLISH_PROMPT}
                      onChange={(e) => setAIConfig({ ...aiConfig, polishPrompt: e.target.value })}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        onClick={() => setAIConfig({ ...aiConfig, polishPrompt: DEFAULT_POLISH_PROMPT })}
                      >
                        重置为默认
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <textarea
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                      placeholder="自定义教练提示词..."
                      rows={10}
                      value={aiConfig.coachPrompt || DEFAULT_COACH_PROMPT}
                      onChange={(e) => setAIConfig({ ...aiConfig, coachPrompt: e.target.value })}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        onClick={() => setAIConfig({ ...aiConfig, coachPrompt: DEFAULT_COACH_PROMPT })}
                      >
                        重置为默认
                      </button>
                    </div>
                  </>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">修改后点击保存生效</div>
              </div>
            </>
          )}

          {/* 保存按钮 */}
          <button
            className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </CollapsibleSection>

        {/* 图片上传设置 */}
        <CollapsibleSection title="📷 图片压缩设置">
          {/* 最大长边 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">最大长边 (px)</label>
            <input
              type="number"
              min="800"
              max="4000"
              step="100"
              value={imageDraft.maxLongSide}
              onChange={(e) => setImageDraft({ ...imageDraft, maxLongSide: parseInt(e.target.value) || 2000 })}
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            />
          </div>

          {/* 最大文件大小 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">最大文件大小 (MB)</label>
            <input
              type="number"
              min="0.5"
              max="5"
              step="0.5"
              value={imageDraft.maxSizeMB}
              onChange={(e) => setImageDraft({ ...imageDraft, maxSizeMB: parseFloat(e.target.value) || 2 })}
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            />
          </div>

          {/* JPEG质量 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">JPEG 质量 (0.3-1.0)</label>
            <input
              type="number"
              min="0.3"
              max="1.0"
              step="0.05"
              value={imageDraft.quality}
              onChange={(e) => setImageDraft({ ...imageDraft, quality: parseFloat(e.target.value) || 0.7 })}
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            />
          </div>

          {/* 文件名格式 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">文件名格式</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              placeholder="Image-{date}-{seq}"
              value={imageDraft.nameFormat}
              onChange={(e) => setImageDraft({ ...imageDraft, nameFormat: e.target.value })}
            />
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              可用占位符: <code className="bg-gray-100 dark:bg-gray-600 px-1 rounded">{'{date}'}</code> = YYYYMMDD, <code className="bg-gray-100 dark:bg-gray-600 px-1 rounded">{'{seq}'}</code> = 序号
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              预览: <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                {imageDraft.nameFormat.replace('{date}', '20260515').replace('{seq}', '001')}.jpg
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800"
              onClick={handleImageSave}
              disabled={imageSaving}
            >
              {imageSaving ? '保存中...' : '保存设置'}
            </button>
            <button
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => setImageDraft({ maxLongSide: 2000, maxSizeMB: 2, quality: 0.7, nameFormat: 'Image-{date}-{seq}' })}
            >
              恢复默认
            </button>
          </div>
        </CollapsibleSection>

        {/* 关于 */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">📋 关于</h2>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <p>Litchi Journal / 荔枝日记 v{packageInfo.version}</p>
            <p className="mt-2">与 Obsidian Vault 集成的日记记录工具</p>
          </div>
        </section>
      </main>

      {/* 习惯配置编辑弹窗 */}
      {showHabitModal && (
        <HabitConfigEditModal
          config={editingHabit}
          onSave={handleSaveHabit}
          onClose={() => {
            setShowHabitModal(false);
            setEditingHabit(null);
          }}
        />
      )}
    </div>
  );
}
