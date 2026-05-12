import { useState } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { resetDataService } from '../services/dataService';

// AI配置存储键
const AI_CONFIG_KEY = 'diary-ai-config';

interface AIConfig {
  enabled: boolean;
  name: string;        // 自定义名称
  baseUrl: string;     // 自定义API地址
  apiKey: string;
  model: string;       // 自定义模型名称
}

// 默认配置
const defaultAIConfig: AIConfig = {
  enabled: false,
  name: '',
  baseUrl: '',
  apiKey: '',
  model: ''
};

// 获取保存的配置
function getSavedAIConfig(): AIConfig {
  const saved = localStorage.getItem(AI_CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
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
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-800">⚙️ 设置</h1>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* 远程API配置 */}
        <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-4">🌐 远程API设置</h2>

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
        </section>

        {/* AI润色设置 */}
        <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-4">🤖 AI润色引擎</h2>

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

              {/* 润色说明 */}
              <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded">
                <p className="mb-2 font-medium text-gray-500">润色规则：</p>
                <ul className="space-y-1">
                  <li>• 生动化扩写：用比喻、拟人或反差修辞让表达鲜活</li>
                  <li>• 事实零增补：严格遵守原文，绝不添加未提及的内容</li>
                  <li>• 拒绝代写总结：禁止末尾加AI风格感悟</li>
                  <li>• 口语化与去官腔：用接地气词汇，像跟老友聊天</li>
                  <li>• 简短有节奏：多用短句，适当加语气词</li>
                </ul>
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
        </section>

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

