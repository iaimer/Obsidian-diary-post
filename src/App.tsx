import { useState, useEffect, useRef } from 'react';
import { useDiaryStore } from './stores/diaryStore';
import { getFileSyncService } from './services/fileSync';
import { resetDataService } from './services/dataService';
import QuickInput from './components/QuickInput';
import { ReflectionModal } from './components/ReflectionModal';
import { HappinessModal } from './components/HappinessModal';
import HabitTracker from './components/HabitTracker';
import DiaryView, { DiaryViewRef } from './components/DiaryView';
import { SettingsPage } from './components/SettingsPage';
import StatsPage from './components/StatsPage';
import { HistoryPage } from './components/HistoryPage';
import { PullToRefresh } from './components/PullToRefresh';

type PageView = 'home' | 'history' | 'stats' | 'settings';

// API 默认配置
const DEFAULT_API_TOKEN = 'diary-app-secret-token-2026';
const PRODUCTION_API_URL = 'https://obsidian.femkits.org';
const DEV_API_URL = 'http://localhost:4001';

function App() {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const wasConnected = useDiaryStore(state => state.wasConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const setVaultConnected = useDiaryStore(state => state.setVaultConnected);
  const setRemoteMode = useDiaryStore(state => state.setRemoteMode);
  const setApiConfig = useDiaryStore(state => state.setApiConfig);

  const [showReflection, setShowReflection] = useState(false);
  const [showHappiness, setShowHappiness] = useState(false);
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [connecting, setConnecting] = useState(false);
  const diaryViewRef = useRef<DiaryViewRef>(null);

  // 初始化：远程环境自动启用远程模式 + 深色模式恢复
  useEffect(() => {
    const isProduction = !window.location.hostname.match(/localhost|127\.0\.0\.1/);
    const state = useDiaryStore.getState();
    const { apiToken, apiUrl, darkMode } = state;

    // 恢复深色模式
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }

    // 远程环境：强制启用远程模式并配置 API
    if (isProduction) {
      const cleanUrl = apiUrl?.replace(/\/api\/v1\/?$/, '') || PRODUCTION_API_URL;
      setApiConfig(cleanUrl, apiToken || DEFAULT_API_TOKEN);

      if (!state.remoteMode) {
        setRemoteMode(true);
        resetDataService();
      }
    } else {
      // 本地环境：确保有默认配置
      if (!apiToken || !apiUrl) {
        setApiConfig(DEV_API_URL, DEFAULT_API_TOKEN);
      }
    }
  }, []);

  const renderBottomNav = () => {
    const navItems: { label: string; view: PageView }[] = [
      { label: '今天', view: 'home' },
      { label: '历史', view: 'history' },
      { label: '统计', view: 'stats' },
      { label: '设置', view: 'settings' }
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 py-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map(item => (
            <button
              key={item.view}
              className={`px-4 py-2 ${
                currentView === item.view
                  ? 'text-indigo-600 font-medium'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              onClick={() => setCurrentView(item.view)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    );
  };

  useEffect(() => {
    if (wasConnected && !vaultConnected) {
      // 可以自动尝试重新连接，但File System API需要用户交互
    }
  }, [wasConnected, vaultConnected]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const fileSync = getFileSyncService();
      const success = await fileSync.connectVault();
      if (success) {
        setVaultConnected(true);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setVaultConnected(false);
  };

  // 设置页面
  if (currentView === 'settings') {
    return (
      <>
        <SettingsPage />
        {renderBottomNav()}
      </>
    );
  }

  // 统计页面
  if (currentView === 'stats') {
    return (
      <>
        <StatsPage />
        {renderBottomNav()}
      </>
    );
  }

  // 历史页面
  if (currentView === 'history') {
    return (
      <>
        <HistoryPage />
        {renderBottomNav()}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-[50px]">

      <PullToRefresh onRefresh={async () => {
        await diaryViewRef.current?.reload();
      }}>
        <div className="min-h-screen">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                📅 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </h1>
              {remoteMode ? (
                <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  ✓ 远程模式
                </span>
              ) : (
                <button
                  onClick={vaultConnected ? handleDisconnect : handleConnect}
                  disabled={connecting}
                  className={`px-3 py-1 rounded-full text-sm ${
                    vaultConnected
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : connecting
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                        : wasConnected
                          ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300'
                          : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'
                  }`}
                >
                  {connecting ? '连接中...' : vaultConnected ? '✓ 已连接' : wasConnected ? '重新连接' : '连接Vault'}
                </button>
              )}
            </div>
          </header>

          {/* 重新连接提示 */}
          {!remoteMode && wasConnected && !vaultConnected && (
            <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/30 border-b dark:border-gray-700">
              <div className="text-sm text-orange-700 dark:text-orange-300 text-center">
                页面刷新后需要重新授权Vault访问
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="px-4 py-6 max-w-md mx-auto">
            {/* Quick Input */}
            <QuickInput />

            {/* Quick Actions */}
            <section className="flex gap-3 mb-4">
              <button
                className="flex-1 py-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-xl text-sm font-medium hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
                onClick={() => setShowReflection(true)}
              >
                💡 觉察
              </button>
              <button
                className="flex-1 py-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/50"
                onClick={() => setShowHappiness(true)}
              >
                ✨ 小确幸
              </button>
            </section>

            {/* Habits */}
            <HabitTracker />

            {/* Diary View */}
            <DiaryView ref={diaryViewRef} />
          </main>
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      {renderBottomNav()}

      {/* Modals */}
      {showReflection && <ReflectionModal onClose={() => setShowReflection(false)} />}
      {showHappiness && <HappinessModal onClose={() => setShowHappiness(false)} />}
    </div>
  );
}

export default App