import { useState } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { resetDataService } from '../services/dataService';
import { getShanghaiDateString } from '../utils/date';

interface Props {
  onConfigured: () => void;
}

export function FirstTimeConfig({ onConfigured }: Props) {
  const [url, setUrl] = useState('https://obsidian.femkits.org');
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [error, setError] = useState('');

  const setApiConfig = useDiaryStore(state => state.setApiConfig);
  const setRemoteMode = useDiaryStore(state => state.setRemoteMode);

  const handleTest = async () => {
    if (!url || !token) {
      setError('请填写 API 地址和 Token');
      return;
    }

    setTesting(true);
    setStatus('testing');
    setError('');

    try {
      const cleanUrl = url.replace(/\/api\/v1\/?$/, '');
      const dateStr = getShanghaiDateString();

      const response = await fetch(`${cleanUrl}/api/v1/diary/${dateStr}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok || (response.status !== 401)) {
        setStatus('success');
        setApiConfig(cleanUrl, token);
        setRemoteMode(true);
        resetDataService();
      } else {
        setStatus('failed');
        setError('Token 无效（401）');
      }
    } catch (e) {
      setStatus('failed');
      setError(`无法连接: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            欢迎使用荔枝日记
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            请配置远程 API 连接以开始使用
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API 地址
            </label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-server.com"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Token
            </label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="输入 API Token"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          {status === 'failed' && error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {status === 'success' && (
            <div className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 text-sm">
              连接成功！
            </div>
          )}

          <button
            onClick={handleTest}
            disabled={testing}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
              testing
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {testing ? '测试中...' : status === 'success' ? '✓ 连接成功' : '测试连接'}
          </button>

          {status === 'success' && (
            <button
              onClick={onConfigured}
              className="w-full py-3 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              开始使用
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
