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

  // 初始化：确保 API 配置有效
  useEffect(() => {
    const state = useDiaryStore.getState();
    const { apiToken, apiUrl, remoteMode } = state;

    // 检查 apiUrl 是否有效（非空且不是错误值）
    const isValidUrl = apiUrl && apiUrl.length > 0 && !apiUrl.includes('//');

    if (!apiToken || !isValidUrl) {
      const isProduction = !window.location.hostname.match(/localhost|127\.0\.0\.1/);
      const defaultUrl = isProduction ? PRODUCTION_API_URL : DEV_API_URL;
      const newUrl = isValidUrl ? apiUrl : defaultUrl;
      setApiConfig(newUrl, DEFAULT_API_TOKEN);

      // 生产环境自动启用远程模式
      if (isProduction && !remoteMode) {
        setRemoteMode(true);
        resetDataService();
      }
    }

    // 如果已启用远程模式但没有有效的 API 配置，禁用远程模式
    if (remoteMode && !isValidUrl) {
      setRemoteMode(false);
      resetDataService();
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map(item => (
            <button
              key={item.view}
              className={`px-4 py-2 ${
                currentView === item.view
                  ? 'text-indigo-600 font-medium'
                  : 'text-gray-400 hover:text-gray-600'
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
    <div className="min-h-screen bg-gray-50 pb-[50px]">

      <PullToRefresh onRefresh={async () => {
        await diaryViewRef.current?.reload();
      }}>
        <div className="min-h-screen">
          {/* Header */}
          <header className="bg-white shadow-sm px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-800">
                📅 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </h1>
              {remoteMode ? (
                <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700">
                  ✓ 远程模式
                </span>
              ) : (
                <button
                  onClick={vaultConnected ? handleDisconnect : handleConnect}
                  disabled={connecting}
                  className={`px-3 py-1 rounded-full text-sm ${
                    vaultConnected
                      ? 'bg-green-100 text-green-700'
                      : connecting
                        ? 'bg-gray-100 text-gray-400'
                        : wasConnected
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  {connecting ? '连接中...' : vaultConnected ? '✓ 已连接' : wasConnected ? '重新连接' : '连接Vault'}
                </button>
              )}
            </div>
          </header>

          {/* 重新连接提示 */}
          {!remoteMode && wasConnected && !vaultConnected && (
            <div className="px-4 py-2 bg-orange-50 border-b">
              <div className="text-sm text-orange-700 text-center">
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
                className="flex-1 py-3 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-medium hover:bg-yellow-100"
                onClick={() => setShowReflection(true)}
              >
                💡 觉察
              </button>
              <button
                className="flex-1 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100"
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