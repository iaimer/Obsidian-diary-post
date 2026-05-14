import { useState } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { resetDataService } from '../services/dataService';
import { CollapsibleSection } from './CollapsibleSection';

// AI配置存储键
const AI_CONFIG_KEY = 'diary-ai-config';

interface AIConfig {
  enabled: boolean;
  name: string;        // 自定义名称
  baseUrl: string;     // 自定义API地址
  apiKey: string;
  model: string;       // 自定义模型名称
  polishPrompt: string; // 自定义润色规则
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

// 默认配置
const defaultAIConfig: AIConfig = {
  enabled: false,
  name: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  polishPrompt: DEFAULT_POLISH_PROMPT
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
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'failed'>('none');
  
  // 远程API配置
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const apiUrl = useDiaryStore(state => state.apiUrl);
  const apiToken = useDiaryStore(state => state.apiToken);
  const setRemoteMode = useDiaryStore(state => state.setRemoteMode);
  const setApiConfig = useDiaryStore(state => state.setApiConfig);
  
  const handleTestConnection = async () => {
    if (!apiUrl || !apiToken) {
      alert('请先填写API地址和Token');
      return;
    }
    
    setTestingConnection(true);
    setConnectionStatus('none');
    
    try {
      const response = await fetch(`${apiUrl}/health`, {
        headers: {
          'Authorization': `Token ${apiToken}`
        }
      });
      
      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('failed');
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

  return (
    <div className="min-h-screen bg-gray-50 pb-[50px]">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-800">⚙️ 设置</h1>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto">
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
              <span className="text-sm text-gray-700">启用远程模式（手机访问Mac mini API）</span>
            </label>
          </div>

          {remoteMode && (
            <>
              {/* API地址 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">API地址</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="http://100.127.58.104:3001"
                  value={apiUrl}
                  onChange={(e) => {
                    setApiConfig(e.target.value, apiToken);
                    resetDataService();
                  }}
                />
                <div className="text-xs text-gray-400 mt-1">
                  Tailscale地址：http://100.67.123.39:3001（MacBook）
                </div>
              </div>

              {/* API Token */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">API Token</label>
                <input
                  type="password"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="输入Token..."
                  value={apiToken}
                  onChange={(e) => {
                    setApiConfig(apiUrl, e.target.value);
                    resetDataService();
                  }}
                />
              </div>

              {/* 连接状态提示 */}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-3">
                当前模式：远程API | {apiUrl || '未配置地址'}
              </div>
              
              {/* 测试连接按钮 */}
              <button
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 mb-2"
                onClick={handleTestConnection}
                disabled={testingConnection || !apiUrl || !apiToken}
              >
                {testingConnection ? '测试中...' : '测试连接'}
              </button>
              
              {/* 连接状态显示 */}
              {connectionStatus === 'success' && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded flex items-center gap-1">
                  <span>✅</span> 连接成功！API Server 正常运行
                </div>
              )}
              {connectionStatus === 'failed' && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-1">
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
              <span className="text-sm text-gray-700">启用AI润色</span>
            </label>
          </div>

          {aiConfig.enabled && (
            <>
              {/* 预设模板 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">快速选择预设</label>
                <div className="flex flex-wrap gap-1">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 名称 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">服务名称</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：Claude API、本地模型..."
                  value={aiConfig.name}
                  onChange={(e) => setAIConfig({ ...aiConfig, name: e.target.value })}
                />
              </div>

              {/* Base URL */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">API地址 (Base URL)</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://api.example.com"
                  value={aiConfig.baseUrl}
                  onChange={(e) => setAIConfig({ ...aiConfig, baseUrl: e.target.value })}
                />
                <div className="text-xs text-gray-400 mt-1">
                  Claude API用 api.anthropic.com，OpenAI兼容API用 api.openai.com/v1
                </div>
              </div>

              {/* API Key */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">API Key</label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="输入API Key..."
                    value={aiConfig.apiKey}
                    onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                  />
                  <button
                    className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '隐藏' : '显示'}
                  </button>
                </div>
                {aiConfig.apiKey && (
                  <button
                    className="text-xs text-red-500 mt-2 hover:underline"
                    onClick={handleClearApiKey}
                  >
                    清除API Key
                  </button>
                )}
              </div>

              {/* 模型名称 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">模型名称</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：gpt-4o-mini、claude-sonnet-4-6..."
                  value={aiConfig.model}
                  onChange={(e) => setAIConfig({ ...aiConfig, model: e.target.value })}
                />
              </div>

              {/* 当前配置显示 */}
              {aiConfig.name && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-4">
                  当前配置：{aiConfig.name} | {aiConfig.model}
                </div>
              )}

              {/* 自定义润色规则 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">润色规则（可自定义）</label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="自定义润色规则..."
                  rows={10}
                  value={aiConfig.polishPrompt || DEFAULT_POLISH_PROMPT}
                  onChange={(e) => setAIConfig({ ...aiConfig, polishPrompt: e.target.value })}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="text-xs text-gray-500 hover:text-indigo-600"
                    onClick={() => setAIConfig({ ...aiConfig, polishPrompt: DEFAULT_POLISH_PROMPT })}
                  >
                    重置为默认规则
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-400">修改后点击保存生效</span>
                </div>
              </div>
            </>
          )}

          {/* 保存按钮 */}
          <button
            className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </CollapsibleSection>

        {/* 关于 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-3">📋 关于</h2>
          <div className="text-xs text-gray-600">
            <p>日记APP v0.1.0</p>
            <p className="mt-2">与 Obsidian Vault 集成的日记记录工具</p>
            <p className="mt-2 text-gray-400">荔枝喵说由 hermes agent 定时生成</p>
          </div>
        </section>
      </main>
    </div>
  );
}

