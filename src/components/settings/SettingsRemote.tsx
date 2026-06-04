import { useState, useEffect } from 'react';
import { useDiaryStore } from '../../stores/diaryStore';
import { resetDataService } from '../../services/dataService';
import { getShanghaiDateString } from '../../utils/date';
import { SettingsToggle } from './SettingsToggle';

interface Props {
  onDirtyChange?: (dirty: boolean) => void;
}

export function SettingsRemote({ onDirtyChange }: Props) {
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const apiUrl = useDiaryStore(state => state.apiUrl);
  const apiToken = useDiaryStore(state => state.apiToken);
  const setRemoteMode = useDiaryStore(state => state.setRemoteMode);
  const setApiConfig = useDiaryStore(state => state.setApiConfig);

  const [draftUrl, setDraftUrl] = useState(() => apiUrl.replace(/\/api\/v1\/?$/, ''));
  const [draftToken, setDraftToken] = useState(apiToken);
  const [draftRemoteMode, setDraftRemoteMode] = useState(remoteMode);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'none' | 'success' | 'failed'>('none');

  useEffect(() => {
    setDraftUrl(apiUrl.replace(/\/api\/v1\/?$/, ''));
    setDraftToken(apiToken);
    setDraftRemoteMode(remoteMode);
  }, [apiUrl, apiToken, remoteMode]);

  const hasChanges = draftUrl !== apiUrl.replace(/\/api\/v1\/?$/, '')
    || draftToken !== apiToken
    || draftRemoteMode !== remoteMode;

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const handleSave = () => {
    const cleanUrl = draftUrl.replace(/\/api\/v1\/?$/, '');
    setApiConfig(cleanUrl, draftToken);
    setRemoteMode(draftRemoteMode);
    resetDataService();
  };

  const handleTest = async () => {
    if (!draftUrl || !draftToken) {
      alert('请先填写API地址和Token');
      return;
    }
    setTesting(true);
    setStatus('none');
    try {
      const dateStr = getShanghaiDateString();
      const cleanUrl = draftUrl.replace(/\/api\/v1\/?$/, '');
      const response = await fetch(`${cleanUrl}/api/v1/diary/${dateStr}`, {
        headers: { 'Authorization': `Token ${draftToken}`, 'Content-Type': 'application/json' }
      });
      if (response.ok || response.status !== 401) {
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Remote mode toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 min-h-[44px]">
          <span className="text-sm text-gray-700 dark:text-gray-200">远程模式</span>
          <SettingsToggle
            checked={draftRemoteMode}
            onChange={setDraftRemoteMode}
            label={draftRemoteMode ? '关闭远程模式' : '启用远程模式'}
          />
        </div>
        {!draftRemoteMode && (
          <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">远程模式关闭时使用浏览器本地 API 访问 Vault。</p>
          </div>
        )}
      </div>

      {/* API config form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">API 地址</label>
          <input
            type="text"
            value={draftUrl}
            onChange={e => setDraftUrl(e.target.value.trim())}
            placeholder="https://obsidian.femkits.org"
            className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">不包含 /api/v1 的基础地址</p>
        </div>

        <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700" style={{ borderTopWidth: '0.5px' }}>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 pt-3">API Token</label>
          <div className="flex gap-2">
            <input
              type={showToken ? 'text' : 'password'}
              value={draftToken}
              onChange={e => setDraftToken(e.target.value)}
              placeholder="输入Token..."
              className="flex-1 p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
            >
              {showToken ? '隐藏' : '显示'}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" style={{ borderTopWidth: '0.5px' }}>
          <div className="px-4 py-3 space-y-2">
            <button
              onClick={handleTest}
              disabled={testing || !draftUrl || !draftToken}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 min-h-[44px]"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            {status === 'success' && (
              <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-2 rounded">
                ✓ 连接成功
              </div>
            )}
            {status === 'failed' && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded">
                ✗ 连接失败，请检查地址和Token
              </div>
            )}
          </div>
        </div>
      </div>

      {hasChanges && (
        <button
          onClick={handleSave}
          className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 min-h-[44px]"
        >
          保存修改
        </button>
      )}
    </div>
  );
}
